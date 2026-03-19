import { invokeLLM } from "./_core/llm";
import type { Competitor, FinancingEvent, ProductRelease, PersonnelChange, NewsArticle, OrganizationStructure } from "../drizzle/schema";
import { buildReportSystemPrompt, buildReportUserPrompt } from "./prompts";
import { runLlmGuidedResearch } from "./research";

/**
 * Comprehensive analysis report data structure
 */
export interface CompetitorAnalysisReport {
  executiveSummary: string;
  businessModel: string;
  competitiveAdvantages: string;
  riskFactors: string;
  marketPosition: string;
  investmentPerspective: string;
  strategicRecommendations: string;
  teamCapabilities: string;
  productStrategy: string;
  financialHealth: string;
}

/**
 * Generate a comprehensive analysis report for a competitor using LLM
 * Adopts the perspective of a top-tier industry analyst, primary market investor, and strategic consultant
 */
export async function generateCompetitorAnalysisReport(
  competitor: Competitor,
  financingEvents: FinancingEvent[],
  productReleases: ProductRelease[],
  personnelChanges: PersonnelChange[],
  newsArticles: NewsArticle[],
  organizationStructure: OrganizationStructure[]
): Promise<CompetitorAnalysisReport> {
  const externalResearch = await runLlmGuidedResearch({
    competitorName: competitor.name,
    website: competitor.website,
    industry: competitor.industry,
    description: competitor.description,
  }).catch((error) => {
    console.warn("[Research] LLM-guided research failed:", error);
    return null;
  });

  // Prepare context data for the LLM
  const contextData = prepareContextData(
    competitor,
    financingEvents,
    productReleases,
    personnelChanges,
    newsArticles,
    organizationStructure,
    externalResearch
  );

  const systemPrompt = buildReportSystemPrompt();
  const userPrompt = buildReportUserPrompt({
    competitor,
    financingEvents,
    productReleases,
    personnelChanges,
    newsArticles,
    organizationStructure,
    contextData,
  });

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: [{ type: "text", text: systemPrompt }] },
        { role: "user", content: [{ type: "text", text: userPrompt }] },
      ] as any,
    });

    // Parse the response and extract sections
    const content = response.choices[0]?.message?.content;
    let reportText = "";
    if (typeof content === "string") {
      reportText = content;
    } else if (Array.isArray(content)) {
      reportText = content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
    }
    const report = parseAnalysisReport(reportText);

    return report;
  } catch (error) {
    console.error("Error generating analysis report:", error);
    return buildHeuristicAnalysisReport(
      competitor,
      financingEvents,
      productReleases,
      personnelChanges,
      newsArticles,
      organizationStructure
    );
  }
}

/**
 * Prepare context data from various sources for the LLM
 */
