import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  Competitor, InsertCompetitor, competitors,
  FinancingEvent, InsertFinancingEvent, financingEvents,
  ProductRelease, InsertProductRelease, productReleases,
  PersonnelChange, InsertPersonnelChange, personnelChanges,
  NewsArticle, InsertNewsArticle, newsArticles,
  OrganizationStructure, InsertOrganizationStructure, organizationStructure,
  AnalysisReport, InsertAnalysisReport, analysisReports,
  ComparisonMetrics, InsertComparisonMetrics, comparisonMetrics,
  ScrapingTask, InsertScrapingTask, scrapingTasks
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Competitor queries
 */
export async function getAllCompetitors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competitors);
}

export async function getCompetitorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competitors).where(eq(competitors.id, id)).limit(1);
  return result[0];
}

export async function createCompetitor(data: InsertCompetitor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(competitors).values(data);
  return result;
}

export async function updateCompetitor(id: number, data: Partial<InsertCompetitor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(competitors).set(data).where(eq(competitors.id, id));
}

export async function deleteCompetitor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(competitors).where(eq(competitors.id, id));
}

/**
 * Financing events queries
 */
export async function getFinancingEventsByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financingEvents).where(eq(financingEvents.competitorId, competitorId));
}

/**
 * Product releases queries
 */
export async function getProductReleasesByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productReleases).where(eq(productReleases.competitorId, competitorId));
}

/**
 * Personnel changes queries
 */
export async function getPersonnelChangesByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(personnelChanges).where(eq(personnelChanges.competitorId, competitorId));
}

/**
 * News articles queries
 */
export async function getNewsArticlesByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsArticles).where(eq(newsArticles.competitorId, competitorId));
}

/**
 * Organization structure queries
 */
export async function getOrganizationStructureByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationStructure).where(eq(organizationStructure.competitorId, competitorId));
}

/**
 * Analysis reports queries
 */
export async function getAnalysisReportByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(analysisReports).where(eq(analysisReports.competitorId, competitorId)).limit(1);
  return result[0];
}

export async function createAnalysisReport(data: InsertAnalysisReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(analysisReports).values(data);
}

/**
 * Comparison metrics queries
 */
export async function getComparisonMetricsSnapshot(competitorId: number, date: Date) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(comparisonMetrics)
    .where(eq(comparisonMetrics.competitorId, competitorId))
    .orderBy(comparisonMetrics.snapshotDate)
    .limit(1);
  return result[0];
}

export async function createComparisonMetrics(data: InsertComparisonMetrics) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(comparisonMetrics).values(data);
}

/**
 * Scraping tasks queries
 */
export async function getScrapingTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapingTasks);
}

export async function getScrapingTasksByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapingTasks).where(eq(scrapingTasks.competitorId, competitorId));
}

export async function createScrapingTask(data: InsertScrapingTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(scrapingTasks).values(data);
}

export async function updateScrapingTask(id: number, data: Partial<InsertScrapingTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(scrapingTasks).set(data).where(eq(scrapingTasks.id, id));
}
