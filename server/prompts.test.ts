import { describe, expect, it } from "vitest";
import {
  buildDiscoverySystemPrompt,
  buildExtractionSystemPrompt,
  buildReportSystemPrompt,
} from "./prompts";

describe("prompt templates", () => {
  it("includes analyst and investor framing in discovery prompt", () => {
    const prompt = buildDiscoverySystemPrompt();

    expect(prompt).toContain("顶级产业分析师");
    expect(prompt).toContain("一级市场投资人");
    expect(prompt).toContain("OSINT");
  });

  it("includes evidence discipline in extraction prompt", () => {
    const prompt = buildExtractionSystemPrompt();

    expect(prompt).toContain("不要编造");
    expect(prompt).toContain("结构化竞品情报");
  });

  it("includes penetrating report framing in report prompt", () => {
    const prompt = buildReportSystemPrompt();

    expect(prompt).toContain("顶级产业分析师 + 一级市场投资人 + 战略顾问");
    expect(prompt).toContain("穿透式深度分析报告");
    expect(prompt).toContain("已验证事实");
  });
});
