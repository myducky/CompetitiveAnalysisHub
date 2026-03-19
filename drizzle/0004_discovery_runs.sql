CREATE TABLE `discoveryRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`mode` varchar(50) NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`queryPlan` json,
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discoveryTargets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorId` int NOT NULL,
	`runId` int NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` varchar(500),
	`query` varchar(500),
	`rationale` text,
	`confidenceScore` decimal(5,2),
	`status` enum('new','promoted','discarded') NOT NULL DEFAULT 'new',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryTargets_id` PRIMARY KEY(`id`)
);
