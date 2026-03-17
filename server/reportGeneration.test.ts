import { describe, expect, it, vi } from "vitest";
import { generateCompetitorAnalysisReport, formatReportForDisplay } from "./reportGeneration";
import type { Competitor, FinancingEvent, ProductRelease, PersonnelChange, NewsArticle, OrganizationStructure } from "../drizzle/schema";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: `# Analysis Report

## Executive Summary
This is a test executive summary about the company's market position and strategic direction.

## Business Model
The company operates a B2B cross-border e-commerce platform connecting sellers and buyers.

## Competitive Advantages
1. Advanced logistics network
2. Strong technology platform
3. Experienced management team

## Risk Factors
1. Regulatory changes in key markets
2. Increasing competition
3. Currency fluctuations

## Market Position
The company holds a significant market share in the cross-border e-commerce space.

## Investment Perspective
Strong growth potential with solid fundamentals and experienced team.

## Strategic Recommendations
Focus on market expansion and product innovation.

## Team Capabilities
Experienced leadership with proven track record in e-commerce.

## Product Strategy
Continuous innovation with focus on user experience and platform stability.

## Financial Health
Strong financial position with positive cash flow.`,
        },
      },
    ],
  }),
}));

describe("Report Generation", () => {
  const mockCompetitor: Competitor = {
    id: 1,
    name: "Test Company",
    website: "https://test.com",
    industry: "Cross-border E-commerce",
    foundingDate: new Date("2020-01-01"),
    registeredCapital: "1000万元",
    legalRepresentative: "张三",
    businessScope: "跨境电商平台",
    registrationNumber: "123456789",
    headquartersLocation: "深圳",
    companySize: "50-100",
    financingStage: "Series A",
    logo: null,
    description: "Professional cross-border e-commerce platform",
    dataSourceLastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFinancingEvents: FinancingEvent[] = [
    {
      id: 1,
      competitorId: 1,
      round: "Series A",
      amount: "$5M",
      amountUSD: 5000000,
      currency: "USD",
      investors: "Sequoia Capital, Tiger Global",
      announcementDate: new Date("2023-01-15"),
      source: "TechCrunch",
      description: "Series A funding round",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProductReleases: ProductRelease[] = [
    {
      id: 1,
      competitorId: 1,
      productName: "Platform v2.0",
      releaseDate: new Date("2023-06-01"),
      version: "2.0",
      description: "Major platform upgrade with new features",
      features: "New dashboard, improved search, mobile app",
      category: "Platform",
      source: "Company website",
      url: "https://test.com/releases/v2",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPersonnelChanges: PersonnelChange[] = [
    {
      id: 1,
      competitorId: 1,
      name: "李四",
      position: "VP of Engineering",
      changeType: "hire",
      changeDate: new Date("2023-03-01"),
      previousPosition: null,
      department: "Engineering",
      source: "LinkedIn",
      description: "Hired as VP of Engineering",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockNewsArticles: NewsArticle[] = [
    {
      id: 1,
      competitorId: 1,
      title: "Test Company Raises $5M Series A",
      content: "Test Company has announced a $5M Series A funding round...",
      source: "TechCrunch",
      url: "https://techcrunch.com/article",
      publishDate: new Date("2023-01-15"),
      category: "funding",
      sentiment: "positive",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOrganizationStructure: OrganizationStructure[] = [
    {
      id: 1,
      competitorId: 1,
      snapshotDate: new Date("2023-12-01"),
      totalHeadcount: 75,
      departmentBreakdown: '{"Engineering": 30, "Sales": 20, "Operations": 15, "Admin": 10}',
      keyPositions: '[{"position": "CEO", "name": "张三"}, {"position": "CTO", "name": "李四"}]',
      dataSource: "business_registry",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe("generateCompetitorAnalysisReport", () => {
    it("should generate a comprehensive analysis report", async () => {
      const report = await generateCompetitorAnalysisReport(
        mockCompetitor,
        mockFinancingEvents,
        mockProductReleases,
        mockPersonnelChanges,
        mockNewsArticles,
        mockOrganizationStructure
      );

      expect(report).toBeDefined();
      expect(report.executiveSummary).toBeTruthy();
      expect(report.businessModel).toBeTruthy();
      expect(report.competitiveAdvantages).toBeTruthy();
      expect(report.riskFactors).toBeTruthy();
      expect(report.marketPosition).toBeTruthy();
      expect(report.investmentPerspective).toBeTruthy();
      expect(report.strategicRecommendations).toBeTruthy();
      expect(report.teamCapabilities).toBeTruthy();
      expect(report.productStrategy).toBeTruthy();
      expect(report.financialHealth).toBeTruthy();
    });

    it("should handle empty data gracefully", async () => {
      const report = await generateCompetitorAnalysisReport(
        mockCompetitor,
        [],
        [],
        [],
        [],
        []
      );

      expect(report).toBeDefined();
      expect(report.executiveSummary).toBeTruthy();
    });
  });

  describe("formatReportForDisplay", () => {
    it("should format report as markdown", async () => {
      const report = await generateCompetitorAnalysisReport(
        mockCompetitor,
        mockFinancingEvents,
        mockProductReleases,
        mockPersonnelChanges,
        mockNewsArticles,
        mockOrganizationStructure
      );

      const formatted = formatReportForDisplay(report);

      expect(formatted).toContain("# 竞品穿透式深度分析报告");
      expect(formatted).toContain("## 执行摘要");
      expect(formatted).toContain("## 商业模式");
      expect(formatted).toContain("## 竞争优势");
      expect(formatted).toContain("## 风险因素");
      expect(formatted).toContain("## 市场地位");
      expect(formatted).toContain("## 投资视角");
      expect(formatted).toContain("## 战略建议");
      expect(formatted).toContain("## 团队能力");
      expect(formatted).toContain("## 产品战略");
      expect(formatted).toContain("## 财务健康状况");
    });
  });
});
