ALTER TABLE `intelligenceSources`
ADD COLUMN `trustTier` enum('high','medium','low') NOT NULL DEFAULT 'medium' AFTER `status`;
--> statement-breakpoint
ALTER TABLE `discoveryTargets`
ADD COLUMN `trustTier` enum('high','medium','low') NOT NULL DEFAULT 'medium' AFTER `confidenceScore`;
