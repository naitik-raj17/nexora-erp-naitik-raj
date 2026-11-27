import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/server/core/auth';
import { poFormOptions } from '../options';
import { PoForm } from '../po-form';

export const metadata: Metadata = { title: 'New purchase order' };

export default async function NewPurchaseOrderPage() {
  const actor = await requireUser();
  return (
    <>
      <PageHeader
        title="New purchase order"
        description="Saved as a draft until you submit it for approval."
      />
      <PoForm {...await poFormOptions(actor)} />
    </>
  );
}
