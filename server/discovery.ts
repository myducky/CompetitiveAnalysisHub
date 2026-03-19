import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { collectSourceDocument } from "./intelligence";
import { buildDiscoverySystemPrompt, buildDiscoveryUserPrompt } from "./prompts";
import { rankSearchResultsWithLLM, searchWeb, type SearchResultItem } from "./research";

type DiscoveryPlan = {
  summary: string;
  queries: Array<{
    label: string;
    query: string;
    targetType: string;
  }>;
  targets: Array<{
    title: string;
    url?: string;
    query?: string;
    targetType: string;
    rationale: string;
    confidenceScore: string;
    metadata?: Record<string, unknown>;
  }>;
};

export async function runWebDiscovery(competitorId: number) {
  const competitor = await db.getCompetitorById(competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  await db.createDiscoveryRun({
    competitorId,
    mode: "web_search",
    status: "pending",
  });

  const runs = await db.getDiscoveryRunsByCompetitorId(competitorId);
  const run = runs[0];
  if (!run) {
    throw new Error("Failed to create discovery run");
  }

  try {
    const plan = await buildDiscoveryPlan(competitor);
    const searchTargets = await executeDiscoverySearches(plan.queries);
    const mergedTargets = mergeDiscoveryTargets(plan.targets, searchTargets);

    await db.updateDiscoveryRun(run.id, {
      status: "completed",
      queryPlan: plan.queries,
      summary: plan.summary,
    });

    for (const target of mergedTargets) {
      await db.createDiscoveryTarget({
        competitorId,
        runId: run.id,
        targetType: target.targetType,
        title: target.title,
        url: target.url || null,
        query: target.query || null,
        rationale: target.rationale,
        confidenceScore: target.confidenceScore,
        trustTier: inferTrustTier(target.url, target.targetType),
        status: "new",
        metadata: target.metadata || null,
      });
    }

    return {
      runId: run.id,
      summary: plan.summary,
      queryCount: plan.queries.length,
      targetCount: mergedTargets.length,
    };
  } catch (error) {
    await db.updateDiscoveryRun(run.id, {
      status: "failed",
      summary: error instanceof Error ? error.message : "Discovery failed",
    });
    throw error;
  }
}

export async function promoteDiscoveryTarget(targetId: number) {
  const target = await db.getDiscoveryTargetById(targetId);
  if (!target) {
    throw new Error("Discovery target not found");
  }

  if (!target.url) {
    throw new Error("Only URL-based discovery targets can be promoted to intelligence sources");
  }

  const existing = await db.getIntelligenceSourceByUrl(target.competitorId, target.url, target.targetType);
  if (!existing) {
    await db.createIntelligenceSource({
      competitorId: target.competitorId,
      sourceType: target.targetType,
      label: target.title,
      url: target.url,
      status: "active",
      trustTier: target.trustTier,
      collectionMode: "manual",
      metadata: target.metadata || null,
    });
  }

  await db.updateDiscoveryTarget(target.id, { status: "promoted" });
  return { success: true };
}

export async function promoteAllDiscoveryTargets(competitorId: number) {
  const targets = await db.getDiscoveryTargetsByCompetitorId(competitorId);
  let promotedCount = 0;

  for (const target of targets) {
    if (!target.url || target.status === "promoted") {
      continue;
    }
    await promoteDiscoveryTarget(target.id);
    promotedCount += 1;
  }

  return { success: true, promotedCount };
}

export async function collectPromotedDiscoverySources(competitorId: number) {
  const sources = await db.getIntelligenceSourcesByCompetitorId(competitorId);
  const collected = [];

  for (const source of sources) {
    if (!["website", "news", "jobs", "registry", "social", "blog"].includes(source.sourceType)) {
      continue;
    }

    try {
      const document = await collectSourceDocument(source.id);
      collected.push({
        sourceId: source.id,
        sourceType: source.sourceType,
        documentId: document.id,
      });
    } catch (error) {
      collected.push({
        sourceId: source.id,
        sourceType: source.sourceType,
        error: error instanceof Error ? error.message : "Unknown collection error",
      });
    }
  }

  return {
    success: true,
    collectedCount: collected.filter((item) => "documentId" in item).length,
    collected,
  };
}

export async function executeQueryDiscoveryTargets(competitorId: number) {
  const targets = await db.getDiscoveryTargetsByCompetitorId(competitorId);
  const queryTargets = targets.filter((target) => Boolean(target.query));
  const materialized = [];

  for (const target of queryTargets) {
    const results = await searchWeb(target.query!);

    for (const result of results) {
      const existingTarget = await db.getDiscoveryTargetByUrl(competitorId, result.url, target.targetType);
      if (!existingTarget) {
        await db.createDiscoveryTarget({
          competitorId,
          runId: target.runId,
          targetType: target.targetType,
          title: result.title,
          url: result.url,
          query: target.query,
          rationale: result.snippet || target.rationale,
          confidenceScore: "0.67",
          trustTier: inferTrustTier(result.url, target.targetType),
          status: "new",
          metadata: {
            materializedFromTargetId: target.id,
            provider: ENV.searchProviderUrl || "none",
          },
        });
      }

      const source = await ensureSourceForDiscoveryResult(competitorId, {
        title: result.title,
        url: result.url,
        targetType: target.targetType,
        query: target.query!,
        snippet: result.snippet,
      });

      try {
        const document = await collectSourceDocument(source.id);
        materialized.push({
          targetId: target.id,
          sourceId: source.id,
          documentId: document.id,
          url: result.url,
        });
      } catch (error) {
        materialized.push({
          targetId: target.id,
          sourceId: source.id,
          url: result.url,
          error: error instanceof Error ? error.message : "Unknown collection error",
        });
      }
    }

    await db.updateDiscoveryTarget(target.id, { status: "promoted" });
  }

  return {
    success: true,
    executedTargets: queryTargets.length,
    materializedCount: materialized.filter((item) => "documentId" in item).length,
    materialized,
  };
}

async function buildDiscoveryPlan(competitor: Awaited<ReturnType<typeof db.getCompetitorById>>) {
  if (!competitor) {
    throw new Error("Competitor not found");
  }

  const fallback = buildHeuristicPlan(competitor);
  if (!process.env.BUILT_IN_FORGE_API_KEY) {
    return fallback;
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: [{
            type: "text",
            text: buildDiscoverySystemPrompt(),
          }],
        },
        {
          role: "user",
          content: [{
            type: "text",
            text: buildDiscoveryUserPrompt({
              name: competitor.name,
              website: competitor.website,
              industry: competitor.industry,
              description: competitor.description,
              legalRepresentative: competitor.legalRepresentative,
              headquartersLocation: competitor.headquartersLocation,
            }),
          }],
        },
      ],
      responseFormat: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content;
    const text = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((item) => ("text" in item ? item.text : "")).join("\n")
        : "{}";
    return JSON.parse(text) as DiscoveryPlan;
  } catch {
    return fallback;
  }
}

