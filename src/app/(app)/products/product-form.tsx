'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ActiveField, Field, FormAlert, SelectField, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { UNITS } from '@/lib/schemas/inventory';
import { saveProductAction } from './actions';

export type ProductFormValues = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: string;
  reorderLevel: string;
  isActive: boolean;
};

export function ProductForm({
  product,
  categories,
}: {
  product?: ProductFormValues;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(
    saveProductAction.bind(null, product?.id ?? null),
    initialState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <Field name="sku" label="SKU" defaultValue={product?.sku} required state={state} />
      <Field name="name" label="Name" defaultValue={product?.name} required state={state} />
      <SelectField
        name="categoryId"
        label="Category"
        state={state}
        required
        placeholder="Choose a category"
        defaultValue={product?.categoryId}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          name="unit"
          label="Unit"
          state={state}
          defaultValue={product?.unit ?? 'PCS'}
          options={UNITS.map((u) => ({ value: u, label: u.toLowerCase() }))}
        />
        <Field
          name="reorderLevel"
          label="Reorder level"
          inputMode="decimal"
          defaultValue={product?.reorderLevel ?? '0'}
          required
          state={state}
        />
      </div>
      <ActiveField defaultChecked={product?.isActive ?? true} />
      <div className="flex gap-2">
        <SubmitButton>{product ? 'Save changes' : 'Create product'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/products">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
