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
import { listVendors } from '@/server/procurement/vendors';

export const metadata: Metadata = { title: 'Vendors' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VendorsPage({ searchParams }: Props) {
  const actor = await requireUser();
  const canEdit = hasRole(actor, 'ADMIN', 'MANAGER');
  const sp = await searchParams;
  const q = param(sp.q);
  const result = await listVendors(actor, { q, page: parsePage(sp.page) });
  return (
    <>
      <PageHeader
        title="Vendors"
        actions={
          canEdit && (
            <Button asChild>
              <Link href="/vendors/new">New vendor</Link>
            </Button>
          )
        }
      />
      <SearchBox q={q} placeholder="Name, contact or email" />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No vendors found."
        columns={[
          {
            header: 'Name',
            cell: (r) => (canEdit ? <RowLink href={`/vendors/${r.id}`}>{r.name}</RowLink> : r.name),
          },
          { header: 'Contact', cell: (r) => r.contactName ?? '—' },
          { header: 'Email', cell: (r) => r.email ?? '—' },
          { header: 'Phone', cell: (r) => r.phone ?? '—' },
          { header: 'Status', cell: (r) => <ActiveBadge active={r.isActive} /> },
        ]}
      />
      <Pagination {...result} params={{ q }} />
    </>
  );
}
