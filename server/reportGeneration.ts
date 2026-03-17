import { invokeLLM } from "./_core/llm";
import type { Competitor, FinancingEvent, ProductRelease, PersonnelChange, NewsArticle, OrganizationStructure } from "../drizzle/schema";

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
  // Prepare context data for the LLM
  const contextData = prepareContextData(
    competitor,
    financingEvents,
    productReleases,
    personnelChanges,
    newsArticles,
    organizationStructure
  );

  // Create the system prompt that positions the AI as a top-tier analyst
  const systemPrompt = `You are a top-tier industry analyst, primary market investor, and strategic consultant with deep expertise in cross-border e-commerce. Your task is to provide a penetrating analysis of a competitor company based on publicly available information, industry experience, and reasonable inference.

Your analysis should:
1. Be objective and fact-based, clearly distinguishing between confirmed facts and reasonable inferences
2. Adopt the perspective of an experienced investor evaluating investment opportunities
3. Identify key business drivers, competitive advantages, and potential vulnerabilities
4. Assess team quality and organizational capability based on available data
5. Evaluate market positioning and strategic direction
6. Provide actionable insights for strategic decision-making

Format your analysis in clear, professional sections with specific examples and data points where available.`;

  // Create the user prompt with context
  const userPrompt = `Please provide a comprehensive penetrating analysis of the following competitor company:

${contextData}

Generate a detailed analysis covering these exact sections (use these exact headers):
- Executive Summary
- Business Model
- Competitive Advantages
- Risk Factors
- Market Position
- Investment Perspective
- Strategic Recommendations
- Team Capabilities
- Product Strategy
- Financial Health

For each section, provide 2-3 paragraphs of detailed analysis. Provide specific examples and data points from the information provided. Be balanced and acknowledge areas of uncertainty.`;

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
    throw new Error("Failed to generate analysis report");
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
  organizationStructure: OrganizationStructure[]
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
