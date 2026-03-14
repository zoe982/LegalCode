CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL REFERENCES `templates`(`id`),
	`author_id` text NOT NULL REFERENCES `users`(`id`),
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`type` text NOT NULL,
	`anchor_from` text NOT NULL,
	`anchor_to` text NOT NULL,
	`original_text` text NOT NULL,
	`replacement_text` text,
	`status` text NOT NULL DEFAULT 'pending',
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
