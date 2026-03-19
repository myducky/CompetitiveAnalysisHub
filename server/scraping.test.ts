import { describe, expect, it } from "vitest";
import { parseWebsiteSignals } from "./scraping";

describe("scraping parser", () => {
  it("extracts structured signals from a website homepage", () => {
    const html = `
      <html>
        <head>
          <title>MarketPulse | Competitive Intelligence</title>
          <meta name="description" content="Track competitors, ads, and market moves faster." />
        </head>
        <body>
          <header>
            <h1>MarketPulse</h1>
            <h2>竞品情报与广告监控平台</h2>
          </header>
          <main>
            <p>我们的产品覆盖产品、研发、销售、运营和市场团队，帮助客户持续增长。</p>
            <a href="/about">关于我们</a>
            <a href="/blog">新闻博客</a>
            <a href="/careers">招聘信息</a>
          </main>
        </body>
      </html>
    `;

    const signals = parseWebsiteSignals(html, "https://marketpulse.example.com");

    expect(signals.pageTitle).toContain("MarketPulse");
    expect(signals.metaDescription).toContain("Track competitors");
    expect(signals.headings).toContain("MarketPulse");
    expect(signals.importantLinks).toEqual([
      { label: "关于我们", url: "https://marketpulse.example.com/about" },
      { label: "新闻博客", url: "https://marketpulse.example.com/blog" },
      { label: "招聘信息", url: "https://marketpulse.example.com/careers" },
    ]);
    expect(signals.mainText).toContain("研发");
  });
});
