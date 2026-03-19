import { and, desc, eq, sql } from "drizzle-orm";
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
  ScrapingTask, InsertScrapingTask, scrapingTasks,
  IntelligenceSource, InsertIntelligenceSource, intelligenceSources,
  SourceDocument, InsertSourceDocument, sourceDocuments,
  IntelligenceEvent, InsertIntelligenceEvent, intelligenceEvents,
  DiscoveryRun, InsertDiscoveryRun, discoveryRuns,
  DiscoveryTarget, InsertDiscoveryTarget, discoveryTargets,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildLocalOpenId, hashPassword, normalizeEmail, normalizeIdentifier } from "./localAuth";

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

export async function ensureUsersAuthSchema() {
  const db = await getDb();
  if (!db) return;

  const isIgnorableAlterError = (error: unknown, codes: string[], fragments: string[]) => {
    const message = String(error);
    const causeCode = (error as any)?.cause?.code;
    return codes.includes(causeCode) || fragments.some(fragment => message.includes(fragment));
  };

  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN passwordHash text NULL AFTER email`);
  } catch (error) {
    if (!isIgnorableAlterError(error, ["ER_DUP_FIELDNAME"], ["Duplicate column name"])) {
      throw error;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE users ADD UNIQUE KEY users_email_unique (email)`);
  } catch (error) {
    if (!isIgnorableAlterError(error, ["ER_DUP_KEYNAME", "ER_DUP_ENTRY"], ["Duplicate key name", "Duplicate entry"])) {
      throw error;
    }
  }
}

export async function ensureInitialAdminUser() {
  const db = await getDb();
  if (!db) return;

  await ensureUsersAuthSchema();

  const username = normalizeIdentifier(ENV.initialAdminUsername);
  if (!username || !ENV.initialAdminPassword) return;

  await db.insert(users).values({
    openId: buildLocalOpenId(username),
    email: null,
    passwordHash: hashPassword(ENV.initialAdminPassword),
    name: username,
    loginMethod: "email",
    role: "admin",
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      email: null,
      passwordHash: hashPassword(ENV.initialAdminPassword),
      loginMethod: "email",
      name: username,
      role: "admin",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  });
}

export async function removeDemoCompetitors() {
  const db = await getDb();
  if (!db) return;

  const demoNames = [
    "ShopFlow",
    "MarketPulse",
    "GlobalReach",
    "Shopify",
    "Similarweb",
    "ShipBob",
  ];

  const existing = await db.select({
    id: competitors.id,
    name: competitors.name,
  }).from(competitors);

  for (const competitor of existing) {
    if (demoNames.includes(competitor.name)) {
      await deleteCompetitor(competitor.id);
    }
  }
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const normalizedEmail = normalizeEmail(email);
  const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByIdentifier(identifier: string) {
  return getUserByOpenId(buildLocalOpenId(identifier));
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

export async function getCompetitorByWebsite(website: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competitors).where(eq(competitors.website, website)).limit(1);
  return result[0];
}

export async function createCompetitor(data: InsertCompetitor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(competitors).values(data);

  const [created] = await db.select().from(competitors).orderBy(desc(competitors.id)).limit(1);
  return created;
}

export async function updateCompetitor(id: number, data: Partial<InsertCompetitor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(competitors).set(data).where(eq(competitors.id, id));
  return getCompetitorById(id);
}

export async function deleteCompetitor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(financingEvents).where(eq(financingEvents.competitorId, id));
  await db.delete(productReleases).where(eq(productReleases.competitorId, id));
  await db.delete(personnelChanges).where(eq(personnelChanges.competitorId, id));
  await db.delete(newsArticles).where(eq(newsArticles.competitorId, id));
  await db.delete(organizationStructure).where(eq(organizationStructure.competitorId, id));
  await db.delete(analysisReports).where(eq(analysisReports.competitorId, id));
  await db.delete(comparisonMetrics).where(eq(comparisonMetrics.competitorId, id));
  await db.delete(scrapingTasks).where(eq(scrapingTasks.competitorId, id));
  await db.delete(intelligenceEvents).where(eq(intelligenceEvents.competitorId, id));
  await db.delete(sourceDocuments).where(eq(sourceDocuments.competitorId, id));
  await db.delete(intelligenceSources).where(eq(intelligenceSources.competitorId, id));
  await db.delete(discoveryTargets).where(eq(discoveryTargets.competitorId, id));
  await db.delete(discoveryRuns).where(eq(discoveryRuns.competitorId, id));

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

export async function findNewsArticleByTitleOrUrl(competitorId: number, title: string, url?: string | null) {
  const db = await getDb();
  if (!db) return undefined;

  const existingArticles = await db.select().from(newsArticles).where(eq(newsArticles.competitorId, competitorId));
  return existingArticles.find((article) => {
    if (url && article.url === url) {
      return true;
    }
    return article.title === title;
  });
}

export async function createNewsArticle(data: InsertNewsArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(newsArticles).values(data);
}

/**
 * Organization structure queries
 */
export async function getOrganizationStructureByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationStructure).where(eq(organizationStructure.competitorId, competitorId));
}

export async function createOrganizationStructure(data: InsertOrganizationStructure) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(organizationStructure).values(data);
}

/**
 * Analysis reports queries
 */
