import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  competitors: router({
    list: publicProcedure.query(() => {
      return db.getAllCompetitors();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => {
        return db.getCompetitorById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        website: z.string().optional(),
        industry: z.string().optional(),
        foundingDate: z.date().optional(),
        registeredCapital: z.string().optional(),
        legalRepresentative: z.string().optional(),
        businessScope: z.string().optional(),
        registrationNumber: z.string().optional(),
        headquartersLocation: z.string().optional(),
        companySize: z.string().optional(),
        financingStage: z.string().optional(),
        logo: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can create competitors");
        }
        return db.createCompetitor(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        website: z.string().optional(),
        industry: z.string().optional(),
        foundingDate: z.date().optional(),
        registeredCapital: z.string().optional(),
        legalRepresentative: z.string().optional(),
        businessScope: z.string().optional(),
        registrationNumber: z.string().optional(),
        headquartersLocation: z.string().optional(),
        companySize: z.string().optional(),
        financingStage: z.string().optional(),
        logo: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can update competitors");
        }
        const { id, ...data } = input;
        return db.updateCompetitor(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can delete competitors");
        }
        return db.deleteCompetitor(input.id);
      }),
  }),

  dynamics: router({
    getFinancingEvents: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getFinancingEventsByCompetitorId(input.competitorId);
      }),

    getProductReleases: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getProductReleasesByCompetitorId(input.competitorId);
      }),

    getPersonnelChanges: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getPersonnelChangesByCompetitorId(input.competitorId);
      }),

    getNewsArticles: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getNewsArticlesByCompetitorId(input.competitorId);
      }),
  }),

  organization: router({
    getStructure: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getOrganizationStructureByCompetitorId(input.competitorId);
      }),
  }),

  reports: router({
    getAnalysisReport: publicProcedure
      .input(z.object({ competitorId: z.number() }))
      .query(({ input }) => {
        return db.getAnalysisReportByCompetitorId(input.competitorId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
