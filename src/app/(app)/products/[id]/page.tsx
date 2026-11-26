import type { Metadata } from 'next';
import { ActiveBadge } from '@/components/active-badge';
import { PageHeader } from '@/components/page-header';
import { formatQty } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { requireUser } from '@/server/core/auth';
import { hasRole } from '@/server/core/roles';
import { categoryOptions } from '@/server/inventory/categories';
import { getProduct } from '@/server/inventory/products';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Product' };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const product = await orNotFound(getProduct(actor, id));
  const canEdit = hasRole(actor, 'ADMIN', 'MANAGER');

  return (
    <>
      <PageHeader
        title={`${product.sku} · ${product.name}`}
        description={<ActiveBadge active={product.isActive} />}
      />
      {canEdit ? (
        <ProductForm
          categories={await categoryOptions(actor)}
          product={{
            id: product.id,
            sku: product.sku,
            name: product.name,
            categoryId: product.categoryId,
            unit: product.unit,
            reorderLevel: product.reorderLevel.toString(),
            isActive: product.isActive,
          }}
        />
      ) : (
        <dl className="grid max-w-lg grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Category</dt>
          <dd>{product.category.name}</dd>
          <dt className="text-muted-foreground">Unit</dt>
          <dd>{product.unit.toLowerCase()}</dd>
          <dt className="text-muted-foreground">Reorder level</dt>
          <dd>{formatQty(product.reorderLevel)}</dd>
        </dl>
      )}
    </>
  );
}
