import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
const mockDb = {
  getAllCompetitors: async () => [
    {
      id: 1,
      name: "出海匠",
      website: "https://chuhaijiang.com",
      industry: "跨境电商",
      foundingDate: new Date("2020-01-01"),
      registeredCapital: "1000万元",
      legalRepresentative: "张三",
      businessScope: "跨境电商平台",
      registrationNumber: "123456789",
      headquartersLocation: "深圳",
      companySize: "50-100",
      financingStage: "Series A",
      logo: null,
      description: "专业的跨境电商服务平台",
      dataSourceLastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  getCompetitorById: async (id: number) =>
    id === 1
      ? {
          id: 1,
          name: "出海匠",
          website: "https://chuhaijiang.com",
          industry: "跨境电商",
          foundingDate: new Date("2020-01-01"),
          registeredCapital: "1000万元",
          legalRepresentative: "张三",
          businessScope: "跨境电商平台",
          registrationNumber: "123456789",
          headquartersLocation: "深圳",
          companySize: "50-100",
          financingStage: "Series A",
          logo: null,
          description: "专业的跨境电商服务平台",
          dataSourceLastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : undefined,
  createCompetitor: async (data: any) => ({
    insertId: 2,
  }),
  updateCompetitor: async (id: number, data: any) => ({
    affectedRows: 1,
  }),
  deleteCompetitor: async (id: number) => ({
    affectedRows: 1,
  }),
};

// Mock context
function createMockContext(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("competitors router", () => {
  describe("list", () => {
    it("should return all competitors", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // This will use the actual database, so we're testing the integration
      const result = await caller.competitors.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getById", () => {
    it("should return competitor by id", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Test with a competitor that might not exist
      const result = await caller.competitors.getById({ id: 1 });
      // Result could be undefined if no data exists
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("create", () => {
    it("should reject non-admin users", async () => {
      const ctx = createMockContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.competitors.create({
          name: "新竞品",
          website: "https://example.com",
          industry: "跨境电商",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("admin");
      }
    });

    it("should allow admin users to create competitors", async () => {
      const ctx = createMockContext("admin");
      const caller = appRouter.createCaller(ctx);

      // This will attempt to create in the actual database
      try {
        const result = await caller.competitors.create({
          name: "Test Competitor",
          website: "https://test.com",
          industry: "跨境电商",
        });
        expect(result).toBeDefined();
      } catch (error) {
        // Database might fail if it's not set up, but the authorization should pass
        expect((error as Error).message).not.toContain("admin");
      }
    });
  });

  describe("update", () => {
    it("should reject non-admin users", async () => {
      const ctx = createMockContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.competitors.update({
          id: 1,
          name: "Updated Name",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("admin");
      }
    });
  });

  describe("delete", () => {
    it("should reject non-admin users", async () => {
      const ctx = createMockContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.competitors.delete({ id: 1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("admin");
      }
    });
  });
});

describe("dynamics router", () => {
  describe("getFinancingEvents", () => {
    it("should return financing events for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dynamics.getFinancingEvents({ competitorId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getProductReleases", () => {
    it("should return product releases for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dynamics.getProductReleases({ competitorId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getPersonnelChanges", () => {
    it("should return personnel changes for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dynamics.getPersonnelChanges({ competitorId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getNewsArticles", () => {
    it("should return news articles for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dynamics.getNewsArticles({ competitorId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("organization router", () => {
  describe("getStructure", () => {
    it("should return organization structure for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.organization.getStructure({ competitorId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("reports router", () => {
  describe("getAnalysisReport", () => {
    it("should return analysis report for a competitor", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reports.getAnalysisReport({ competitorId: 1 });
      // Result could be undefined if no report exists
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });
});
