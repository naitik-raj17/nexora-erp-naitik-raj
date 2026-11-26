import type { Metadata } from 'next';
import Link from 'next/link';
import { ActiveBadge } from '@/components/active-badge';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { requireUser } from '@/server/core/auth';
import { hasRole } from '@/server/core/roles';
import { categoryOptions } from '@/server/inventory/categories';
import { getProduct } from '@/server/inventory/products';
import { productStock } from '@/server/inventory/stock';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Product' };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const product = await orNotFound(getProduct(actor, id));
  const canEdit = hasRole(actor, 'ADMIN', 'MANAGER');
  const stock = await productStock(actor, id);
  const unit = product.unit.toLowerCase();

  return (
    <>
      <PageHeader
        title={`${product.sku} · ${product.name}`}
        description={<ActiveBadge active={product.isActive} />}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/products/${product.id}/movements`}>Movement history</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/stock/issue?productId=${product.id}`}>Issue</Link>
            </Button>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/stock/adjust?productId=${product.id}`}>Adjust</Link>
              </Button>
            )}
          </>
        }
      />
      <section className="mb-8 max-w-lg">
        <h2 className="mb-2 text-sm font-medium">Stock on hand</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 rounded-md border p-3 text-sm tabular-nums">
          {stock.levels.map((l) => (
            <div key={l.warehouseId} className="contents">
              <dt className="text-muted-foreground">
                {l.warehouse.code} · {l.warehouse.name}
              </dt>
              <dd className="text-right">
                {formatQty(l.onHand)} {unit}
              </dd>
            </div>
          ))}
          <dt className="border-t pt-1 font-medium">Total</dt>
          <dd className="border-t pt-1 text-right font-medium">
            {formatQty(stock.total)} {unit}
            {stock.total.lte(product.reorderLevel) && (
              <span className="ml-2 text-destructive">low</span>
            )}
          </dd>
        </dl>
      </section>
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
