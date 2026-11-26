import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { WarehouseForm } from '../warehouse-form';

export const metadata: Metadata = { title: 'New warehouse' };

export default async function NewWarehousePage() {
  await requirePageRole('ADMIN', 'MANAGER');
  return (
    <>
      <PageHeader title="New warehouse" />
      <WarehouseForm />
    </>
  );
}
