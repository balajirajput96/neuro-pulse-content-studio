ALTER TABLE `study_candidates` MODIFY COLUMN `editorialFlags` json;--> statement-breakpoint
ALTER TABLE `reel_drafts` ADD `sourcePack` json;--> statement-breakpoint
ALTER TABLE `reel_drafts` ADD `sourcePackStatus` enum('missing','needs_review','complete') DEFAULT 'missing' NOT NULL;--> statement-breakpoint
ALTER TABLE `reel_drafts` ADD `healthRedFlagsCleared` boolean DEFAULT false NOT NULL;