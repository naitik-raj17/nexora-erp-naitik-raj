import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { orNotFound } from '@/lib/not-found';
import { requirePageRole } from '@/server/core/auth';
import { getWarehouse } from '@/server/inventory/warehouses';
import { WarehouseForm } from '../warehouse-form';

export const metadata: Metadata = { title: 'Edit warehouse' };

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const { id } = await params;
  const warehouse = await orNotFound(getWarehouse(actor, id));
  return (
    <>
      <PageHeader title={warehouse.name} />
      <WarehouseForm warehouse={warehouse} />
    </>
  );
}
