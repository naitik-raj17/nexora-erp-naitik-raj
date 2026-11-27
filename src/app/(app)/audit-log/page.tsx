import type { Metadata } from 'next';
import { DataTable, RowLink } from '@/components/data-table';
import { controlClass } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatQty, grnLabel, poLabel } from '@/lib/format';
import { param, parsePage } from '@/lib/pagination';
import { AUDIT_ACTIONS, listAuditLog } from '@/server/core/audit';
import { requirePageRole } from '@/server/core/auth';

export const metadata: Metadata = { title: 'Audit log' };

const LABEL: Record<string, string> = {
  CREATED: 'PO created',
  SUBMITTED: 'PO submitted',
  APPROVED: 'PO approved',
  REJECTED: 'PO rejected',
  RECEIVED: 'Goods received',
  CANCELLED: 'PO cancelled',
  ADJUSTED: 'Stock adjusted',
};

type Details = {
  reason?: string;
  grnNumber?: number;
  status?: string;
  quantity?: string;
} | null;

function describe(action: string, d: Details) {
  if (!d) return '';
  if (action === 'REJECTED') return `“${d.reason}”`;
  if (action === 'RECEIVED' && d.grnNumber)
    return `${grnLabel(d.grnNumber)}${d.status === 'RECEIVED' ? ' · fully received' : ''}`;
  if (action === 'ADJUSTED') {
    const q = Number(d.quantity);
    return `${q > 0 ? '+' : ''}${formatQty(d.quantity ?? 0)} · ${d.reason ?? ''}`;
  }
  return '';
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-15: Admin and Manager only. */
export default async function AuditLogPage({ searchParams }: Props) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const sp = await searchParams;
  const filter = { action: param(sp.action), from: param(sp.from), to: param(sp.to) };
  const result = await listAuditLog(actor, { ...filter, page: parsePage(sp.page) });

  return (
    <>
      <PageHeader title="Audit log" description="Every document action, newest first." />
      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <select
          name="action"
          defaultValue={filter.action}
          aria-label="Action"
          className={`${controlClass} max-w-48`}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {LABEL[a]}
            </option>
          ))}
        </select>
        <Input
          type="date"
          name="from"
          defaultValue={filter.from}
          aria-label="From"
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" name="to" defaultValue={filter.to} aria-label="To" className="w-auto" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No audit entries found."
        columns={[
          {
            header: 'When',
            cell: (r) => formatDateTime(r.createdAt),
            className: 'whitespace-nowrap',
          },
          { header: 'Action', cell: (r) => LABEL[r.action] ?? r.action },
          {
            header: 'Document',
            cell: (r) =>
              r.ref?.kind === 'po' ? (
                <RowLink href={`/purchase-orders/${r.ref.id}`}>{poLabel(r.ref.poNumber)}</RowLink>
              ) : r.ref?.kind === 'product' ? (
                <RowLink href={`/products/${r.ref.id}`}>{r.ref.sku}</RowLink>
              ) : (
                r.entity
              ),
          },
          { header: 'User', cell: (r) => r.user.name },
          {
            header: 'Details',
            cell: (r) => describe(r.action, r.details as Details),
            className: 'text-muted-foreground',
          },
        ]}
      />
      <Pagination {...result} params={filter} />
    </>
  );
}
