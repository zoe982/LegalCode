import type { AuditAction } from '@legalcode/shared';
import type { AppDb } from '../db/index.js';
import { auditLog } from '../db/schema.js';

interface AuditInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(db: AppDb, input: AuditInput): Promise<void> {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: new Date().toISOString(),
  });
}
