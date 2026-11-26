'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import { createUser, setUserActive, updateUser } from '@/server/core/users';

export async function saveUserAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    if (id) await updateUser(actor, id, input);
    else await createUser(actor, input);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/users');
  redirect('/users');
}

export async function setUserActiveAction(id: string, isActive: boolean): Promise<ActionState> {
  const actor = await requireUser();
  try {
    await setUserActive(actor, id, isActive);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  return { success: isActive ? 'User reactivated.' : 'User deactivated.' };
}