export async function getAnalysisReportByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(analysisReports).where(eq(analysisReports.competitorId, competitorId)).limit(1);
  return result[0] || null;
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
  return db.select().from(scrapingTasks).orderBy(desc(scrapingTasks.createdAt));
}

export async function getScrapingTasksByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapingTasks)
    .where(eq(scrapingTasks.competitorId, competitorId))
    .orderBy(desc(scrapingTasks.createdAt));
}

export async function getScrapingTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scrapingTasks).where(eq(scrapingTasks.id, id)).limit(1);
  return result[0];
}

export async function getScrapingTaskBySource(competitorId: number, taskType: string, dataSource: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scrapingTasks)
    .where(and(
      eq(scrapingTasks.competitorId, competitorId),
      eq(scrapingTasks.taskType, taskType),
      eq(scrapingTasks.dataSource, dataSource),
    ))
    .limit(1);
  return result[0];
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

/**
 * Intelligence source queries
 */
export async function getIntelligenceSourcesByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intelligenceSources)
    .where(eq(intelligenceSources.competitorId, competitorId))
    .orderBy(desc(intelligenceSources.createdAt));
}

export async function getIntelligenceSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intelligenceSources).where(eq(intelligenceSources.id, id)).limit(1);
  return result[0];
}

export async function getIntelligenceSourceByUrl(competitorId: number, url: string, sourceType?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [
    eq(intelligenceSources.competitorId, competitorId),
    eq(intelligenceSources.url, url),
  ];

  if (sourceType) {
    conditions.push(eq(intelligenceSources.sourceType, sourceType));
  }

  const result = await db.select().from(intelligenceSources)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createIntelligenceSource(data: InsertIntelligenceSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(intelligenceSources).values(data);
}

export async function updateIntelligenceSource(id: number, data: Partial<InsertIntelligenceSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(intelligenceSources).set(data).where(eq(intelligenceSources.id, id));
}

/**
 * Source document queries
 */
export async function getSourceDocumentsByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceDocuments)
    .where(eq(sourceDocuments.competitorId, competitorId))
    .orderBy(desc(sourceDocuments.createdAt));
}

export async function getSourceDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sourceDocuments).where(eq(sourceDocuments.id, id)).limit(1);
  return result[0];
}

export async function getSourceDocumentByFingerprint(competitorId: number, fingerprint: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sourceDocuments)
    .where(and(
      eq(sourceDocuments.competitorId, competitorId),
      eq(sourceDocuments.fingerprint, fingerprint),
    ))
    .limit(1);
  return result[0];
}

export async function getSourceDocumentByUrl(competitorId: number, canonicalUrl: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sourceDocuments)
    .where(and(
      eq(sourceDocuments.competitorId, competitorId),
      eq(sourceDocuments.canonicalUrl, canonicalUrl),
    ))
    .limit(1);
  return result[0];
}

export async function createSourceDocument(data: InsertSourceDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(sourceDocuments).values(data);
}

export async function updateSourceDocument(id: number, data: Partial<InsertSourceDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(sourceDocuments).set(data).where(eq(sourceDocuments.id, id));
}

/**
 * Intelligence event queries
 */
export async function getIntelligenceEventsByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intelligenceEvents)
    .where(eq(intelligenceEvents.competitorId, competitorId))
    .orderBy(desc(intelligenceEvents.createdAt));
}

export async function createIntelligenceEvent(data: InsertIntelligenceEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(intelligenceEvents).values(data);
}

/**
 * Discovery run queries
 */
export async function getDiscoveryRunsByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discoveryRuns)
    .where(eq(discoveryRuns.competitorId, competitorId))
    .orderBy(desc(discoveryRuns.createdAt));
}

export async function getDiscoveryRunById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discoveryRuns).where(eq(discoveryRuns.id, id)).limit(1);
  return result[0];
}

export async function createDiscoveryRun(data: InsertDiscoveryRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(discoveryRuns).values(data);
}

export async function updateDiscoveryRun(id: number, data: Partial<InsertDiscoveryRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(discoveryRuns).set(data).where(eq(discoveryRuns.id, id));
}

/**
 * Discovery target queries
 */
export async function getDiscoveryTargetsByCompetitorId(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discoveryTargets)
    .where(eq(discoveryTargets.competitorId, competitorId))
    .orderBy(desc(discoveryTargets.createdAt));
}

export async function getDiscoveryTargetsByRunId(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discoveryTargets)
    .where(eq(discoveryTargets.runId, runId))
    .orderBy(desc(discoveryTargets.createdAt));
}

export async function getDiscoveryTargetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discoveryTargets).where(eq(discoveryTargets.id, id)).limit(1);
  return result[0];
}

export async function getDiscoveryTargetByUrl(competitorId: number, url: string, targetType?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [
    eq(discoveryTargets.competitorId, competitorId),
    eq(discoveryTargets.url, url),
  ];

  if (targetType) {
    conditions.push(eq(discoveryTargets.targetType, targetType));
  }

  const result = await db.select().from(discoveryTargets)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createDiscoveryTarget(data: InsertDiscoveryTarget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(discoveryTargets).values(data);
}

export async function updateDiscoveryTarget(id: number, data: Partial<InsertDiscoveryTarget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(discoveryTargets).set(data).where(eq(discoveryTargets.id, id));
}
