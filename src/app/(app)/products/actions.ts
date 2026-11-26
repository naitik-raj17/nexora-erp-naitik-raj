'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import { createProduct, updateProduct } from '@/server/inventory/products';

export async function saveProductAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    if (id) await updateProduct(actor, id, input);
    else await createProduct(actor, input);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/products');
  redirect('/products');
}