function prepareContextData(
  competitor: Competitor,
  financingEvents: FinancingEvent[],
  productReleases: ProductRelease[],
  personnelChanges: PersonnelChange[],
  newsArticles: NewsArticle[],
  organizationStructure: OrganizationStructure[],
  externalResearch?: {
    researchSummary?: string;
    keyFindings?: Array<{
      topic: string;
      finding: string;
      confidence: string | number;
      evidence: string;
    }>;
    evidenceUrls?: string[];
    recommendedQueries?: string[];
  } | null
): string {
  let context = `## Company Information\n`;
  context += `Name: ${competitor.name}\n`;
  context += `Industry: ${competitor.industry || "Not specified"}\n`;
  context += `Founded: ${competitor.foundingDate ? new Date(competitor.foundingDate).toLocaleDateString("zh-CN") : "Unknown"}\n`;
  context += `Registered Capital: ${competitor.registeredCapital || "Not specified"}\n`;
  context += `Legal Representative: ${competitor.legalRepresentative || "Not specified"}\n`;
  context += `Headquarters: ${competitor.headquartersLocation || "Not specified"}\n`;
  context += `Company Size: ${competitor.companySize || "Not specified"}\n`;
  context += `Financing Stage: ${competitor.financingStage || "Not specified"}\n`;
  context += `Website: ${competitor.website || "Not available"}\n`;
  context += `Business Scope: ${competitor.businessScope || "Not specified"}\n\n`;

  // Financing information
  if (financingEvents.length > 0) {
    context += `## Financing History\n`;
    financingEvents.forEach((event) => {
      context += `- ${event.round || "Unknown Round"}: ${event.amount || "Amount not disclosed"} (${event.announcementDate ? new Date(event.announcementDate).toLocaleDateString("zh-CN") : "Date unknown"})\n`;
      if (event.investors) {
        context += `  Investors: ${event.investors}\n`;
      }
    });
    context += `\n`;
  }

  // Product releases
  if (productReleases.length > 0) {
    context += `## Product Releases & Updates\n`;
    productReleases.slice(0, 10).forEach((product) => {
      context += `- ${product.productName} (v${product.version || "unknown"}) - ${product.releaseDate ? new Date(product.releaseDate).toLocaleDateString("zh-CN") : "Date unknown"}\n`;
      if (product.description) {
        context += `  ${product.description}\n`;
      }
    });
    if (productReleases.length > 10) {
      context += `... and ${productReleases.length - 10} more products\n`;
    }
    context += `\n`;
  }

  // Personnel changes
  if (personnelChanges.length > 0) {
    context += `## Key Personnel Changes\n`;
    const recentChanges = personnelChanges.slice(0, 15);
    recentChanges.forEach((change) => {
      context += `- ${change.name}: ${change.changeType} as ${change.position || "position unknown"} (${change.changeDate ? new Date(change.changeDate).toLocaleDateString("zh-CN") : "Date unknown"})\n`;
    });
    if (personnelChanges.length > 15) {
      context += `... and ${personnelChanges.length - 15} more changes\n`;
    }
    context += `\n`;
  }

  // Organization structure
  if (organizationStructure.length > 0) {
    const latestOrg = organizationStructure[organizationStructure.length - 1];
    context += `## Organization Structure\n`;
    context += `Total Headcount: ${latestOrg.totalHeadcount || "Unknown"}\n`;
    if (latestOrg.departmentBreakdown) {
      context += `Department Breakdown: ${latestOrg.departmentBreakdown}\n`;
    }
    context += `\n`;
  }

  // News and media coverage
  if (newsArticles.length > 0) {
    context += `## Recent News Coverage\n`;
    const recentNews = newsArticles.slice(0, 10);
    recentNews.forEach((article) => {
      context += `- ${article.title} (${article.publishDate ? new Date(article.publishDate).toLocaleDateString("zh-CN") : "Date unknown"})\n`;
      if (article.content) {
        context += `  ${article.content.substring(0, 200)}...\n`;
      }
    });
    if (newsArticles.length > 10) {
      context += `... and ${newsArticles.length - 10} more articles\n`;
    }
    context += `\n`;
  }

  if (externalResearch?.researchSummary || (externalResearch?.keyFindings?.length || 0) > 0) {
    const research = externalResearch;
    context += `## LLM Guided Web Research\n`;
    if (research?.researchSummary) {
      context += `Summary: ${research.researchSummary}\n`;
    }
    if (research?.keyFindings?.length) {
      research.keyFindings.slice(0, 10).forEach((item) => {
        context += `- ${item.topic}: ${item.finding} (confidence: ${item.confidence})\n`;
        context += `  Evidence: ${item.evidence}\n`;
      });
    }
    if (research?.evidenceUrls?.length) {
      context += `Evidence URLs: ${research.evidenceUrls.join(", ")}\n`;
    }
    if (research?.recommendedQueries?.length) {
      context += `Recommended Follow-up Queries: ${research.recommendedQueries.join(" | ")}\n`;
    }
    context += `\n`;
  }

  return context;
}

/**
 * Parse the LLM response and extract structured report sections
 */
function parseAnalysisReport(reportText: string): CompetitorAnalysisReport {
  // Extract sections from the report text
  const sections = {
    executiveSummary: extractSection(reportText, "Executive Summary"),
    businessModel: extractSection(reportText, "Business Model"),
    competitiveAdvantages: extractSection(reportText, "Competitive Advantages"),
    riskFactors: extractSection(reportText, "Risk Factors"),
    marketPosition: extractSection(reportText, "Market Position"),
    investmentPerspective: extractSection(reportText, "Investment Perspective"),
    strategicRecommendations: extractSection(reportText, "Strategic Recommendations"),
    teamCapabilities: extractSection(reportText, "Team Capabilities"),
    productStrategy: extractSection(reportText, "Product Strategy"),
    financialHealth: extractSection(reportText, "Financial Health"),
  };

  return sections;
}

/**
 * Extract a specific section from the report text
 */
