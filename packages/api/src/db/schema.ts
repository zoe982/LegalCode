import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  displayId: text('display_id').notNull().default(''),
  category: text('category').notNull(),
  description: text('description'),
  country: text('country'),
  currentVersion: integer('current_version').notNull().default(1),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  deletedBy: text('deleted_by').references(() => users.id),
});

export const templateVersions = sqliteTable(
  'template_versions',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id),
    version: integer('version').notNull(),
    content: text('content').notNull(),
    changeSummary: text('change_summary'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('template_version_idx').on(table.templateId, table.version)],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const templateTags = sqliteTable(
  'template_tags',
  {
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.templateId, table.tagId] })],
);

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(), // e.g., 'template.create', 'template.update', 'comment.create'
  resourceType: text('resource_type').notNull(), // 'template' or 'comment'
  resourceId: text('resource_id').notNull(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  metadata: text('metadata'), // JSON string of additional context
  createdAt: text('created_at').notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => templates.id),
  parentId: text('parent_id'),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  content: text('content').notNull(),
  anchorText: text('anchor_text'),
  anchorFrom: text('anchor_from'),
  anchorTo: text('anchor_to'),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  resolvedBy: text('resolved_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

export const countries = sqliteTable('countries', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

export const errorLog = sqliteTable(
  'error_log',
  {
    id: text('id').primaryKey(),
    timestamp: text('timestamp').notNull(),
    source: text('source', { enum: ['frontend', 'backend', 'websocket', 'functional'] }).notNull(),
    severity: text('severity', { enum: ['error', 'warning', 'critical'] })
      .notNull()
      .default('error'),
    message: text('message').notNull(),
    stack: text('stack'),
    metadata: text('metadata'),
    url: text('url'),
    userId: text('user_id'),
    status: text('status', { enum: ['open', 'resolved'] })
      .notNull()
      .default('open'),
    resolvedAt: text('resolved_at'),
    resolvedBy: text('resolved_by'),
    fingerprint: text('fingerprint').notNull().unique(),
    occurrenceCount: integer('occurrence_count').notNull().default(1),
    lastSeenAt: text('last_seen_at').notNull(),
  },
  (table) => [uniqueIndex('error_log_fingerprint_idx').on(table.fingerprint)],
);