export function buildHeuristicPlan(competitor: NonNullable<Awaited<ReturnType<typeof db.getCompetitorById>>>) {
  const aliases = [competitor.name].filter(Boolean);
  const baseTerms = [
    competitor.name,
    competitor.website ? extractDomain(competitor.website) : "",
    competitor.industry || "",
  ].filter(Boolean).join(" ");

  const queries = [
    { label: "新闻搜索", query: `${competitor.name} 融资 产品 更新 新闻`, targetType: "news" },
    { label: "招聘搜索", query: `${competitor.name} 招聘 岗位 团队`, targetType: "jobs" },
    { label: "工商搜索", query: `${competitor.name} 工商 股东 变更`, targetType: "registry" },
    { label: "社媒搜索", query: `${competitor.name} site:x.com OR site:linkedin.com OR site:mp.weixin.qq.com`, targetType: "social" },
  ];

  const targets = [
    {
      title: `${competitor.name} 新闻检索`,
      query: queries[0].query,
      targetType: "news",
      rationale: "用于全网发现媒体报道、产品更新和融资动态。",
      confidenceScore: "0.72",
      metadata: { aliases, baseTerms },
    },
    {
      title: `${competitor.name} 招聘检索`,
      query: queries[1].query,
      targetType: "jobs",
      rationale: "用于发现岗位扩张、团队方向和区域布局。",
      confidenceScore: "0.68",
      metadata: { aliases, baseTerms },
    },
    {
      title: `${competitor.name} 工商检索`,
      query: queries[2].query,
      targetType: "registry",
      rationale: "用于发现工商变更、股东结构、对外投资等公开信息。",
      confidenceScore: "0.75",
      metadata: { aliases, baseTerms },
    },
    competitor.website
      ? {
          title: `${competitor.name} 官网`,
          url: normalizeUrl(competitor.website),
          targetType: "website",
          rationale: "官网通常是最稳定的第一方信息源。",
          confidenceScore: "0.90",
          metadata: { aliases, baseTerms },
        }
      : null,
  ].filter(Boolean) as DiscoveryPlan["targets"];

  return {
    summary: `已为 ${competitor.name} 生成全网发现计划，重点覆盖新闻、招聘、工商和社媒四类公开线索。`,
    queries,
    targets,
  };
}

