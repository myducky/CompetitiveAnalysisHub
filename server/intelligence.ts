import { createHash } from "node:crypto";
import type { InsertCompetitor } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { buildExtractionSystemPrompt, buildExtractionUserPrompt } from "./prompts";
import { parseWebsiteSignals } from "./scraping";

const MAX_DOCUMENT_SUMMARY = 3000;
const MAX_DISCOVERED_LINKS = 6;

export async function ensureDefaultSourcesForCompetitor(competitorId: number) {
  let competitor = await db.getCompetitorById(competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  if (!competitor.website) {
    const discoveredWebsite = await discoverOfficialWebsite(competitor.name);
    if (discoveredWebsite) {
      await db.updateCompetitor(competitorId, {
        website: discoveredWebsite,
        dataSourceLastUpdated: new Date(),
      });
      competitor = await db.getCompetitorById(competitorId);
      if (!competitor) {
        throw new Error("Competitor not found");
      }
    }
  }

  const sources = await db.getIntelligenceSourcesByCompetitorId(competitorId);
  if (sources.length > 0) {
    return sources;
  }

  const candidates = [
    competitor.website
      ? {
          sourceType: "website",
          label: `${competitor.name} 官网`,
          url: normalizeUrl(competitor.website),
          collectionMode: "manual",
          metadata: {
            discoveryDepth: 1,
            extractionProfile: "company_homepage",
          },
        }
      : null,
    competitor.website
      ? {
          sourceType: "blog",
          label: `${competitor.name} 官网新闻/博客`,
          url: normalizeUrl(competitor.website),
          collectionMode: "manual",
          metadata: {
            discoveryDepth: 2,
            extractionProfile: "news_discovery",
          },
        }
      : null,
  ].filter(Boolean) as Array<{
    sourceType: string;
    label: string;
    url: string;
    collectionMode: string;
    metadata: Record<string, unknown>;
  }>;

  for (const candidate of candidates) {
    const existing = await db.getIntelligenceSourceByUrl(competitorId, candidate.url, candidate.sourceType);
    if (!existing) {
      await db.createIntelligenceSource({
        competitorId,
        sourceType: candidate.sourceType,
        label: candidate.label,
        url: candidate.url,
        status: "active",
        collectionMode: candidate.collectionMode,
        metadata: candidate.metadata,
      });
    }
  }

  return db.getIntelligenceSourcesByCompetitorId(competitorId);
}

async function discoverOfficialWebsite(competitorName: string) {
  if (!ENV.searchProviderUrl) {
    return null;
  }

  let response: Response;

  if (/serpapi\.com\/search/i.test(ENV.searchProviderUrl)) {
    const url = new URL(ENV.searchProviderUrl);
    url.searchParams.set("q", `${competitorName} 官网`);
    url.searchParams.set("api_key", ENV.searchProviderApiKey);
    url.searchParams.set("output", "json");
    url.searchParams.set("hl", "zh-cn");
    url.searchParams.set("gl", "cn");
    url.searchParams.set("num", "5");

    response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
  } else {
    response = await fetch(ENV.searchProviderUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ENV.searchProviderApiKey ? { authorization: `Bearer ${ENV.searchProviderApiKey}` } : {}),
      },
      body: JSON.stringify({
        query: `${competitorName} 官网`,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`Search provider failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as {
    results?: Array<{ title: string; url: string; snippet?: string }>;
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  const results = payload.results || (payload.organic_results || [])
    .filter((item) => Boolean(item.title) && Boolean(item.link))
    .map((item) => ({
      title: item.title!,
      url: item.link!,
      snippet: item.snippet,
    }));

  return pickOfficialWebsiteCandidate(competitorName, results);
}

export async function collectSourceDocument(sourceId: number) {
  const source = await db.getIntelligenceSourceById(sourceId);
  if (!source) {
    throw new Error("Intelligence source not found");
  }

  const competitor = await db.getCompetitorById(source.competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  const html = await fetchHtml(source.url);
  const signals = parseWebsiteSignals(html, source.url);
  const createdDocument = await upsertSourceDocument({
    competitorId: source.competitorId,
    sourceId: source.id,
    documentType: "webpage",
    url: source.url,
    fallbackTitle: source.label,
    html,
    signals,
  });

  await db.updateIntelligenceSource(source.id, { lastCollectedAt: new Date() });
  await extractDocumentIntelligence(createdDocument.id);

  if (source.sourceType === "blog") {
    const discoveryTargets = selectDiscoveryTargets(source.url, signals.importantLinks);

    for (const target of discoveryTargets) {
      try {
        const targetHtml = await fetchHtml(target.url);
        const targetSignals = parseWebsiteSignals(targetHtml, target.url);
        const discoveredDocument = await upsertSourceDocument({
          competitorId: source.competitorId,
          sourceId: source.id,
          documentType: inferDocumentType(target.label, target.url),
          url: target.url,
          fallbackTitle: target.label,
          html: targetHtml,
          signals: targetSignals,
        });
        await extractDocumentIntelligence(discoveredDocument.id);
      } catch (error) {
        console.warn(`[Intelligence] Failed to collect discovered page ${target.url}:`, error);
      }
    }
  }

  return createdDocument;
}

export async function extractDocumentIntelligence(documentId: number) {
  const document = await db.getSourceDocumentById(documentId);
  if (!document) {
    throw new Error("Source document not found");
  }

  if (document.extractionStatus === "processed") {
    return {
      companyProfile: document.summary || "",
      events: [],
      skipped: true,
    };
  }

  const competitor = await db.getCompetitorById(document.competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  const extracted = await extractSignalsWithFallback({
    competitorName: competitor.name,
    title: document.title || "",
    content: document.contentText || "",
    summary: document.summary || "",
    url: document.canonicalUrl,
  });

  for (const event of extracted.events) {
    await db.createIntelligenceEvent({
      competitorId: competitor.id,
      sourceDocumentId: document.id,
      eventType: event.eventType,
      title: event.title,
      eventDate: event.eventDate ? new Date(event.eventDate) : null,
      confidenceScore: event.confidenceScore,
      payload: event.payload,
      evidenceSnippet: event.evidenceSnippet,
    });
  }

  const competitorUpdate: Partial<InsertCompetitor> = {
    dataSourceLastUpdated: new Date(),
  };
  if (!competitor.description && extracted.companyProfile) {
    competitorUpdate.description = extracted.companyProfile;
  }
  await db.updateCompetitor(competitor.id, competitorUpdate);

  await db.updateSourceDocument(document.id, {
    extractionStatus: "processed",
    extractedAt: new Date(),
  });

  return extracted;
}

export async function collectCompetitorIntelligence(competitorId: number) {
  const sources = await ensureDefaultSourcesForCompetitor(competitorId);
  const collected = [];
  const failed = [];

  for (const source of sources.filter((item) => item.status === "active")) {
    try {
      const beforeCount = (await db.getSourceDocumentsByCompetitorId(competitorId)).length;
      const document = await collectSourceDocument(source.id);
      const afterDocuments = await db.getSourceDocumentsByCompetitorId(competitorId);
      collected.push({
        sourceId: source.id,
        sourceLabel: source.label,
        documentId: document.id,
        addedDocuments: Math.max(afterDocuments.length - beforeCount, 0),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown collection error";
      console.warn(`[Intelligence] Failed to collect source ${source.url}: ${message}`);
      failed.push({
        sourceId: source.id,
        sourceLabel: source.label,
        url: source.url,
        error: message,
      });
    }
  }

  return {
    sourceCount: sources.length,
    documentCount: (await db.getSourceDocumentsByCompetitorId(competitorId)).length,
    collected,
    failed,
  };
}

async function upsertSourceDocument(input: {
  competitorId: number;
  sourceId: number;
  documentType: string;
  url: string;
  fallbackTitle: string;
  html: string;
  signals: ReturnType<typeof parseWebsiteSignals>;
}) {
  const existingByUrl = await db.getSourceDocumentByUrl(input.competitorId, input.url);
  if (existingByUrl) {
    return existingByUrl;
  }

  const fingerprint = createFingerprint(input.url, input.signals.pageTitle, input.signals.mainText.slice(0, 1200));
  const existingByFingerprint = await db.getSourceDocumentByFingerprint(input.competitorId, fingerprint);
  if (existingByFingerprint) {
    return existingByFingerprint;
  }

  const summary = [
    input.signals.pageTitle ? `标题：${input.signals.pageTitle}` : "",
    input.signals.metaDescription ? `简介：${input.signals.metaDescription}` : "",
    input.signals.headings.length > 0 ? `栏目：${input.signals.headings.join(" / ")}` : "",
    input.signals.mainText ? `正文：${input.signals.mainText.slice(0, 1200)}` : "",
  ].filter(Boolean).join("\n");

  await db.createSourceDocument({
    competitorId: input.competitorId,
    sourceId: input.sourceId,
    documentType: input.documentType,
    title: input.signals.pageTitle || input.fallbackTitle,
    canonicalUrl: input.url,
    contentText: input.signals.mainText,
    summary: summary.slice(0, MAX_DOCUMENT_SUMMARY),
    rawPayload: input.html.slice(0, 12000),
    fingerprint,
    extractionStatus: "pending",
  });

  const createdDocument = await db.getSourceDocumentByUrl(input.competitorId, input.url);
  if (!createdDocument) {
    throw new Error("Failed to create source document");
  }

  return createdDocument;
}

async function extractSignalsWithFallback(input: {
  competitorName: string;
  title: string;
  content: string;
  summary: string;
  url: string;
}) {
  if (!process.env.BUILT_IN_FORGE_API_KEY) {
    return heuristicExtraction(input);
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: [{
            type: "text",
            text: buildExtractionSystemPrompt(),
          }],
        },
        {
          role: "user",
          content: [{
            type: "text",
            text: buildExtractionUserPrompt(input),
          }],
        },
      ],
      responseFormat: {
        type: "json_object",
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const text = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((item) => ("text" in item ? item.text : "")).join("\n")
        : "{}";
    return JSON.parse(text);
  } catch {
    return heuristicExtraction(input);
  }
}

function heuristicExtraction(input: {
  competitorName: string;
  title: string;
  content: string;
  summary: string;
  url: string;
}) {
  const text = `${input.title}\n${input.summary}\n${input.content}`;
  const events: Array<{
    eventType: string;
    title: string;
    eventDate: string | null;
    confidenceScore: string;
    payload: Record<string, unknown>;
    evidenceSnippet: string;
  }> = [];

  events.push({
    eventType: "company_profile",
    title: `${input.competitorName} 公司画像更新`,
    eventDate: null,
    confidenceScore: "0.60",
    payload: {
      sourceUrl: input.url,
      extractedFrom: "heuristic",
    },
    evidenceSnippet: text.slice(0, 220),
  });

  if (/招聘|careers|join us|加入我们/i.test(text)) {
    events.push({
      eventType: "hiring_signal",
      title: `${input.competitorName} 存在招聘扩张信号`,
      eventDate: null,
      confidenceScore: "0.70",
      payload: {
        signal: "hiring",
        sourceUrl: input.url,
      },
      evidenceSnippet: text.slice(0, 220),
    });
  }

  if (/产品|product|平台|solution|解决方案/i.test(text)) {
    events.push({
      eventType: "product_update",
      title: `${input.competitorName} 产品与解决方案信号`,
      eventDate: null,
      confidenceScore: "0.58",
      payload: {
        signal: "product",
        sourceUrl: input.url,
      },
      evidenceSnippet: text.slice(0, 220),
    });
  }

  return {
    companyProfile: input.summary.slice(0, 240),
    events,
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(normalizeUrl(url), {
    headers: {
      "user-agent": "CompetitiveAnalysisHubBot/1.0 (+https://localhost)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

export function pickOfficialWebsiteCandidate(
  competitorName: string,
  results: Array<{ title: string; url: string; snippet?: string }>
) {
  const normalizedName = normalizeComparableText(competitorName);
  const blacklist = [
    "linkedin.com",
    "x.com",
    "twitter.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "crunchbase.com",
    "wikipedia.org",
    "baike.baidu.com",
    "36kr.com",
    "huxiu.com",
  ];

  const ranked = results
    .map((result) => {
      const url = normalizeUrl(result.url);
      const host = safeHostname(url).replace(/^www\./, "");
      const comparableHost = normalizeComparableText(host);
      const comparableTitle = normalizeComparableText(result.title || "");
      const comparableSnippet = normalizeComparableText(result.snippet || "");

      if (!host || blacklist.some((item) => host.includes(item))) {
        return null;
      }

      let score = 0;
      if (comparableTitle.includes(normalizedName)) score += 5;
      if (comparableSnippet.includes(normalizedName)) score += 2;
      if (comparableHost.includes(normalizedName)) score += 6;
      if (/官网|official|home/i.test(result.title || "")) score += 3;
      if (host.split(".").length <= 3) score += 1;

      return {
        url,
        score,
      };
    })
    .filter((item): item is { url: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score && ranked[0].score >= 5 ? ranked[0].url : null;
}

function createFingerprint(...parts: string[]) {
  return createHash("sha256").update(parts.join("||")).digest("hex");
}

export function selectDiscoveryTargets(
  rootUrl: string,
  links: Array<{ label: string; url: string }>
) {
  const rootHost = safeHostname(rootUrl);
  const seen = new Set<string>();

  return links
    .filter((link) => {
      const normalized = resolveAgainstRoot(rootUrl, link.url);
      if (normalized === normalizeUrl(rootUrl)) {
        return false;
      }
      if (seen.has(normalized)) {
        return false;
      }
      const linkHost = safeHostname(normalized);
      if (rootHost && linkHost && rootHost !== linkHost) {
        return false;
      }
      return isDiscoveryTarget(link.label, normalized);
    })
    .map((link) => ({
      label: link.label,
      url: resolveAgainstRoot(rootUrl, link.url),
    }))
    .filter((link) => {
      if (seen.has(link.url)) {
        return false;
      }
      seen.add(link.url);
      return true;
    })
    .slice(0, MAX_DISCOVERED_LINKS);
}

function isDiscoveryTarget(label: string, url: string) {
  return /新闻|动态|博客|招聘|关于|团队|产品|案例|更新|news|blog|careers|jobs|about|team|product|updates/i.test(
    `${label} ${url}`
  );
}

function inferDocumentType(label: string, url: string) {
  if (/招聘|careers|jobs/i.test(`${label} ${url}`)) {
    return "job_posting";
  }
  if (/news|blog|更新|动态|新闻/i.test(`${label} ${url}`)) {
    return "article";
  }
  return "webpage";
}

function safeHostname(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return "";
  }
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
}

function resolveAgainstRoot(rootUrl: string, maybeRelativeUrl: string) {
  try {
    return new URL(maybeRelativeUrl, normalizeUrl(rootUrl)).toString();
  } catch {
    return normalizeUrl(maybeRelativeUrl);
  }
}
