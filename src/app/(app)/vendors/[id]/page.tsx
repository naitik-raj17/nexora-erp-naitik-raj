import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { orNotFound } from '@/lib/not-found';
import { requirePageRole } from '@/server/core/auth';
import { getVendor } from '@/server/procurement/vendors';
import { VendorForm } from '../vendor-form';

export const metadata: Metadata = { title: 'Edit vendor' };

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const { id } = await params;
  const vendor = await orNotFound(getVendor(actor, id));
  return (
    <>
      <PageHeader title={vendor.name} />
      <VendorForm vendor={vendor} />
    </>
  );
}
