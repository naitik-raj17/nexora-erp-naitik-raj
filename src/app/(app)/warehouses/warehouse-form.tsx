'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Warehouse } from '@prisma/client';
import { ActiveField, Field, FormAlert, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { saveWarehouseAction } from './actions';

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const [state, action] = useActionState(
    saveWarehouseAction.bind(null, warehouse?.id ?? null),
    initialState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <Field
        name="code"
        label="Code"
        defaultValue={warehouse?.code}
        required
        hint="e.g. WH-MAIN"
        state={state}
      />
      <Field name="name" label="Name" defaultValue={warehouse?.name} required state={state} />
      <Field name="address" label="Address" defaultValue={warehouse?.address ?? ''} state={state} />
      <ActiveField defaultChecked={warehouse?.isActive ?? true} />
      <div className="flex gap-2">
        <SubmitButton>{warehouse ? 'Save changes' : 'Create warehouse'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/warehouses">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
