import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable, RowLink } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { param, parsePage } from '@/lib/pagination';
import { requirePageRole } from '@/server/core/auth';
import { listCategories } from '@/server/inventory/categories';

export const metadata: Metadata = { title: 'Categories' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CategoriesPage({ searchParams }: Props) {
  const actor = await requirePageRole('ADMIN', 'MANAGER');
  const sp = await searchParams;
  const q = param(sp.q);
  const result = await listCategories(actor, { q, page: parsePage(sp.page) });
  return (
    <>
      <PageHeader
        title="Categories"
        description="Groups for products."
        actions={
          <Button asChild>
            <Link href="/categories/new">New category</Link>
          </Button>
        }
      />
      <SearchBox q={q} placeholder="Category name" />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No categories found."
        columns={[
          { header: 'Name', cell: (r) => <RowLink href={`/categories/${r.id}`}>{r.name}</RowLink> },
          {
            header: 'Products',
            cell: (r) => r._count.products,
            className: 'text-right tabular-nums',
          },
        ]}
      />
      <Pagination {...result} params={{ q }} />
    </>
  );
}
