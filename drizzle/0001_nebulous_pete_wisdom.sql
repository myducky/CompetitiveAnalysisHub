CREATE TABLE `analysisReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`executiveSummary` text,
	`businessModel` text,
	`competitiveAdvantages` text,
	`riskFactors` text,
	`marketPosition` text,
	`investmentPerspective` text,
	`strategicRecommendations` text,
	`reportContent` text,
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analysisReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comparisonMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`totalFundingRaised` decimal(15,2),
	`totalFundingRaisedUSD` decimal(15,2),
	`teamSize` int,
	`productCount` int,
	`newsArticleCount` int,
	`investorCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comparisonMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`website` varchar(500),
	`industry` varchar(100),
	`foundingDate` timestamp,
	`registeredCapital` varchar(100),
	`legalRepresentative` varchar(100),
	`businessScope` text,
	`registrationNumber` varchar(100),
	`headquartersLocation` varchar(255),
	`companySize` varchar(50),
	`financingStage` varchar(50),
	`logo` varchar(500),
	`description` text,
	`dataSourceLastUpdated` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financingEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`round` varchar(50),
	`amount` varchar(100),
	`amountUSD` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`investors` text,
	`announcementDate` timestamp,
	`source` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsArticles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`source` varchar(255),
	`url` varchar(500),
	`publishDate` timestamp,
	`category` varchar(100),
	`sentiment` enum('positive','neutral','negative'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsArticles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationStructure` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`totalHeadcount` int,
	`departmentBreakdown` text,
	`keyPositions` text,
	`dataSource` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationStructure_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnelChanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`position` varchar(100),
	`changeType` enum('hire','departure','promotion','demotion') NOT NULL,
	`changeDate` timestamp,
	`previousPosition` varchar(100),
	`department` varchar(100),
	`source` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personnelChanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productReleases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`releaseDate` timestamp,
	`version` varchar(50),
	`description` text,
	`features` text,
	`category` varchar(100),
	`source` varchar(255),
	`url` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productReleases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrapingTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int,
	`taskType` varchar(50) NOT NULL,
	`dataSource` varchar(255) NOT NULL,
	`status` enum('pending','running','completed','failed') DEFAULT 'pending',
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`frequency` varchar(50),
	`errorMessage` text,
	`recordsProcessed` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scrapingTasks_id` PRIMARY KEY(`id`)
);
