'use server';

import { redirect } from 'next/navigation';
import { formToObject, type ActionState } from '@/lib/action-state';
import { signInSchema } from '@/lib/schemas/core';
import { getSession } from '@/lib/session';
import { authenticate } from '@/server/core/auth';

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: 'Enter your email and password.' };

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: result.error };

  const session = await getSession();
  session.userId = result.userId;
  await session.save();
  redirect('/dashboard');
}

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
  redirect('/sign-in');
}
