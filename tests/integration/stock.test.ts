import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  adjustStock,
  issueStock,
  listStockLevels,
  productLedger,
  productStock,
} from '@/server/inventory/stock';
import { ForbiddenError, ValidationError } from '@/server/errors';
import { makeActor, makeStockFixture, resetDb, stockLedgerMismatches } from '../helpers/db';

beforeEach(resetDb);

async function setup(opening = '10') {
  const manager = await makeActor('MANAGER');
  const staff = await makeActor('STAFF');
  const { product, warehouse } = await makeStockFixture();
  const ids = { productId: product.id, warehouseId: warehouse.id };
  if (opening !== '0')
    await adjustStock(manager, { ...ids, quantity: opening, reason: 'Opening balance' });
  return { manager, staff, product, warehouse, ids };
}

describe('stock adjustment (FR-08)', () => {
  it('adds and removes stock, writes a movement and an audit row', async () => {
    const { manager, ids } = await setup('10');
    const res = await adjustStock(manager, {
      ...ids,
      quantity: '-2.5',
      reason: 'Damaged in storage',
    });
    expect(res.onHand.toString()).toBe('7.5');
    expect(await prisma.auditLog.count({ where: { action: 'ADJUSTED' } })).toBe(2);
    expect(await stockLedgerMismatches()).toEqual([]);
  });

  it('is Admin and Manager only', async () => {
    const { staff, ids } = await setup('0');
    await expect(
      adjustStock(staff, { ...ids, quantity: '5', reason: 'Found more' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('needs a reason and a non-zero quantity', async () => {
    const { manager, ids } = await setup('0');
    await expect(adjustStock(manager, { ...ids, quantity: '5', reason: '' })).rejects.toThrow();
    await expect(
      adjustStock(manager, { ...ids, quantity: '0', reason: 'Nothing' }),
    ).rejects.toThrow();
  });

  it('cannot take stock below zero', async () => {
    const { manager, ids } = await setup('3');
    await expect(adjustStock(manager, { ...ids, quantity: '-4', reason: 'Count' })).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('stock issue (FR-08)', () => {
  it('Staff can issue; quantity is stored as a negative movement', async () => {
    const { staff, ids } = await setup('10');
    const res = await issueStock(staff, { ...ids, quantity: '4', reason: 'Site A job 17' });
    expect(res.onHand.toString()).toBe('6');
    expect(res.movement.quantity.toString()).toBe('-4');
    expect(res.movement.type).toBe('ISSUE');
  });

  it('blocks an issue larger than on hand and writes nothing', async () => {
    const { staff, ids } = await setup('5');
    await expect(issueStock(staff, { ...ids, quantity: '6', reason: 'Too much' })).rejects.toThrow(
      /Not enough stock: 5/,
    );
    expect(await prisma.stockMovement.count({ where: { type: 'ISSUE' } })).toBe(0);
    expect((await productStock(staff, ids.productId)).total.toString()).toBe('5');
  });

  it('blocks an issue from a warehouse with no stock row', async () => {
    const { staff, ids } = await setup('0');
    await expect(
      issueStock(staff, { ...ids, quantity: '1', reason: 'Nothing there' }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an inactive warehouse', async () => {
    const { staff, ids, warehouse } = await setup('5');
    await prisma.warehouse.update({ where: { id: warehouse.id }, data: { isActive: false } });
    await expect(issueStock(staff, { ...ids, quantity: '1', reason: 'Job' })).rejects.toThrow(
      /inactive/,
    );
  });

  it('two concurrent issues cannot oversell (rule D7)', async () => {
    const { staff, manager, ids } = await setup('10');
    const results = await Promise.allSettled([
      issueStock(staff, { ...ids, quantity: '6', reason: 'Job 1' }),
      issueStock(manager, { ...ids, quantity: '6', reason: 'Job 2' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await productStock(staff, ids.productId)).total.toString()).toBe('4');
    expect(await stockLedgerMismatches()).toEqual([]);
  });
});

describe('stock levels and ledger (FR-07, FR-09)', () => {
  it('lists levels per warehouse and the ledger newest first with filters', async () => {
    const { manager, staff, ids } = await setup('10');
    await issueStock(staff, { ...ids, quantity: '1', reason: 'Job' });
    const levels = await listStockLevels(staff, {});
    expect(levels.rows[0]?.onHand.toString()).toBe('9');

    const ledger = await productLedger(manager, ids.productId);
    expect(ledger.rows.map((r) => r.type)).toEqual(['ISSUE', 'ADJUSTMENT']);

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect((await productLedger(manager, ids.productId, { from: today, to: today })).total).toBe(2);
    expect((await productLedger(manager, ids.productId, { to: '2000-01-01' })).total).toBe(0);
    expect(
      (await productLedger(manager, ids.productId, { warehouseId: crypto.randomUUID() })).total,
    ).toBe(0);
  });
});