function extractSection(text: string, sectionName: string): string {
  // Escape special regex characters in section name
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try multiple patterns to find the section
  const patterns = [
    // Pattern 1: Markdown heading with - or ## followed by section name
    new RegExp(`^[-#\\s]*${escapedName}[\\s\\S]*?(?=^[-#\\s]*[A-Z]|$)`, "im"),
    // Pattern 2: Section name followed by content
    new RegExp(`${escapedName}[\\s\\S]*?(?=\\n\\n[A-Z]|\\n-\\s|$)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      let content = match[0]
        // Remove markdown headers
        .replace(/^[-#\s]*/, "")
        // Remove section name from start
        .replace(new RegExp(`^${escapedName}[\\s-]*`, "i"), "")
        .trim();

      // Remove any trailing markdown headers
      content = content.replace(/\n[-#\s]*[A-Z][\s\S]*$/, "").trim();

      if (content.length > 10) {
        return content;
      }
    }
  }

  return "";
}

/**
 * Format the report for display
 */
export function formatReportForDisplay(report: CompetitorAnalysisReport): string {
  return `# 竞品穿透式深度分析报告

## 执行摘要
${report.executiveSummary}

## 商业模式
${report.businessModel}

## 竞争优势
${report.competitiveAdvantages}

## 风险因素
${report.riskFactors}

## 市场地位
${report.marketPosition}

## 投资视角
${report.investmentPerspective}

## 战略建议
${report.strategicRecommendations}

## 团队能力
${report.teamCapabilities}

## 产品战略
${report.productStrategy}

## 财务健康状况
${report.financialHealth}
`;
}

function buildHeuristicAnalysisReport(
  competitor: Competitor,
  financingEvents: FinancingEvent[],
  productReleases: ProductRelease[],
  personnelChanges: PersonnelChange[],
  newsArticles: NewsArticle[],
  organizationStructure: OrganizationStructure[]
): CompetitorAnalysisReport {
  const latestNews = newsArticles[0]?.title || "暂无充分外部新闻证据";
  const latestProduct = productReleases[0]?.productName || "暂无明确产品更新记录";
  const latestHiring = personnelChanges[0]?.position || "暂无明显组织扩张信号";
  const latestFunding = financingEvents[0]?.round || competitor.financingStage || "未披露";
  const latestTeamSize = organizationStructure[0]?.totalHeadcount
    ? `${organizationStructure[0].totalHeadcount}人`
    : competitor.companySize || "规模待验证";

  return {
    executiveSummary: `${competitor.name} 当前已沉淀基础公司画像与公开情报，但尚未完成大模型深度研判。结合现有资料看，其主要定位集中在${competitor.industry || "相关赛道"}，最近可见信号包括：${latestNews}。`,
    businessModel: `${competitor.name} 的商业模式可初步理解为围绕 ${competitor.businessScope || competitor.description || "核心业务能力"} 提供产品或服务，并通过持续的信息采集进一步验证其收入来源、客户类型和交付方式。`,
    competitiveAdvantages: `当前可见优势主要体现在公开渠道中反复出现的产品与服务描述。现有资料显示其与 ${latestProduct} 相关的产品叙事较清晰，说明其至少具备一定的产品化表达能力。`,
    riskFactors: `当前最大风险不是结论性风险，而是证据不足风险。包括真实客户结构、收入质量、渠道效率和区域扩张效果仍待持续验证。`,
    marketPosition: `${competitor.name} 在 ${competitor.industry || "目标行业"} 中的具体市场位置仍需通过更多媒体、客户案例和搜索结果验证，但从现有情报看已具备被持续跟踪的价值。`,
    investmentPerspective: `从一级市场跟踪视角看，${latestFunding} 和 ${latestTeamSize} 是目前少数可快速用于判断阶段感的信号。建议在后续采集中重点补齐融资、客户、团队和海外布局证据。`,
    strategicRecommendations: `建议继续扩大搜索范围，优先补齐官网、博客、媒体、招聘和工商公开信息；同时围绕客户案例、渠道合作和区域扩张建立更完整的证据链。`,
    teamCapabilities: `现有组织相关信号有限。当前可见团队线索主要是 ${latestHiring}，建议继续通过招聘页、领英和高管公开发声验证组织成熟度。`,
    productStrategy: `从现有资料看，${competitor.name} 至少在产品层面已有对外表达，当前最值得跟踪的是 ${latestProduct} 所体现的产品方向、功能叙事和迭代节奏。`,
    financialHealth: `当前没有足够财务披露支撑明确判断，已知可参考线索主要是融资阶段 ${latestFunding}。在后续采集中应重点验证收入模式、客单价、续费能力和资本效率。`,
  };
}
