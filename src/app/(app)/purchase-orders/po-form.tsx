'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Field, FormAlert, SelectField, SubmitButton, controlClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initialState } from '@/lib/action-state';
import { savePoAction } from './actions';

type Option = { id: string; label: string };
type Line = { key: number; productId: string; quantity: string; unitPrice: string };

export type PoFormValues = {
  id: string;
  vendorId: string;
  warehouseId: string;
  expectedDate: string;
  notes: string;
  lines: Omit<Line, 'key'>[];
};

let nextKey = 1;
const blank = (): Line => ({ key: nextKey++, productId: '', quantity: '', unitPrice: '' });

export function PoForm({
  po,
  vendors,
  warehouses,
  products,
}: {
  po?: PoFormValues;
  vendors: Option[];
  warehouses: Option[];
  products: Option[];
}) {
  const [state, action] = useActionState(savePoAction.bind(null, po?.id ?? null), initialState);
  const [lines, setLines] = useState<Line[]>(() =>
    po?.lines.length ? po.lines.map((l) => ({ ...l, key: nextKey++ })) : [blank()],
  );
  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  // Display only; the server recalculates totals with exact decimals.
  const total = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const payload = JSON.stringify(
    lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
  );

  return (
    <form action={action} className="grid max-w-4xl gap-6">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="vendorId"
          label="Vendor"
          state={state}
          required
          placeholder="Choose a vendor"
          defaultValue={po?.vendorId}
          options={vendors.map((v) => ({ value: v.id, label: v.label }))}
        />
        <SelectField
          name="warehouseId"
          label="Deliver to"
          state={state}
          required
          placeholder="Choose a warehouse"
          defaultValue={po?.warehouseId}
          options={warehouses.map((w) => ({ value: w.id, label: w.label }))}
        />
        <Field
          name="expectedDate"
          label="Expected date"
          type="date"
          defaultValue={po?.expectedDate}
          state={state}
        />
        <Field name="notes" label="Notes" defaultValue={po?.notes} state={state} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Lines</legend>
        <input type="hidden" name="lines" value={payload} />
        <div className="hidden grid-cols-[1fr_8rem_8rem_8rem_auto] gap-2 text-xs text-muted-foreground sm:grid">
          <span>Product</span>
          <span>Quantity</span>
          <span>Unit price (₹)</span>
          <span className="text-right">Line total</span>
          <span className="w-16" />
        </div>
        {lines.map((l, i) => (
          <div
            key={l.key}
            className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_8rem_auto] sm:items-center"
          >
            <select
              aria-label={`Line ${i + 1} product`}
              value={l.productId}
              onChange={(e) => update(l.key, { productId: e.target.value })}
              className={controlClass}
              required
            >
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Line ${i + 1} quantity`}
              inputMode="decimal"
              placeholder="Qty"
              value={l.quantity}
              onChange={(e) => update(l.key, { quantity: e.target.value })}
              required
            />
            <Input
              aria-label={`Line ${i + 1} unit price`}
              inputMode="decimal"
              placeholder="Price"
              value={l.unitPrice}
              onChange={(e) => update(l.key, { unitPrice: e.target.value })}
              required
            />
            <span className="text-right text-sm tabular-nums">
              {((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)).toFixed(2)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-16"
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
            >
              Remove
            </Button>
          </div>
        ))}
        {state.fieldErrors?.lines?.map((e) => (
          <p key={e} className="text-xs text-destructive">
            {e}
          </p>
        ))}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((ls) => [...ls, blank()])}
          >
            Add line
          </Button>
          <p className="text-sm">
            Total <span className="font-semibold tabular-nums">₹{total.toFixed(2)}</span>
          </p>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" variant="outline">
          Save draft
        </SubmitButton>
        <SubmitButton name="intent" value="submit">
          Save and submit for approval
        </SubmitButton>
        <Button asChild variant="ghost">
          <Link href={po ? `/purchase-orders/${po.id}` : '/purchase-orders'}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
