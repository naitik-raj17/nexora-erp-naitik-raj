import type { Metadata } from 'next';
import Link from 'next/link';
import { ActiveBadge } from '@/components/active-badge';
import { DataTable, RowLink } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { param, parsePage } from '@/lib/pagination';
import { requireUser } from '@/server/core/auth';
import { hasRole } from '@/server/core/roles';
import { listWarehouses } from '@/server/inventory/warehouses';

export const metadata: Metadata = { title: 'Warehouses' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WarehousesPage({ searchParams }: Props) {
  const actor = await requireUser();
  const canEdit = hasRole(actor, 'ADMIN', 'MANAGER');
  const sp = await searchParams;
  const q = param(sp.q);
  const result = await listWarehouses(actor, { q, page: parsePage(sp.page) });
  return (
    <>
      <PageHeader
        title="Warehouses"
        actions={
          canEdit && (
            <Button asChild>
              <Link href="/warehouses/new">New warehouse</Link>
            </Button>
          )
        }
      />
      <SearchBox q={q} placeholder="Code or name" />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No warehouses found."
        columns={[
          {
            header: 'Code',
            cell: (r) =>
              canEdit ? <RowLink href={`/warehouses/${r.id}`}>{r.code}</RowLink> : r.code,
          },
          { header: 'Name', cell: (r) => r.name },
          { header: 'Address', cell: (r) => r.address ?? '—' },
          { header: 'Status', cell: (r) => <ActiveBadge active={r.isActive} /> },
        ]}
      />
      <Pagination {...result} params={{ q }} />
    </>
  );
}
