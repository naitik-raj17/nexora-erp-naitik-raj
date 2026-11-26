'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Field, FormAlert, SelectField, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { recordMovementAction } from './actions';

type Props = {
  type: 'ISSUE' | 'ADJUSTMENT';
  products: { id: string; sku: string; name: string; unit: string }[];
  warehouses: { id: string; code: string; name: string }[];
  defaults?: { productId?: string; warehouseId?: string };
};

export function MovementForm({ type, products, warehouses, defaults }: Props) {
  const [state, action] = useActionState(recordMovementAction.bind(null, type), initialState);
  const issue = type === 'ISSUE';
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <SelectField
        name="productId"
        label="Product"
        state={state}
        required
        placeholder="Choose a product"
        defaultValue={defaults?.productId}
        options={products.map((p) => ({
          value: p.id,
          label: `${p.sku} · ${p.name} (${p.unit.toLowerCase()})`,
        }))}
      />
      <SelectField
        name="warehouseId"
        label="Warehouse"
        state={state}
        required
        placeholder="Choose a warehouse"
        defaultValue={defaults?.warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))}
      />
      <Field
        name="quantity"
        label="Quantity"
        inputMode="decimal"
        required
        hint={issue ? 'Quantity going out.' : 'Positive adds stock, negative removes it (e.g. -2).'}
        state={state}
      />
      <Field
        name="reason"
        label="Reason"
        required
        hint={issue ? 'e.g. job number or department' : 'e.g. stock count, damage'}
        state={state}
      />
      <div className="flex gap-2">
        <SubmitButton>{issue ? 'Issue stock' : 'Save adjustment'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/stock">Back to stock</Link>
        </Button>
      </div>
    </form>
  );
}
