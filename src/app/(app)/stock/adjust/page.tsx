import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { param } from '@/lib/pagination';
import { requirePageRole } from '@/server/core/auth';
import { productOptions } from '@/server/inventory/products';
import { warehouseOptions } from '@/server/inventory/warehouses';
import { MovementForm } from '../movement-form';

export const metadata: Metadata = { title: 'Adjust stock' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const sp = await searchParams;
  const [products, warehouses] = await Promise.all([
    productOptions(actor),
    warehouseOptions(actor),
  ]);
  return (
    <>
      <PageHeader
        title="Adjust stock"
        description="Correct stock after a count or damage. Every adjustment is audited."
      />
      <MovementForm
        type="ADJUSTMENT"
        products={products}
        warehouses={warehouses}
        defaults={{ productId: param(sp.productId), warehouseId: param(sp.warehouseId) }}
      />
    </>
  );
}
