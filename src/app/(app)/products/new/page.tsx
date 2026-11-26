import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { categoryOptions } from '@/server/inventory/categories';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  return (
    <>
      <PageHeader title="New product" />
      <ProductForm categories={await categoryOptions(actor)} />
    </>
  );
}
