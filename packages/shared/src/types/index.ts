export type Role = 'admin' | 'editor' | 'viewer';

export type TemplateStatus = 'draft' | 'active' | 'archived';

export type AuditAction =
  | 'create'
  | 'update'
  | 'publish'
  | 'archive'
  | 'unarchive'
  | 'export'
  | 'login'
  | 'client_error';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string | null;
  country: string | null;
  status: TemplateStatus;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  changeSummary: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export * from './auth.js';
export * from './errors.js';
