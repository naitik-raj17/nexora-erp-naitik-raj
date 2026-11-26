import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/data-table';
import { controlClass } from '@/components/form';
import { MovementBadge } from '@/components/movement-badge';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatQty, grnLabel } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { param, parsePage } from '@/lib/pagination';
import { requireUser } from '@/server/core/auth';
import { getProduct } from '@/server/inventory/products';
import { productLedger } from '@/server/inventory/stock';
import { warehouseOptions } from '@/server/inventory/warehouses';

export const metadata: Metadata = { title: 'Movement history' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductMovementsPage({ params, searchParams }: Props) {
  const actor = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const filter = { warehouseId: param(sp.warehouseId), from: param(sp.from), to: param(sp.to) };
  const product = await orNotFound(getProduct(actor, id));
  const [ledger, warehouses] = await Promise.all([
    productLedger(actor, id, { ...filter, page: parsePage(sp.page) }),
    warehouseOptions(actor),
  ]);

  return (
    <>
      <PageHeader
        title={`Movement history · ${product.sku}`}
        description={
          <Link href={`/products/${product.id}`} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <select
          name="warehouseId"
          defaultValue={filter.warehouseId}
          aria-label="Warehouse"
          className={`${controlClass} max-w-48`}
        >
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code}
            </option>
          ))}
        </select>
        <label className="grid gap-1 text-xs text-muted-foreground">
          From
          <Input type="date" name="from" defaultValue={filter.from} className="w-40" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          To
          <Input type="date" name="to" defaultValue={filter.to} className="w-40" />
        </label>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <DataTable
        rows={ledger.rows}
        rowKey={(r) => r.id}
        empty="No movements for these filters."
        columns={[
          { header: 'When', cell: (r) => formatDateTime(r.createdAt) },
          { header: 'Type', cell: (r) => <MovementBadge type={r.type} /> },
          { header: 'Warehouse', cell: (r) => r.warehouse.code },
          {
            header: 'Quantity',
            cell: (r) => (r.quantity.isPositive() ? '+' : '') + formatQty(r.quantity),
            className: 'text-right tabular-nums',
          },
          {
            header: 'Reference',
            cell: (r) => {
              const grn = r.goodsReceiptLine?.goodsReceipt;
              return grn ? (
                <Link
                  href={`/purchase-orders/${grn.purchaseOrderId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {grnLabel(grn.grnNumber)}
                </Link>
              ) : (
                r.reason
              );
            },
          },
          { header: 'By', cell: (r) => r.createdBy.name },
        ]}
      />
      <Pagination {...ledger} params={filter} />
    </>
  );
}
