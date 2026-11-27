import type { Metadata } from 'next';
import Link from 'next/link';
import type { PoStatus } from '@prisma/client';
import { DataTable, RowLink } from '@/components/data-table';
import { controlClass } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { PoStatusBadge, poStatusLabel } from '@/components/po-status-badge';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney, poLabel } from '@/lib/format';
import { param, parsePage } from '@/lib/pagination';
import { PO_STATUSES } from '@/lib/schemas/procurement';
import { requireUser } from '@/server/core/auth';
import { listPurchaseOrders } from '@/server/procurement/purchase-orders';
import { vendorOptions } from '@/server/procurement/vendors';

export const metadata: Metadata = { title: 'Purchase orders' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PurchaseOrdersPage({ searchParams }: Props) {
  const actor = await requireUser();
  const sp = await searchParams;
  const filter = {
    q: param(sp.q),
    status: param(sp.status),
    vendorId: param(sp.vendorId),
    mine: param(sp.mine),
  };
  const [result, vendors] = await Promise.all([
    listPurchaseOrders(actor, { ...filter, mine: filter.mine === '1', page: parsePage(sp.page) }),
    vendorOptions(actor),
  ]);

  return (
    <>
      <PageHeader
        title="Purchase orders"
        actions={
          <Button asChild>
            <Link href="/purchase-orders/new">New purchase order</Link>
          </Button>
        }
      />
      <SearchBox q={filter.q} placeholder="PO number or vendor">
        <select
          name="status"
          defaultValue={filter.status}
          aria-label="Status"
          className={`${controlClass} max-w-44`}
        >
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {poStatusLabel(s as PoStatus)}
            </option>
          ))}
        </select>
        <select
          name="vendorId"
          defaultValue={filter.vendorId}
          aria-label="Vendor"
          className={`${controlClass} max-w-52`}
        >
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={filter.mine === '1'}
            className="size-4"
          />
          Mine only
        </label>
      </SearchBox>
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No purchase orders found."
        columns={[
          {
            header: 'PO',
            cell: (r) => <RowLink href={`/purchase-orders/${r.id}`}>{poLabel(r.poNumber)}</RowLink>,
          },
          { header: 'Vendor', cell: (r) => r.vendor.name },
          { header: 'Deliver to', cell: (r) => r.warehouse.code },
          { header: 'Status', cell: (r) => <PoStatusBadge status={r.status} /> },
          { header: 'Lines', cell: (r) => r.lineCount, className: 'text-right tabular-nums' },
          {
            header: 'Total',
            cell: (r) => formatMoney(r.total),
            className: 'text-right tabular-nums',
          },
          { header: 'Expected', cell: (r) => formatDate(r.expectedDate) },
          { header: 'Created by', cell: (r) => r.createdBy.name },
        ]}
      />
      <Pagination {...result} params={filter} />
    </>
  );
}