async function executeDiscoverySearches(queries: DiscoveryPlan["queries"]) {
  if (!ENV.searchProviderUrl) {
    return [];
  }

  const discoveredTargets: DiscoveryPlan["targets"] = [];

  for (const query of queries) {
    const results = await searchWeb(query.query);
    const judgedResults = await rankSearchResultsWithLLM({
      competitorName: query.query.split(" ")[0] || query.query,
      query: query.query,
      targetType: query.targetType,
      results,
    });
    for (const result of judgedResults) {
      discoveredTargets.push({
        title: result.title,
        url: result.url,
        query: query.query,
        targetType: query.targetType,
        rationale: result.snippet || `来自搜索查询：${query.label}`,
        confidenceScore: "0.66",
        metadata: {
          discoveredFromQuery: query.query,
          provider: ENV.searchProviderUrl,
        },
      });
    }
  }

  return discoveredTargets;
}

async function ensureSourceForDiscoveryResult(
  competitorId: number,
  input: {
    title: string;
    url: string;
    targetType: string;
    query: string;
    snippet?: string;
  }
) {
  const existing = await db.getIntelligenceSourceByUrl(competitorId, input.url, input.targetType);
  if (existing) {
    return existing;
  }

  await db.createIntelligenceSource({
    competitorId,
    sourceType: input.targetType,
    label: input.title,
    url: input.url,
    status: "active",
    trustTier: inferTrustTier(input.url, input.targetType),
    collectionMode: "manual",
    metadata: {
      discoveredFromQuery: input.query,
      snippet: input.snippet || "",
    },
  });

  const created = await db.getIntelligenceSourceByUrl(competitorId, input.url, input.targetType);
  if (!created) {
    throw new Error("Failed to create intelligence source from discovery result");
  }

  return created;
}

export function mergeDiscoveryTargets(
  baseTargets: DiscoveryPlan["targets"],
  discoveredTargets: DiscoveryPlan["targets"]
) {
  const seen = new Set<string>();
  const merged: DiscoveryPlan["targets"] = [];

  for (const target of [...baseTargets, ...discoveredTargets]) {
    const key = target.url || `${target.targetType}:${target.query || target.title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(target);
  }

  return merged;
}

function extractDomain(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return url;
  }
}

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

export function inferTrustTier(url: string | undefined, targetType: string) {
  const normalizedUrl = url || "";
  const hostname = normalizedUrl ? extractDomain(normalizedUrl) : "";

  if (targetType === "website") {
    return "high";
  }

  if (targetType === "registry") {
    return hostname.includes(".gov") || hostname.includes(".org.cn") ? "high" : "medium";
  }

  if (targetType === "news") {
    if (/(techcrunch|36kr|huxiu|iyiou|forbes|bloomberg|reuters)/i.test(hostname)) {
      return "high";
    }
    return "medium";
  }

  if (targetType === "jobs") {
    if (/(linkedin|zhipin|liepin|lagou)/i.test(hostname)) {
      return "medium";
    }
    return "low";
  }

  if (targetType === "social") {
    return "low";
  }

  return "medium";
}
