'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import { createVendor, updateVendor } from '@/server/procurement/vendors';

export async function saveVendorAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    if (id) await updateVendor(actor, id, input);
    else await createVendor(actor, input);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/vendors');
  redirect('/vendors');
}
