import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { CategoryForm } from '../category-form';

export const metadata: Metadata = { title: 'New category' };

export default async function NewCategoryPage() {
  await requirePageRole('ADMIN', 'MANAGER');
  return (
    <>
      <PageHeader title="New category" />
      <CategoryForm />
    </>
  );
}
