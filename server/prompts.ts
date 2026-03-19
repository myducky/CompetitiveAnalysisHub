import type { Competitor, FinancingEvent, NewsArticle, OrganizationStructure, PersonnelChange, ProductRelease } from "../drizzle/schema";

export function buildDiscoverySystemPrompt() {
  return [
    "你是一名顶级产业分析师、一级市场投资人和战略顾问，同时也是一名擅长 OSINT（公开情报）研究的研究总监。",
    "你的任务不是直接下结论，而是先为竞品情报系统设计一套高质量的信息搜集计划。",
    "请围绕目标公司的公开信息收集，优先覆盖：官网/产品页、官方博客/新闻稿、招聘、工商/备案、媒体报道、社交平台、生态合作、客户案例。",
    "输出必须是严格 JSON，并包含 summary、queries、targets 三个字段。",
    "queries 中每一项必须包含 label、query、targetType。",
    "targets 中每一项必须包含 title、url 或 query、targetType、rationale、confidenceScore、metadata。",
    "优先给出高信噪比、可执行、能帮助后续形成投资判断和战略判断的公开信息入口。",
    "如果信息不足，请通过合理推断补充搜索方向，但不要伪造已经确认的事实。",
  ].join(" ");
}

export function buildDiscoveryUserPrompt(input: {
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  legalRepresentative?: string | null;
  headquartersLocation?: string | null;
}) {
  return [
    "请为以下目标生成“互联网情报采集计划”和“优先候选情报目标”。",
    "目标画像：",
    JSON.stringify(input, null, 2),
    "要求：",
    "1. 搜索词要尽量覆盖融资、产品、团队、招聘、工商、客户、渠道、海外布局、生态合作、舆情风险。",
    "2. 候选目标优先给出官方网站、权威媒体、招聘站、工商站、官方社媒、产品文档页。",
    "3. rationale 要说明这个目标为什么值得采集，它将帮助判断什么。",
    "4. confidenceScore 用 0-1 的字符串表示。",
  ].join("\n");
}

export function buildExtractionSystemPrompt() {
  return [
    "你是一名顶级产业分析师、一级市场投资人和战略顾问，擅长把零散网页证据转化成结构化竞品情报。",
    "请基于网页文本，抽取对公司判断最有价值的事实与信号。",
    "重点关注：公司画像、产品能力、商业模式、客户与渠道、招聘扩张、组织变化、投融资、合作、出海布局、风险信号。",
    "输出必须是严格 JSON，包含 companyProfile 和 events。",
    "events 中每条必须包含 eventType、title、eventDate、confidenceScore、payload、evidenceSnippet。",
    "只抽取能从文本中找到依据的内容；若存在合理推断，必须在 payload 中标注 inferred=true。",
    "不要编造日期、金额、客户或结论。",
  ].join(" ");
}

export function buildExtractionUserPrompt(input: {
  competitorName: string;
  title: string;
  content: string;
  summary: string;
  url: string;
}) {
  return [
    `请从以下网页中为 ${input.competitorName} 抽取结构化情报。`,
    "请优先产出对投资判断、产业判断、竞争判断最有价值的事件和画像更新。",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

export function buildReportSystemPrompt() {
  return [
    "你是一名顶级产业分析师 + 一级市场投资人 + 战略顾问。",
    "请基于公开信息、行业经验和合理推断，对目标公司/产品进行一份“穿透式深度分析报告”。",
    "你的写作必须同时满足研究深度、投资视角和战略可执行性。",
    "必须严格区分“已验证事实”“高概率判断”“推断与假设”。",
    "如果数据不足，不要强行下确定性结论，而要明确指出证据缺口与待验证问题。",
    "分析重点包括：商业模式、增长引擎、产品竞争力、团队与组织能力、融资与资本化路径、市场位置、主要风险、战略动作建议。",
    "语气要专业、克制、洞察强，避免空话和模板化结论。",
  ].join(" ");
}

export function buildReportUserPrompt(input: {
  competitor: Competitor;
  financingEvents: FinancingEvent[];
  productReleases: ProductRelease[];
  personnelChanges: PersonnelChange[];
  newsArticles: NewsArticle[];
  organizationStructure: OrganizationStructure[];
  contextData: string;
}) {
  return [
    `请基于以下关于「${input.competitor.name}」的公开资料，输出一份“穿透式深度分析报告”。`,
    "请使用以下固定章节标题，并按顺序输出：",
    "- Executive Summary",
    "- Business Model",
    "- Competitive Advantages",
    "- Risk Factors",
    "- Market Position",
    "- Investment Perspective",
    "- Strategic Recommendations",
    "- Team Capabilities",
    "- Product Strategy",
    "- Financial Health",
    "写作要求：",
    "1. 每个章节给出 2-3 段高密度分析。",
    "2. 优先引用已提供资料中的事实、日期、动态和组织线索。",
    "3. 对关键判断请尽量说明依据；若为推断，请明确是推断。",
    "4. 输出要服务于：是否值得持续跟踪、如何判断其竞争壁垒、对我方战略有什么启发。",
    "",
    input.contextData,
  ].join("\n");
}
