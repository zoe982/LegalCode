ALTER TABLE templates DROP COLUMN status;
--> statement-breakpoint
ALTER TABLE templates ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
ALTER TABLE templates ADD COLUMN deleted_by TEXT REFERENCES users(id);
