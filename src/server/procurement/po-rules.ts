import type { PoStatus } from '@prisma/client';
import { hasRole, type Actor } from '@/server/core/roles';

/** Pure permission rules for purchase orders (proposal permission matrix). Used by services and UI. */
type Po = { status: PoStatus; createdById: string };

const isManager = (a: Pick<Actor, 'role'>) => hasRole(a, 'ADMIN', 'MANAGER');
const isOwn = (a: Pick<Actor, 'id'>, po: Po) => po.createdById === a.id;

/** Edit and submit: drafts only; Staff only their own. */
export function canEditPo(actor: Pick<Actor, 'id' | 'role'>, po: Po) {
  return po.status === 'DRAFT' && (isManager(actor) || isOwn(actor, po));
}

/** Approve or reject: Admin or Manager, never their own PO (FR-11). */
export function canApprovePo(actor: Pick<Actor, 'id' | 'role'>, po: Po) {
  return po.status === 'SUBMITTED' && isManager(actor) && !isOwn(actor, po);
}

/** Cancel (FR-16): nothing received yet. Staff only their own and only before approval. */
export function canCancelPo(actor: Pick<Actor, 'id' | 'role'>, po: Po) {
  if (isManager(actor)) return ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(po.status);
  return isOwn(actor, po) && ['DRAFT', 'SUBMITTED'].includes(po.status);
}

/** Goods can be received against approved or partly received POs (Day 13). */
export function canReceivePo(po: Pick<Po, 'status'>) {
  return po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';
}
