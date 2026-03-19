import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Comparison metrics snapshot table - for performance comparison analysis
 */
export const comparisonMetrics = mysqlTable("comparisonMetrics", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  totalFundingRaised: decimal("totalFundingRaised", { precision: 15, scale: 2 }),
  totalFundingRaisedUSD: decimal("totalFundingRaisedUSD", { precision: 15, scale: 2 }),
  teamSize: int("teamSize"),
  productCount: int("productCount"),
  newsArticleCount: int("newsArticleCount"),
  investorCount: int("investorCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComparisonMetrics = typeof comparisonMetrics.$inferSelect;
export type InsertComparisonMetrics = typeof comparisonMetrics.$inferInsert;

/**
 * Competitors table - stores basic information about competitor companies
 */
export const competitors = mysqlTable("competitors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 100 }),
  foundingDate: timestamp("foundingDate"),
  registeredCapital: varchar("registeredCapital", { length: 100 }),
  legalRepresentative: varchar("legalRepresentative", { length: 100 }),
  businessScope: text("businessScope"),
  registrationNumber: varchar("registrationNumber", { length: 100 }),
  headquartersLocation: varchar("headquartersLocation", { length: 255 }),
  companySize: varchar("companySize", { length: 50 }), // e.g., "50-100", "100-500"
  financingStage: varchar("financingStage", { length: 50 }), // e.g., "Seed", "Series A", "Series B"
  logo: varchar("logo", { length: 500 }),
  description: text("description"),
  dataSourceLastUpdated: timestamp("dataSourceLastUpdated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = typeof competitors.$inferInsert;

/**
 * Financing events table - tracks funding rounds and investment information
 */
export const financingEvents = mysqlTable("financingEvents", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  round: varchar("round", { length: 50 }), // e.g., "Series A", "Series B"
  amount: varchar("amount", { length: 100 }), // e.g., "$10M"
  amountUSD: decimal("amountUSD", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  investors: text("investors"), // JSON array of investor names
  announcementDate: timestamp("announcementDate"),
  source: varchar("source", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancingEvent = typeof financingEvents.$inferSelect;
export type InsertFinancingEvent = typeof financingEvents.$inferInsert;

/**
 * Product releases table - tracks product launches and updates
 */
export const productReleases = mysqlTable("productReleases", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  releaseDate: timestamp("releaseDate"),
  version: varchar("version", { length: 50 }),
  description: text("description"),
  features: text("features"), // JSON array of features
  category: varchar("category", { length: 100 }),
  source: varchar("source", { length: 255 }),
  url: varchar("url", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductRelease = typeof productReleases.$inferSelect;
export type InsertProductRelease = typeof productReleases.$inferInsert;

/**
 * Personnel changes table - tracks team member changes and key hires
 */
export const personnelChanges = mysqlTable("personnelChanges", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  changeType: mysqlEnum("changeType", ["hire", "departure", "promotion", "demotion"]).notNull(),
  changeDate: timestamp("changeDate"),
  previousPosition: varchar("previousPosition", { length: 100 }),
  department: varchar("department", { length: 100 }),
  source: varchar("source", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PersonnelChange = typeof personnelChanges.$inferSelect;
export type InsertPersonnelChange = typeof personnelChanges.$inferInsert;

/**
 * News and media coverage table
 */
export const newsArticles = mysqlTable("newsArticles", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  source: varchar("source", { length: 255 }),
  url: varchar("url", { length: 500 }),
  publishDate: timestamp("publishDate"),
  category: varchar("category", { length: 100 }), // e.g., "funding", "product", "partnership"
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;

/**
 * Organization structure table - tracks team composition and hierarchy
 */
export const organizationStructure = mysqlTable("organizationStructure", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  totalHeadcount: int("totalHeadcount"),
  departmentBreakdown: text("departmentBreakdown"), // JSON object of department -> count
  keyPositions: text("keyPositions"), // JSON array of key positions and holders
  dataSource: varchar("dataSource", { length: 255 }), // e.g., "business_registry", "social_insurance"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrganizationStructure = typeof organizationStructure.$inferSelect;
export type InsertOrganizationStructure = typeof organizationStructure.$inferInsert;

/**
 * Deep analysis reports table
 */
export const analysisReports = mysqlTable("analysisReports", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  executiveSummary: text("executiveSummary"),
  businessModel: text("businessModel"),
  competitiveAdvantages: text("competitiveAdvantages"),
  riskFactors: text("riskFactors"),
  marketPosition: text("marketPosition"),
  investmentPerspective: text("investmentPerspective"),
  strategicRecommendations: text("strategicRecommendations"),
  reportContent: text("reportContent"), // Full report in markdown or HTML
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalysisReport = typeof analysisReports.$inferSelect;
export type InsertAnalysisReport = typeof analysisReports.$inferInsert;

/**
 * Data scraping tasks table - tracks automated data collection jobs
 */
export const scrapingTasks = mysqlTable("scrapingTasks", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId"),
  taskType: varchar("taskType", { length: 50 }).notNull(), // e.g., "business_registry", "recruitment", "news"
  dataSource: varchar("dataSource", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending"),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  frequency: varchar("frequency", { length: 50 }), // e.g., "daily", "weekly"
  errorMessage: text("errorMessage"),
  recordsProcessed: int("recordsProcessed").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScrapingTask = typeof scrapingTasks.$inferSelect;
export type InsertScrapingTask = typeof scrapingTasks.$inferInsert;

/**
 * Source registry table - stores configured discovery/collection endpoints for each competitor
 */
export const intelligenceSources = mysqlTable("intelligenceSources", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  sourceType: varchar("sourceType", { length: 50 }).notNull(), // website, blog, news_search, jobs, registry, social
  label: varchar("label", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  trustTier: mysqlEnum("trustTier", ["high", "medium", "low"]).default("medium").notNull(),
  collectionMode: varchar("collectionMode", { length: 50 }).default("manual"),
  metadata: json("metadata"),
  lastCollectedAt: timestamp("lastCollectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntelligenceSource = typeof intelligenceSources.$inferSelect;
export type InsertIntelligenceSource = typeof intelligenceSources.$inferInsert;

/**
 * Raw source documents table - stores fetched pages/articles before extraction
 */
export const sourceDocuments = mysqlTable("sourceDocuments", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  sourceId: int("sourceId"),
  documentType: varchar("documentType", { length: 50 }).notNull(), // webpage, article, job_posting, registry_record
  title: varchar("title", { length: 500 }),
  canonicalUrl: varchar("canonicalUrl", { length: 500 }).notNull(),
  publishedAt: timestamp("publishedAt"),
  author: varchar("author", { length: 255 }),
  contentText: text("contentText"),
  summary: text("summary"),
  rawPayload: text("rawPayload"),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processed", "failed"]).default("pending").notNull(),
  extractedAt: timestamp("extractedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SourceDocument = typeof sourceDocuments.$inferSelect;
export type InsertSourceDocument = typeof sourceDocuments.$inferInsert;

/**
 * Structured intelligence events extracted from raw documents
 */
export const intelligenceEvents = mysqlTable("intelligenceEvents", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  sourceDocumentId: int("sourceDocumentId"),
  eventType: varchar("eventType", { length: 50 }).notNull(), // company_profile, news, product_update, hiring_signal, risk_signal
  title: varchar("title", { length: 500 }).notNull(),
  eventDate: timestamp("eventDate"),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }),
  payload: json("payload"),
  evidenceSnippet: text("evidenceSnippet"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntelligenceEvent = typeof intelligenceEvents.$inferSelect;
export type InsertIntelligenceEvent = typeof intelligenceEvents.$inferInsert;

/**
 * Discovery runs table - stores model-driven web discovery sessions
 */
export const discoveryRuns = mysqlTable("discoveryRuns", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  mode: varchar("mode", { length: 50 }).notNull(), // web_search, source_expansion
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  queryPlan: json("queryPlan"),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscoveryRun = typeof discoveryRuns.$inferSelect;
export type InsertDiscoveryRun = typeof discoveryRuns.$inferInsert;

/**
 * Discovery targets table - stores candidate URLs/queries found during a discovery run
 */
export const discoveryTargets = mysqlTable("discoveryTargets", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  runId: int("runId").notNull(),
  targetType: varchar("targetType", { length: 50 }).notNull(), // news, jobs, registry, social, website
  title: varchar("title", { length: 500 }).notNull(),
  url: varchar("url", { length: 500 }),
  query: varchar("query", { length: 500 }),
  rationale: text("rationale"),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }),
  trustTier: mysqlEnum("trustTier", ["high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["new", "promoted", "discarded"]).default("new").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscoveryTarget = typeof discoveryTargets.$inferSelect;
export type InsertDiscoveryTarget = typeof discoveryTargets.$inferInsert;
