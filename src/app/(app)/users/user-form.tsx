'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, SubmitButton, controlClass } from '@/components/form';
import { initialState } from '@/lib/action-state';
import { saveUserAction } from './actions';

type User = { id: string; name: string; email: string; role: Role };

export function UserForm({ user }: { user?: User }) {
  const [state, action] = useActionState(saveUserAction.bind(null, user?.id ?? null), initialState);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <Field name="name" label="Name" defaultValue={user?.name} required state={state} />
      <Field
        name="email"
        label="Email"
        type="email"
        defaultValue={user?.email}
        required
        state={state}
      />
      <Field name="role" label="Role" state={state}>
        <select
          id="f-role"
          name="role"
          defaultValue={user?.role ?? 'STAFF'}
          className={controlClass}
        >
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
        </select>
      </Field>
      <Field
        name="password"
        label={user ? 'New password' : 'Password'}
        type="password"
        autoComplete="new-password"
        required={!user}
        hint={user ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}
        state={state}
      />
      <div className="flex gap-2">
        <SubmitButton>{user ? 'Save changes' : 'Create user'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/users">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
