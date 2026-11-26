'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import { createWarehouse, updateWarehouse } from '@/server/inventory/warehouses';

export async function saveWarehouseAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    if (id) await updateWarehouse(actor, id, input);
    else await createWarehouse(actor, input);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/warehouses');
  redirect('/warehouses');
}
