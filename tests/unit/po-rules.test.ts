import { describe, expect, it } from 'vitest';
import type { PoStatus, Role } from '@prisma/client';
import { canApprovePo, canCancelPo, canEditPo, canReceivePo } from '@/server/procurement/po-rules';

const actor = (role: Role, id = 'me') => ({ id, role });
const po = (status: PoStatus, createdById = 'me') => ({ status, createdById });

describe('PO permission rules', () => {
  it('edit: drafts only; Staff only their own', () => {
    expect(canEditPo(actor('STAFF'), po('DRAFT'))).toBe(true);
    expect(canEditPo(actor('STAFF'), po('DRAFT', 'other'))).toBe(false);
    expect(canEditPo(actor('MANAGER'), po('DRAFT', 'other'))).toBe(true);
    expect(canEditPo(actor('ADMIN'), po('SUBMITTED'))).toBe(false);
  });

  it('approve: managers, submitted, never their own', () => {
    expect(canApprovePo(actor('MANAGER'), po('SUBMITTED', 'other'))).toBe(true);
    expect(canApprovePo(actor('MANAGER'), po('SUBMITTED'))).toBe(false);
    expect(canApprovePo(actor('ADMIN'), po('DRAFT', 'other'))).toBe(false);
    expect(canApprovePo(actor('STAFF'), po('SUBMITTED', 'other'))).toBe(false);
  });

  it('cancel: managers up to approved; Staff own before approval', () => {
    expect(canCancelPo(actor('MANAGER'), po('APPROVED', 'other'))).toBe(true);
    expect(canCancelPo(actor('MANAGER'), po('PARTIALLY_RECEIVED', 'other'))).toBe(false);
    expect(canCancelPo(actor('STAFF'), po('SUBMITTED'))).toBe(true);
    expect(canCancelPo(actor('STAFF'), po('APPROVED'))).toBe(false);
    expect(canCancelPo(actor('STAFF'), po('DRAFT', 'other'))).toBe(false);
  });

  it('receive: approved or partly received only', () => {
    expect(canReceivePo(po('APPROVED'))).toBe(true);
    expect(canReceivePo(po('PARTIALLY_RECEIVED'))).toBe(true);
    for (const s of ['DRAFT', 'SUBMITTED', 'RECEIVED', 'CANCELLED'] as const)
      expect(canReceivePo(po(s))).toBe(false);
  });
});
