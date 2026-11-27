import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { poLabel } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { requireUser } from '@/server/core/auth';
import { canReceivePo } from '@/server/procurement/po-rules';
import { getPurchaseOrder } from '@/server/procurement/purchase-orders';
import { ReceiveForm } from './receive-form';

export const metadata: Metadata = { title: 'Receive goods' };

export default async function ReceiveGoodsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const po = await orNotFound(getPurchaseOrder(actor, id));
  if (!canReceivePo(po)) redirect(`/purchase-orders/${id}`);

  return (
    <>
      <PageHeader
        title={`Receive goods · ${poLabel(po.poNumber)}`}
        description={`${po.vendor.name} → ${po.warehouse.code} · ${po.warehouse.name}`}
      />
      <ReceiveForm
        poId={po.id}
        today={new Date().toISOString().slice(0, 10)}
        lines={po.lines.map((l) => ({
          id: l.id,
          product: `${l.product.sku} · ${l.product.name}`,
          unit: l.product.unit.toLowerCase(),
          ordered: l.quantity.toString(),
          received: l.received.toString(),
          outstanding: l.quantity.minus(l.received).toString(),
        }))}
      />
    </>
  );
}
