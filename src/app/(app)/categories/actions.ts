'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import { createCategory, updateCategory } from '@/server/inventory/categories';

export async function saveCategoryAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    if (id) await updateCategory(actor, id, input);
    else await createCategory(actor, input);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/categories');
  redirect('/categories');
}
