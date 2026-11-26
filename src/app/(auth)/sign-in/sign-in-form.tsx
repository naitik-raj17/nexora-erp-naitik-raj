'use client';

import { useActionState } from 'react';
import { Field, FormAlert, SubmitButton } from '@/components/form';
import { initialState } from '@/lib/action-state';
import { signInAction } from './actions';

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <FormAlert state={state} />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        state={state}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        state={state}
      />
      <SubmitButton className="w-full">Sign in</SubmitButton>
    </form>
  );
}
