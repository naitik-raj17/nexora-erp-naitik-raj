'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Vendor } from '@prisma/client';
import { ActiveField, Field, FormAlert, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { saveVendorAction } from './actions';

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const [state, action] = useActionState(
    saveVendorAction.bind(null, vendor?.id ?? null),
    initialState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <Field name="name" label="Name" defaultValue={vendor?.name} required state={state} />
      <Field
        name="contactName"
        label="Contact person"
        defaultValue={vendor?.contactName ?? ''}
        state={state}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        defaultValue={vendor?.email ?? ''}
        state={state}
      />
      <Field
        name="phone"
        label="Phone"
        type="tel"
        defaultValue={vendor?.phone ?? ''}
        state={state}
      />
      <ActiveField defaultChecked={vendor?.isActive ?? true} />
      <div className="flex gap-2">
        <SubmitButton>{vendor ? 'Save changes' : 'Create vendor'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/vendors">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
