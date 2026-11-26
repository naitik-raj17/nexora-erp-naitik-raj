import { beforeEach, describe, expect, it } from 'vitest';
import { createCategory, updateCategory } from '@/server/inventory/categories';
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '@/server/inventory/products';
import { createWarehouse, warehouseOptions } from '@/server/inventory/warehouses';
import { createVendor, listVendors, updateVendor } from '@/server/procurement/vendors';
import { ForbiddenError, NotFoundError, ValidationError } from '@/server/errors';
import { makeActor, resetDb } from '../helpers/db';

beforeEach(resetDb);

const product = (categoryId: string, over: Record<string, string> = {}) => ({
  sku: 'abc-1',
  name: 'Widget',
  categoryId,
  unit: 'PCS',
  reorderLevel: '10',
  ...over,
});

describe('master data permissions (FR-03 matrix)', () => {
  it('Staff can read but not create or edit', async () => {
    const manager = await makeActor('MANAGER');
    const staff = await makeActor('STAFF');
    const cat = await createCategory(manager, { name: 'Tools' });
    await expect(createCategory(staff, { name: 'X' })).rejects.toThrow(ForbiddenError);
    await expect(createWarehouse(staff, { code: 'W1', name: 'W' })).rejects.toThrow(ForbiddenError);
    await expect(createVendor(staff, { name: 'V' })).rejects.toThrow(ForbiddenError);
    await expect(createProduct(staff, product(cat.id))).rejects.toThrow(ForbiddenError);
    await expect(listProducts(staff, {})).resolves.toMatchObject({ total: 0 });
  });
});

describe('products (FR-04)', () => {
  it('upper-cases SKUs and rejects duplicates', async () => {
    const admin = await makeActor('ADMIN');
    const cat = await createCategory(admin, { name: 'Tools' });
    const p = await createProduct(admin, product(cat.id));
    expect(p.sku).toBe('ABC-1');
    await expect(createProduct(admin, product(cat.id, { sku: 'ABC-1' }))).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects a negative or badly formatted reorder level', async () => {
    const admin = await makeActor('ADMIN');
    const cat = await createCategory(admin, { name: 'Tools' });
    await expect(createProduct(admin, product(cat.id, { reorderLevel: '-1' }))).rejects.toThrow();
    await expect(
      createProduct(admin, product(cat.id, { reorderLevel: '1.2345' })),
    ).rejects.toThrow();
  });

  it('searches by SKU or name, filters by category and paginates by 25', async () => {
    const admin = await makeActor('ADMIN');
    const a = await createCategory(admin, { name: 'A' });
    const b = await createCategory(admin, { name: 'B' });
    for (let i = 0; i < 30; i++) {
      await createProduct(
        admin,
        product(i % 2 ? a.id : b.id, { sku: `SKU-${i}`, name: i === 7 ? 'Hammer' : `Item ${i}` }),
      );
    }
    const page1 = await listProducts(admin, {});
    expect(page1.rows).toHaveLength(25);
    expect(page1.pageCount).toBe(2);
    expect((await listProducts(admin, { page: 2 })).rows).toHaveLength(5);
    expect((await listProducts(admin, { q: 'hammer' })).rows.map((r) => r.sku)).toEqual(['SKU-7']);
    expect((await listProducts(admin, { q: 'sku-1' })).total).toBe(11); // SKU-1, SKU-10..19
    expect((await listProducts(admin, { categoryId: a.id })).total).toBe(15);
  });

  it('can be deactivated and treats unknown ids as not found', async () => {
    const admin = await makeActor('ADMIN');
    const cat = await createCategory(admin, { name: 'Tools' });
    const p = await createProduct(admin, product(cat.id));
    const updated = await updateProduct(admin, p.id, { ...product(cat.id), isActive: 'false' });
    expect(updated.isActive).toBe(false);
    await expect(getProduct(admin, 'not-a-uuid')).rejects.toThrow(NotFoundError);
    await expect(updateProduct(admin, crypto.randomUUID(), product(cat.id))).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('categories, warehouses, vendors (FR-05, FR-06)', () => {
  it('category names are unique', async () => {
    const admin = await makeActor('ADMIN');
    const c = await createCategory(admin, { name: 'Tools' });
    await createCategory(admin, { name: 'Paint' });
    await expect(updateCategory(admin, c.id, { name: 'Paint' })).rejects.toThrow(ValidationError);
  });

  it('warehouse options list active warehouses only', async () => {
    const admin = await makeActor('ADMIN');
    await createWarehouse(admin, { code: 'wh-a', name: 'A' });
    await createWarehouse(admin, { code: 'WH-B', name: 'B', isActive: 'false' });
    expect((await warehouseOptions(admin)).map((w) => w.code)).toEqual(['WH-A']);
  });

  it('vendor email is optional but must be valid; search covers contact and email', async () => {
    const admin = await makeActor('ADMIN');
    const v = await createVendor(admin, { name: 'Acme', contactName: 'Ravi', email: '' });
    expect(v.email).toBeNull();
    await expect(createVendor(admin, { name: 'Bad', email: 'nope' })).rejects.toThrow();
    await updateVendor(admin, v.id, { name: 'Acme', contactName: 'Ravi', email: 'Sales@Acme.in' });
    expect((await listVendors(admin, { q: 'sales@' })).rows[0]?.email).toBe('sales@acme.in');
    expect((await listVendors(admin, { q: 'ravi' })).total).toBe(1);
  });
});
