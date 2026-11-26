import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { orNotFound } from '@/lib/not-found';
import { requirePageRole } from '@/server/core/auth';
import { getCategory } from '@/server/inventory/categories';
import { CategoryForm } from '../category-form';

export const metadata: Metadata = { title: 'Edit category' };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const { id } = await params;
  const category = await orNotFound(getCategory(actor, id));
  return (
    <>
      <PageHeader title={category.name} />
      <CategoryForm category={category} />
    </>
  );
}
