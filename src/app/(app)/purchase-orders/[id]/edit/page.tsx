import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { poLabel } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { requireUser } from '@/server/core/auth';
import { canEditPo } from '@/server/procurement/po-rules';
import { getPurchaseOrder } from '@/server/procurement/purchase-orders';
import { poFormOptions } from '../../options';
import { PoForm } from '../../po-form';

export const metadata: Metadata = { title: 'Edit purchase order' };

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const po = await orNotFound(getPurchaseOrder(actor, id));
  if (!canEditPo(actor, po)) redirect(`/purchase-orders/${id}`);

  return (
    <>
      <PageHeader title={`Edit ${poLabel(po.poNumber)}`} />
      <PoForm
        {...await poFormOptions(actor)}
        po={{
          id: po.id,
          vendorId: po.vendorId,
          warehouseId: po.warehouseId,
          expectedDate: po.expectedDate?.toISOString().slice(0, 10) ?? '',
          notes: po.notes ?? '',
          lines: po.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity.toString(),
            unitPrice: l.unitPrice.toString(),
          })),
        }}
      />
    </>
  );
}
