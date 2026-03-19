import type { Competitor, InsertCompetitor, ScrapingTask } from "../drizzle/schema";
import * as db from "./db";

const REQUEST_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 4000;

export type ScrapeExecutionResult = {
  taskId: number;
  status: "completed" | "failed";
  recordsProcessed: number;
  summary: string;
  warnings: string[];
};

type WebsiteSignals = {
  pageTitle: string;
  metaDescription: string;
  mainText: string;
  headings: string[];
  importantLinks: Array<{ label: string; url: string }>;
};

export async function ensureWebsiteScrapingTask(competitorId: number) {
  const competitor = await db.getCompetitorById(competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  if (!competitor.website) {
    throw new Error("Competitor website is required to enable active scraping");
  }

  const normalizedWebsite = normalizeWebsiteUrl(competitor.website);
  const existingTask = await db.getScrapingTaskBySource(competitorId, "website", normalizedWebsite);
  if (existingTask) {
    return existingTask;
  }

  await db.createScrapingTask({
    competitorId,
    taskType: "website",
    dataSource: normalizedWebsite,
    status: "pending",
    frequency: "manual",
  });

  const createdTask = await db.getScrapingTaskBySource(competitorId, "website", normalizedWebsite);
  if (!createdTask) {
    throw new Error("Failed to create scraping task");
  }

  return createdTask;
}

export async function runScrapingTask(taskId: number): Promise<ScrapeExecutionResult> {
  const task = await db.getScrapingTaskById(taskId);
  if (!task) {
    throw new Error("Scraping task not found");
  }

  if (!task.competitorId) {
    throw new Error("Scraping task is not linked to a competitor");
  }

  const competitor = await db.getCompetitorById(task.competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  await db.updateScrapingTask(taskId, {
    status: "running",
    lastRunAt: new Date(),
    errorMessage: null,
  });

  try {
    let result: ScrapeExecutionResult;

    switch (task.taskType) {
      case "website":
        result = await runWebsiteScrape(task, competitor);
        break;
      default:
        throw new Error(`Unsupported scraping task type: ${task.taskType}`);
    }

    await db.updateScrapingTask(taskId, {
      status: "completed",
      lastRunAt: new Date(),
      recordsProcessed: result.recordsProcessed,
      errorMessage: null,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraping error";
    await db.updateScrapingTask(taskId, {
      status: "failed",
      lastRunAt: new Date(),
      errorMessage: message,
    });
    throw error;
  }
}

async function runWebsiteScrape(task: ScrapingTask, competitor: Competitor): Promise<ScrapeExecutionResult> {
  const targetUrl = normalizeWebsiteUrl(task.dataSource || competitor.website || "");
  if (!targetUrl) {
    throw new Error("Website scraping task is missing a valid target URL");
  }

  const html = await fetchWebsiteHtml(targetUrl);
  const signals = parseWebsiteSignals(html, targetUrl);

  const contentSummary = buildWebsiteSummary(competitor.name, signals);
  const existingSnapshot = await db.findNewsArticleByTitleOrUrl(
    competitor.id,
    `${competitor.name} 官网主动采集快照`,
    targetUrl
  );

  let recordsProcessed = 0;
  const warnings: string[] = [];

  if (!existingSnapshot) {
    await db.createNewsArticle({
      competitorId: competitor.id,
      title: `${competitor.name} 官网主动采集快照`,
      content: contentSummary,
      source: "website_scraper",
      url: targetUrl,
      publishDate: new Date(),
      category: "website_snapshot",
      sentiment: "neutral",
    });
    recordsProcessed += 1;
  } else {
    warnings.push("官网快照已存在，本次未重复写入时间线。");
  }

  const inferredDepartments = inferDepartmentBreakdown(signals.mainText);
  if (Object.keys(inferredDepartments).length > 0) {
    await db.createOrganizationStructure({
      competitorId: competitor.id,
      snapshotDate: new Date(),
      totalHeadcount: null,
      departmentBreakdown: JSON.stringify(inferredDepartments),
      keyPositions: JSON.stringify(inferKeyPositions(signals.mainText)),
      dataSource: "website_scraper",
    });
    recordsProcessed += 1;
  } else {
    warnings.push("官网正文未识别出稳定的组织分工线索，未生成组织架构快照。");
  }

  const competitorUpdate: Partial<InsertCompetitor> = {
    dataSourceLastUpdated: new Date(),
  };

  if (!competitor.description && signals.metaDescription) {
    competitorUpdate.description = signals.metaDescription;
  }

  if (!competitor.businessScope && signals.mainText) {
    competitorUpdate.businessScope = signals.mainText.slice(0, 280);
  }

  await db.updateCompetitor(competitor.id, competitorUpdate);

  return {
    taskId: task.id,
    status: "completed",
    recordsProcessed,
    summary: contentSummary,
    warnings,
  };
}

async function fetchWebsiteHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "CompetitiveAnalysisHubBot/1.0 (+https://localhost)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseWebsiteSignals(html: string, baseUrl: string): WebsiteSignals {
  const pageTitle = decodeHtml(stripTags(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)));
  const metaDescription = decodeHtml(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
      || matchFirst(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i)
  );

  const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
    .map((match) => decodeHtml(stripTags(match[1])))
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean)
    .slice(0, 8);

  const importantLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      url: resolveUrl(baseUrl, match[1]),
      label: normalizeWhitespace(decodeHtml(stripTags(match[2]))),
    }))
    .filter((link) => Boolean(link.label) && isImportantLinkLabel(link.label))
    .slice(0, 8);

  const mainText = normalizeWhitespace(
    decodeHtml(
      stripTags(
        html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
      )
    )
  ).slice(0, MAX_TEXT_LENGTH);

  return {
    pageTitle,
    metaDescription,
    mainText,
    headings,
    importantLinks,
  };
}

