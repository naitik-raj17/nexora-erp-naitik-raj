import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PoStatusBadge } from '@/components/po-status-badge';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatQty,
  grnLabel,
  poLabel,
} from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { requireUser } from '@/server/core/auth';
import { canApprovePo, canCancelPo, canEditPo, canReceivePo } from '@/server/procurement/po-rules';
import { getPurchaseOrder } from '@/server/procurement/purchase-orders';
import { PoActions } from './po-actions';

export const metadata: Metadata = { title: 'Purchase order' };

const ACTION_LABEL: Record<string, string> = {
  CREATED: 'Created',
  SUBMITTED: 'Submitted for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RECEIVED: 'Goods received',
  CANCELLED: 'Cancelled',
};

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const po = await orNotFound(getPurchaseOrder(actor, id));
  const can = {
    edit: canEditPo(actor, po),
    approve: canApprovePo(actor, po),
    cancel: canCancelPo(actor, po),
    receive: canReceivePo(po),
  };
  const last = po.history.at(-1);
  const rejection =
    po.status === 'DRAFT' && last?.action === 'REJECTED'
      ? (last.details as { reason?: string } | null)?.reason
      : null;
  const ownAwaiting =
    po.status === 'SUBMITTED' && po.createdById === actor.id && actor.role !== 'STAFF';

  return (
    <>
      <PageHeader
        title={poLabel(po.poNumber)}
        description={
          <span className="flex items-center gap-2">
            <PoStatusBadge status={po.status} /> {po.vendor.name}
          </span>
        }
      />

      {rejection && (
        <p
          role="status"
          className="mb-4 max-w-3xl rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Returned to draft by {last?.user.name}: “{rejection}”
        </p>
      )}
      {ownAwaiting && (
        <p className="mb-4 text-sm text-muted-foreground">
          You created this PO, so another Admin or Manager must approve it.
        </p>
      )}

      <div className="mb-6">
        <PoActions id={po.id} can={can} />
      </div>

      <dl className="mb-8 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr_9rem_1fr]">
        <dt className="text-muted-foreground">Vendor</dt>
        <dd>{po.vendor.name}</dd>
        <dt className="text-muted-foreground">Deliver to</dt>
        <dd>
          {po.warehouse.code} · {po.warehouse.name}
        </dd>
        <dt className="text-muted-foreground">Expected</dt>
        <dd>{formatDate(po.expectedDate)}</dd>
        <dt className="text-muted-foreground">Created by</dt>
        <dd>
          {po.createdBy.name}, {formatDate(po.createdAt)}
        </dd>
        <dt className="text-muted-foreground">Approved by</dt>
        <dd>{po.approvedBy ? `${po.approvedBy.name}, ${formatDate(po.approvedAt)}` : '—'}</dd>
        <dt className="text-muted-foreground">Notes</dt>
        <dd>{po.notes ?? '—'}</dd>
      </dl>

      <h2 className="mb-2 text-sm font-medium">Lines</h2>
      <DataTable
        rows={po.lines}
        rowKey={(l) => l.id}
        columns={[
          {
            header: 'Product',
            cell: (l) => (
              <Link
                href={`/products/${l.product.id}`}
                className="underline-offset-4 hover:underline"
              >
                {l.product.sku} · {l.product.name}
              </Link>
            ),
          },
          {
            header: 'Ordered',
            cell: (l) => `${formatQty(l.quantity)} ${l.product.unit.toLowerCase()}`,
            className: 'text-right tabular-nums',
          },
          {
            header: 'Received',
            cell: (l) => formatQty(l.received),
            className: 'text-right tabular-nums',
          },
          {
            header: 'Unit price',
            cell: (l) => formatMoney(l.unitPrice),
            className: 'text-right tabular-nums',
          },
          {
            header: 'Line total',
            cell: (l) => formatMoney(l.lineTotal),
            className: 'text-right tabular-nums',
          },
        ]}
      />
      <p className="mt-2 mb-8 text-right text-sm">
        Total <span className="font-semibold tabular-nums">{formatMoney(po.total)}</span>
      </p>

      {po.goodsReceipts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium">Goods receipts</h2>
          <ul className="space-y-1 text-sm">
            {po.goodsReceipts.map((g) => (
              <li key={g.id}>
                <span className="font-medium">{grnLabel(g.grnNumber)}</span> ·{' '}
                {formatDate(g.receivedOn)} · {g.receivedBy.name} ·{' '}
                <span className="text-muted-foreground">
                  {g.lines
                    .map((gl) => `${gl.purchaseOrderLine.product.sku} × ${formatQty(gl.quantity)}`)
                    .join(', ')}
                </span>
                {g.notes && <span className="text-muted-foreground"> · {g.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium">History</h2>
        <ol className="space-y-1 border-l pl-4 text-sm">
          {po.history.map((h) => (
            <li key={h.id.toString()}>
              <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span> by{' '}
              {h.user.name}
              <span className="text-muted-foreground"> · {formatDateTime(h.createdAt)}</span>
              {h.action === 'RECEIVED' && (
                <span className="text-muted-foreground">
                  {' '}
                  · {grnLabel((h.details as { grnNumber: number }).grnNumber)}
                </span>
              )}
              {h.action === 'REJECTED' && (
                <span className="text-muted-foreground">
                  {' '}
                  · “{(h.details as { reason?: string } | null)?.reason}”
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
