CREATE TABLE `service_integrations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerId` int NOT NULL,
  `serviceKey` varchar(64) NOT NULL,
  `displayName` varchar(128) NOT NULL,
  `status` enum('available','private_only','needs_owner_login','needs_official_credential','blocked') NOT NULL,
  `privateAutomationAllowed` boolean NOT NULL DEFAULT false,
  `publicSubmissionAllowed` boolean NOT NULL DEFAULT false,
  `detail` text NOT NULL,
  `nextOwnerAction` text,
  `lastCheckedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `service_integrations_id` PRIMARY KEY(`id`),
  CONSTRAINT `service_integrations_owner_key` UNIQUE(`ownerId`,`serviceKey`)
);
--> statement-breakpoint
ALTER TABLE `automation_runs` ADD `sourceSystem` varchar(64) DEFAULT 'neuropulse_heartbeat' NOT NULL;
--> statement-breakpoint
ALTER TABLE `automation_runs` ADD `nextOwnerAction` text;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `contentCategory` enum('neuroscience','psychology','diet','mental_health') DEFAULT 'neuroscience' NOT NULL;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `sourceUrl` varchar(1024);
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `populationContext` text;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `reviewRisk` enum('standard','high_scrutiny') DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `crossValidationStatus` enum('not_started','confirmed','needs_review') DEFAULT 'not_started' NOT NULL;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `requiresOwnerReview` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `study_candidates` ADD `editorialFlags` json;
