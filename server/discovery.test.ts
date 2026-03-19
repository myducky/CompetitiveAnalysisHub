import { describe, expect, it } from "vitest";
import { buildHeuristicPlan, inferTrustTier, mergeDiscoveryTargets } from "./discovery";

describe("discovery planning", () => {
  it("builds web discovery queries and targets for a competitor", () => {
    const plan = buildHeuristicPlan({
      id: 1,
      name: "MarketPulse",
      website: "marketpulse.example.com",
      industry: "市场情报",
      foundingDate: null,
      registeredCapital: null,
      legalRepresentative: null,
      businessScope: null,
      registrationNumber: null,
      headquartersLocation: "上海",
      companySize: null,
      financingStage: null,
      logo: null,
      description: "竞品情报平台",
      dataSourceLastUpdated: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(plan.queries.map((item) => item.targetType)).toEqual([
      "news",
      "jobs",
      "registry",
      "social",
    ]);
    expect(plan.targets.some((item) => item.targetType === "website")).toBe(true);
    expect(plan.summary).toContain("MarketPulse");
  });

  it("deduplicates discovery targets by url or logical identity", () => {
    const merged = mergeDiscoveryTargets(
      [
        { title: "官网", url: "https://example.com", targetType: "website", rationale: "a", confidenceScore: "0.9" },
        { title: "新闻搜索", query: "Example 新闻", targetType: "news", rationale: "b", confidenceScore: "0.7" },
      ],
      [
        { title: "官网重复", url: "https://example.com", targetType: "website", rationale: "c", confidenceScore: "0.8" },
        { title: "新闻搜索重复", query: "Example 新闻", targetType: "news", rationale: "d", confidenceScore: "0.6" },
        { title: "招聘搜索", query: "Example 招聘", targetType: "jobs", rationale: "e", confidenceScore: "0.6" },
      ]
    );

    expect(merged).toHaveLength(3);
    expect(merged[0].title).toBe("官网");
    expect(merged[1].title).toBe("新闻搜索");
    expect(merged[2].title).toBe("招聘搜索");
  });

  it("assigns trust tiers by target type and hostname", () => {
    expect(inferTrustTier("https://example.com", "website")).toBe("high");
    expect(inferTrustTier("https://www.qcc.com/company", "registry")).toBe("medium");
    expect(inferTrustTier("https://www.reuters.com/article", "news")).toBe("high");
    expect(inferTrustTier("https://x.com/company/status/1", "social")).toBe("low");
  });
});
