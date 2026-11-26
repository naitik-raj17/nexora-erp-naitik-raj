import type { AuditAction, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** FR-15: one row per document action, written in the same transaction as the change. */
export function writeAudit(
  tx: Tx,
  entry: {
    userId: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    details?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({ data: entry });
}
