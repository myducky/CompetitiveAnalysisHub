import { invokeLLM, type Message, type Tool } from "./_core/llm";
import { ENV } from "./_core/env";
import { parseWebsiteSignals } from "./scraping";

export type SearchResultItem = {
  title: string;
  url: string;
  snippet?: string;
};

type LlmRankedResult = SearchResultItem & {
  relevance: number;
  trust: number;
  rationale: string;
};

export async function searchWeb(query: string): Promise<SearchResultItem[]> {
  if (!ENV.searchProviderUrl) {
    return [];
  }

  if (isSerpApiProvider(ENV.searchProviderUrl)) {
    const url = new URL(ENV.searchProviderUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", ENV.searchProviderApiKey);
    url.searchParams.set("output", "json");
    url.searchParams.set("hl", "zh-cn");
    url.searchParams.set("gl", "cn");
    url.searchParams.set("num", "8");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Search provider failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    };

    return (payload.organic_results || [])
      .filter((item) => Boolean(item.title) && Boolean(item.link))
      .map((item) => ({
        title: item.title!,
        url: item.link!,
        snippet: item.snippet,
      }));
  }

  const response = await fetch(ENV.searchProviderUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ENV.searchProviderApiKey ? { authorization: `Bearer ${ENV.searchProviderApiKey}` } : {}),
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Search provider failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as { results?: SearchResultItem[] };
  return payload.results || [];
}

export async function rankSearchResultsWithLLM(input: {
  competitorName: string;
  query: string;
  targetType: string;
  results: SearchResultItem[];
}) {
  if (!ENV.forgeApiKey || input.results.length === 0) {
    return input.results.slice(0, 5);
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: [{
            type: "text",
            text: [
              "你是一名顶级产业分析师、一级市场投资人和战略顾问。",
              "请对一组搜索结果做研究价值判断，优先保留最有助于形成竞品画像、融资判断、产品判断、团队判断和风险判断的结果。",
              "请同时考虑来源可信度、与目标公司的相关性、可证据化价值。",
              "返回严格 JSON，字段为 rankedResults，数组中每项包含 url、title、snippet、relevance、trust、rationale。",
              "relevance 和 trust 使用 0-1 数字。",
            ].join(" "),
          }],
        },
        {
          role: "user",
          content: [{
            type: "text",
            text: JSON.stringify(input),
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
    const parsed = JSON.parse(text) as { rankedResults?: LlmRankedResult[] };

    return (parsed.rankedResults || [])
      .filter((item) => Boolean(item.url) && Boolean(item.title))
      .sort((a, b) => (b.relevance + b.trust) - (a.relevance + a.trust))
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.rationale || item.snippet,
      }));
  } catch {
    return input.results.slice(0, 5);
  }
}

export async function fetchPageSummary(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "CompetitiveAnalysisHubBot/1.0 (+https://localhost)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const signals = parseWebsiteSignals(html, url);

  return {
    url,
    title: signals.pageTitle,
    description: signals.metaDescription,
    headings: signals.headings,
    importantLinks: signals.importantLinks.slice(0, 6),
    excerpt: signals.mainText.slice(0, 1600),
  };
}

export async function runLlmGuidedResearch(input: {
  competitorName: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
}) {
  if (!ENV.forgeApiKey || !ENV.searchProviderUrl) {
    return null;
  }

  const tools: Tool[] = [
    {
      type: "function",
      function: {
        name: "search_web",
        description: "Search the public web for competitor information",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_page",
        description: "Fetch and summarize a public webpage",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string" },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
    },
  ];

  const messages: Message[] = [
    {
      role: "system",
      content: [{
        type: "text",
        text: [
          "你是一名顶级产业分析师 + 一级市场投资人 + 战略顾问。",
          "你可以自己决定搜索什么关键词、打开哪些页面，再基于证据生成研究结论。",
          "目标是为竞品平台补充高价值研究信息，而不是泛泛搜索。",
          "请重点搜集：官网/产品、融资、招聘、客户与生态、媒体报道、风险与负面信息。",
          "优先使用工具 search_web 和 fetch_page 主动研究；证据足够后，再返回最终 JSON。",
          "最终必须返回严格 JSON，字段包括 researchSummary、keyFindings、evidenceUrls、recommendedQueries。",
          "keyFindings 是数组，每项包含 topic、finding、confidence、evidence。",
        ].join(" "),
      }],
    },
    {
      role: "user",
      content: [{
        type: "text",
        text: JSON.stringify(input),
      }],
    },
  ];

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const response = await invokeLLM({
      messages,
      tools,
      toolChoice: "auto",
    });

    const assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) {
      break;
    }

    const assistantContent = typeof assistantMessage.content === "string"
      ? assistantMessage.content
      : assistantMessage.content;

    messages.push({
      role: "assistant",
      content: assistantContent as any,
    });

    const toolCalls = assistantMessage.tool_calls || [];
    if (toolCalls.length === 0) {
      const text = typeof assistantContent === "string"
        ? assistantContent
        : Array.isArray(assistantContent)
          ? assistantContent.map((item) => ("text" in item ? item.text : "")).join("\n")
          : "{}";
      try {
        return JSON.parse(text) as {
          researchSummary?: string;
          keyFindings?: Array<{
            topic: string;
            finding: string;
            confidence: string | number;
            evidence: string;
          }>;
          evidenceUrls?: string[];
          recommendedQueries?: string[];
        };
      } catch {
        return {
          researchSummary: text,
          keyFindings: [],
          evidenceUrls: [],
          recommendedQueries: [],
        };
      }
    }

    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, string>;

      try {
        if (toolCall.function.name === "search_web") {
          const results = await searchWeb(args.query || "");
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(results.slice(0, 6)),
          });
          continue;
        }

        if (toolCall.function.name === "fetch_page") {
          const page = await fetchPageSummary(args.url || "");
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(page),
          });
          continue;
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({ error: "Unsupported tool" }),
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown tool error",
          }),
        });
      }
    }
  }

  return null;
}

function isSerpApiProvider(url: string) {
  return /serpapi\.com\/search/i.test(url);
}
