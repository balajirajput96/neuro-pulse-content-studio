CREATE TABLE `blocker_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`blockerType` enum('voice_sample','video_quota','facebook_page') NOT NULL,
	`severity` enum('critical','warning','info') NOT NULL DEFAULT 'warning',
	`title` varchar(255) NOT NULL,
	`detail` text NOT NULL,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blocker_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `citation_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reelDraftId` int NOT NULL,
	`journal` varchar(255) NOT NULL,
	`publicationYear` int NOT NULL,
	`doi` varchar(512),
	`pmid` varchar(64),
	`studyType` varchar(128) NOT NULL,
	`limitationSentence` text NOT NULL,
	`syntheticVoiceDisclosure` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `citation_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`reelDraftId` int,
	`topic` text NOT NULL,
	`topicKey` varchar(512) NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_log_owner_topic_key` UNIQUE(`ownerId`,`topicKey`)
);
--> statement-breakpoint
CREATE TABLE `reel_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`studyCandidateId` int NOT NULL,
	`topic` text NOT NULL,
	`status` enum('research','scripted','assets_ready','blocked','approved') NOT NULL DEFAULT 'research',
	`narrationSpans` json NOT NULL,
	`visualKeyframes` json NOT NULL,
	`bgmStatus` enum('missing','ready','blocked') NOT NULL DEFAULT 'missing',
	`voiceStatus` enum('missing','reference_ready','ready','blocked') NOT NULL DEFAULT 'missing',
	`sourceCited` boolean NOT NULL DEFAULT false,
	`limitationLinePresent` boolean NOT NULL DEFAULT false,
	`notMedicalAdvice` boolean NOT NULL DEFAULT false,
	`approvedForPublish` boolean NOT NULL DEFAULT false,
	`approvedByOwnerId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reel_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` text NOT NULL,
	`topicKey` varchar(512) NOT NULL,
	`journal` varchar(255) NOT NULL,
	`doi` varchar(512),
	`pmid` varchar(64),
	`studyType` enum('Human cohort','Systematic review','Replication study','Clinical trial','Preclinical model') NOT NULL,
	`screeningStatus` enum('passed','needs_review','rejected') NOT NULL DEFAULT 'needs_review',
	`screeningReason` text,
	`publicationYear` int,
	`indexedAt` timestamp,
	`isDuplicate` boolean NOT NULL DEFAULT false,
	`duplicateOfStudyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_bundle_reels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bundleId` int NOT NULL,
	`reelDraftId` int NOT NULL,
	`dayIndex` int NOT NULL,
	CONSTRAINT `weekly_bundle_reels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_bundles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`weekStart` timestamp NOT NULL,
	`status` enum('collecting','ready_to_compile','compiled','blocked') NOT NULL DEFAULT 'collecting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_bundles_id` PRIMARY KEY(`id`)
);
