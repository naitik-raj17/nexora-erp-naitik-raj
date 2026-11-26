import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { VendorForm } from '../vendor-form';

export const metadata: Metadata = { title: 'New vendor' };

export default async function NewVendorPage() {
  await requirePageRole('ADMIN', 'MANAGER');
  return (
    <>
      <PageHeader title="New vendor" />
      <VendorForm />
    </>
  );
}
