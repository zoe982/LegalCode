CREATE TABLE `error_log` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`source` text NOT NULL,
	`severity` text DEFAULT 'error' NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`metadata` text,
	`url` text,
	`user_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` text,
	`resolved_by` text,
	`fingerprint` text NOT NULL,
	`occurrence_count` integer DEFAULT 1 NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `error_log_fingerprint_unique` ON `error_log` (`fingerprint`);
--> statement-breakpoint
CREATE UNIQUE INDEX `error_log_fingerprint_idx` ON `error_log` (`fingerprint`);
