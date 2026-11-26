import type { Metadata } from 'next';
import Link from 'next/link';
import { ActiveBadge } from '@/components/active-badge';
import { DataTable, RowLink } from '@/components/data-table';
import { controlClass } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/lib/format';
import { param, parsePage } from '@/lib/pagination';
import { requireUser } from '@/server/core/auth';
import { hasRole } from '@/server/core/roles';
import { categoryOptions } from '@/server/inventory/categories';
import { listProducts } from '@/server/inventory/products';

export const metadata: Metadata = { title: 'Products' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProductsPage({ searchParams }: Props) {
  const actor = await requireUser();
  const canEdit = hasRole(actor, 'ADMIN', 'MANAGER');
  const sp = await searchParams;
  const q = param(sp.q);
  const categoryId = param(sp.categoryId);
  const [result, categories] = await Promise.all([
    listProducts(actor, { q, categoryId, page: parsePage(sp.page) }),
    categoryOptions(actor),
  ]);
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          canEdit && (
            <Button asChild>
              <Link href="/products/new">New product</Link>
            </Button>
          )
        }
      />
      <SearchBox q={q} placeholder="SKU or name">
        <select
          name="categoryId"
          defaultValue={categoryId}
          aria-label="Category"
          className={`${controlClass} max-w-48`}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </SearchBox>
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No products found."
        columns={[
          { header: 'SKU', cell: (r) => <RowLink href={`/products/${r.id}`}>{r.sku}</RowLink> },
          { header: 'Name', cell: (r) => r.name },
          { header: 'Category', cell: (r) => r.category.name },
          { header: 'Unit', cell: (r) => r.unit.toLowerCase() },
          {
            header: 'Reorder level',
            cell: (r) => formatQty(r.reorderLevel),
            className: 'text-right tabular-nums',
          },
          { header: 'Status', cell: (r) => <ActiveBadge active={r.isActive} /> },
        ]}
      />
      <Pagination {...result} params={{ q, categoryId }} />
    </>
  );
}
