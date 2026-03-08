import type { AppDb } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(db: AppDb, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      userId: entry.userId,
      userEmail: entry.userEmail,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Fire-and-forget: audit logging failures must never break the request
    console.error('Audit log write failed');
  }
}
