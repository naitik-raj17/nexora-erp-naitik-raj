import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable, RowLink } from '@/components/data-table';
import { controlClass } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatQty } from '@/lib/format';
import { param, parsePage } from '@/lib/pagination';
import { requireUser } from '@/server/core/auth';
import { hasRole } from '@/server/core/roles';
import { listStockLevels } from '@/server/inventory/stock';
import { warehouseOptions } from '@/server/inventory/warehouses';

export const metadata: Metadata = { title: 'Stock levels' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function StockPage({ searchParams }: Props) {
  const actor = await requireUser();
  const sp = await searchParams;
  const q = param(sp.q);
  const warehouseId = param(sp.warehouseId);
  const [result, warehouses] = await Promise.all([
    listStockLevels(actor, { q, warehouseId, page: parsePage(sp.page) }),
    warehouseOptions(actor),
  ]);

  return (
    <>
      <PageHeader
        title="Stock levels"
        description="On hand per product and warehouse."
        actions={
          <>
            <Button asChild>
              <Link href="/stock/issue">Issue stock</Link>
            </Button>
            {hasRole(actor, 'ADMIN', 'MANAGER') && (
              <Button asChild variant="outline">
                <Link href="/stock/adjust">Adjust stock</Link>
              </Button>
            )}
          </>
        }
      />
      <SearchBox q={q} placeholder="SKU or product name">
        <select
          name="warehouseId"
          defaultValue={warehouseId}
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
      </SearchBox>
      <DataTable
        rows={result.rows}
        rowKey={(r) => `${r.productId}:${r.warehouseId}`}
        empty="No stock recorded yet."
        columns={[
          {
            header: 'SKU',
            cell: (r) => <RowLink href={`/products/${r.product.id}`}>{r.product.sku}</RowLink>,
          },
          { header: 'Product', cell: (r) => r.product.name },
          { header: 'Warehouse', cell: (r) => r.warehouse.code },
          {
            header: 'On hand',
            cell: (r) => `${formatQty(r.onHand)} ${r.product.unit.toLowerCase()}`,
            className: 'text-right tabular-nums',
          },
          {
            header: 'Updated',
            cell: (r) => formatDateTime(r.updatedAt),
            className: 'text-muted-foreground',
          },
          {
            header: 'Ledger',
            cell: (r) => (
              <Link
                href={`/products/${r.product.id}/movements?warehouseId=${r.warehouseId}`}
                className="text-sm underline-offset-4 hover:underline"
              >
                History
              </Link>
            ),
          },
        ]}
      />
      <Pagination {...result} params={{ q, warehouseId }} />
    </>
  );
}
