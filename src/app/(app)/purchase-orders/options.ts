import { productOptions } from '@/server/inventory/products';
import { warehouseOptions } from '@/server/inventory/warehouses';
import { vendorOptions } from '@/server/procurement/vendors';
import type { Actor } from '@/server/core/roles';

/** Select-box options shared by the new and edit PO pages. */
export async function poFormOptions(actor: Actor) {
  const [vendors, warehouses, products] = await Promise.all([
    vendorOptions(actor),
    warehouseOptions(actor),
    productOptions(actor),
  ]);
  return {
    vendors: vendors.map((v) => ({ id: v.id, label: v.name })),
    warehouses: warehouses.map((w) => ({ id: w.id, label: `${w.code} · ${w.name}` })),
    products: products.map((p) => ({
      id: p.id,
      label: `${p.sku} · ${p.name} (${p.unit.toLowerCase()})`,
    })),
  };
}
