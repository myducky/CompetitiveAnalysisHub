CREATE TABLE `intelligenceSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`sourceType` varchar(50) NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`collectionMode` varchar(50) DEFAULT 'manual',
	`metadata` json,
	`lastCollectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intelligenceSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sourceDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`sourceId` int,
	`documentType` varchar(50) NOT NULL,
	`title` varchar(500),
	`canonicalUrl` varchar(500) NOT NULL,
	`publishedAt` timestamp,
	`author` varchar(255),
	`contentText` text,
	`summary` text,
	`rawPayload` text,
	`fingerprint` varchar(128) NOT NULL,
	`extractionStatus` enum('pending','processed','failed') NOT NULL DEFAULT 'pending',
	`extractedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sourceDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intelligenceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`sourceDocumentId` int,
	`eventType` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`eventDate` timestamp,
	`confidenceScore` decimal(5,2),
	`payload` json,
	`evidenceSnippet` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intelligenceEvents_id` PRIMARY KEY(`id`)
);