function buildWebsiteSummary(companyName: string, signals: WebsiteSignals) {
  const lines = [
    `主动采集来源：官网首页`,
    signals.pageTitle ? `页面标题：${signals.pageTitle}` : "",
    signals.metaDescription ? `页面简介：${signals.metaDescription}` : "",
    signals.headings.length > 0 ? `关键栏目：${signals.headings.join(" / ")}` : "",
    signals.importantLinks.length > 0
      ? `重点链接：${signals.importantLinks.map((link) => `${link.label}(${link.url})`).join("；")}`
      : "",
    signals.mainText ? `正文摘要：${signals.mainText.slice(0, 500)}` : "",
  ].filter(Boolean);

  return `${companyName} 官网主动采集完成。\n\n${lines.join("\n")}`;
}

function inferDepartmentBreakdown(text: string) {
  const keywordMap: Record<string, string[]> = {
    product: ["产品", "product"],
    engineering: ["研发", "工程", "engineering", "技术"],
    sales: ["销售", "商务", "sale", "bd"],
    operations: ["运营", "operation"],
    marketing: ["市场", "marketing", "增长"],
    customer_success: ["客户成功", "客服", "support"],
  };

  const lowered = text.toLowerCase();
  const detected: Record<string, number> = {};

  for (const [department, keywords] of Object.entries(keywordMap)) {
    const hits = keywords.reduce((count, keyword) => count + (lowered.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    if (hits > 0) {
      detected[department] = hits;
    }
  }

  return detected;
}

function inferKeyPositions(text: string) {
  const positions = ["CEO", "CTO", "COO", "CPO", "创始人", "联合创始人", "负责人"];
  return positions.filter((position) => text.toLowerCase().includes(position.toLowerCase()));
}

function isImportantLinkLabel(label: string) {
  return /新闻|动态|博客|产品|招聘|关于|团队|news|blog|product|careers|about|team/i.test(label);
}

function normalizeWebsiteUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function resolveUrl(baseUrl: string, maybeRelativeUrl: string) {
  try {
    return new URL(maybeRelativeUrl, baseUrl).toString();
  } catch {
    return maybeRelativeUrl;
  }
}

function matchFirst(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1] ? normalizeWhitespace(match[1]) : "";
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
