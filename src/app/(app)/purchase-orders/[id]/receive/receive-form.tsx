'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Field, FormAlert, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initialState } from '@/lib/action-state';
import { formatQty } from '@/lib/format';
import { qtyField } from '@/lib/schemas/procurement';
import { receiveGoodsAction } from '../../actions';

type Line = {
  id: string;
  product: string;
  unit: string;
  ordered: string;
  received: string;
  outstanding: string;
};

/** FR-12: quantities are pre-filled with what is outstanding and can be reduced (0 skips a line). */
export function ReceiveForm({
  poId,
  today,
  lines,
}: {
  poId: string;
  today: string;
  lines: Line[];
}) {
  const [state, action] = useActionState(receiveGoodsAction.bind(null, poId), initialState);
  const open = lines.filter((l) => Number(l.outstanding) > 0);

  return (
    <form action={action} className="grid max-w-4xl gap-6">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="receivedOn"
          label="Received on"
          type="date"
          defaultValue={today}
          max={today}
          required
          state={state}
        />
        <Field name="notes" label="Notes" placeholder="Delivery note, carrier…" state={state} />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Ordered</th>
              <th className="px-3 py-2 text-right font-medium">Received</th>
              <th className="px-3 py-2 text-right font-medium">Outstanding</th>
              <th className="w-40 px-3 py-2 font-medium">Receive now</th>
            </tr>
          </thead>
          <tbody>
            {open.map((l) => {
              const name = qtyField(l.id);
              const errors = state.fieldErrors?.[name];
              return (
                <tr key={l.id} className="border-t align-top">
                  <td className="px-3 py-2">{l.product}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatQty(l.ordered)} {l.unit}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(l.received)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(l.outstanding)}</td>
                  <td className="px-3 py-2">
                    <Input
                      name={name}
                      aria-label={`Receive now: ${l.product}`}
                      inputMode="decimal"
                      defaultValue={l.outstanding}
                      aria-invalid={errors ? true : undefined}
                      className="text-right"
                    />
                    {errors?.map((e) => (
                      <p key={e} className="mt-1 text-xs text-destructive">
                        {e}
                      </p>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state.fieldErrors?.lines?.map((e) => (
        <p key={e} className="-mt-4 text-xs text-destructive">
          {e}
        </p>
      ))}

      <div className="flex gap-2">
        <SubmitButton>Record receipt</SubmitButton>
        <Button asChild variant="outline">
          <Link href={`/purchase-orders/${poId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
