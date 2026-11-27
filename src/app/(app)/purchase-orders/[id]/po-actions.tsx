'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Field, FormAlert, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { transitionPoAction } from '../actions';

type Props = {
  id: string;
  can: { edit: boolean; approve: boolean; cancel: boolean };
};

/** The buttons a user may use on this PO; the server checks every one again. */
export function PoActions({ id, can }: Props) {
  const [state, run] = useActionState(transitionPoAction.bind(null, id), initialState);
  // Shown even when no buttons remain (e.g. right after cancelling).
  const alert = <FormAlert state={state} />;
  if (!can.edit && !can.approve && !can.cancel) return alert;

  return (
    <div className="grid gap-3">
      {alert}
      <form
        action={run}
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          const t = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
          if (t === 'cancel' && !confirm('Cancel this purchase order? This cannot be undone.'))
            e.preventDefault();
        }}
      >
        {can.edit && (
          <>
            <Button asChild variant="outline">
              <Link href={`/purchase-orders/${id}/edit`}>Edit</Link>
            </Button>
            <SubmitButton name="transition" value="submit">
              Submit for approval
            </SubmitButton>
          </>
        )}
        {can.approve && (
          <SubmitButton name="transition" value="approve">
            Approve
          </SubmitButton>
        )}
        {can.cancel && (
          <SubmitButton name="transition" value="cancel" variant="destructive">
            Cancel PO
          </SubmitButton>
        )}
      </form>
      {can.approve && (
        <details className="max-w-lg rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Reject and return to draft
          </summary>
          <form action={run} className="mt-3 grid gap-3">
            <input type="hidden" name="transition" value="reject" />
            <Field name="reason" label="Reason" required state={state} />
            <div>
              <SubmitButton variant="secondary">Reject</SubmitButton>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
