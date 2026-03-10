ALTER TABLE templates ADD COLUMN display_id TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX templates_display_id_unique ON templates(display_id);
