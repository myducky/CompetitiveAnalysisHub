import { describe, expect, it } from "vitest";
import { pickOfficialWebsiteCandidate, selectDiscoveryTargets } from "./intelligence";

describe("intelligence discovery", () => {
  it("keeps relevant same-host links and filters duplicates", () => {
    const targets = selectDiscoveryTargets("https://example.com", [
      { label: "新闻中心", url: "https://example.com/news" },
      { label: "招聘信息", url: "/careers" },
      { label: "团队介绍", url: "https://example.com/about/team" },
      { label: "外部媒体", url: "https://other.com/news" },
      { label: "新闻中心", url: "https://example.com/news" },
      { label: "联系我们", url: "https://example.com/contact" },
    ]);

    expect(targets).toEqual([
      { label: "新闻中心", url: "https://example.com/news" },
      { label: "招聘信息", url: "https://example.com/careers" },
      { label: "团队介绍", url: "https://example.com/about/team" },
    ]);
  });

  it("prefers likely official website results", () => {
    const website = pickOfficialWebsiteCandidate("Similarweb", [
      { title: "Similarweb - Digital Data", url: "https://www.similarweb.com/" },
      { title: "Similarweb | LinkedIn", url: "https://www.linkedin.com/company/similarweb/" },
      { title: "Similarweb 融资新闻", url: "https://www.36kr.com/p/123" },
    ]);

    expect(website).toBe("https://www.similarweb.com/");
  });
});
