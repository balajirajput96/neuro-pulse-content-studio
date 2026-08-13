CREATE TABLE `automation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`jobType` enum('daily_research','weekly_compilation') NOT NULL,
	`cronExpression` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`enabled` boolean NOT NULL DEFAULT true,
	`lastExecutedAt` timestamp,
	`lastStatus` enum('idle','running','succeeded','failed','blocked') NOT NULL DEFAULT 'idle',
	`lastSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_jobs_owner_type` UNIQUE(`ownerId`,`jobType`)
);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`triggerType` enum('scheduled','manual') NOT NULL,
	`status` enum('running','succeeded','failed','blocked') NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`resultSummary` text,
	`candidateCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `automation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `study_candidates` MODIFY COLUMN `studyType` enum('Human cohort','Systematic review','Replication study','Clinical trial','Preclinical model','Unclassified') NOT NULL;