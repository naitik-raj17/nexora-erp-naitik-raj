'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { requireUser } from '@/server/core/auth';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from '@/server/procurement/purchase-orders';

/** Save a draft; with intent=submit it is submitted for approval in the same step. */
export async function savePoAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  let poId: string;
  try {
    const input = formToObject(formData);
    poId = id
      ? (await updatePurchaseOrder(actor, id, input)).id
      : (await createPurchaseOrder(actor, input)).id;
    if (input.intent === 'submit') await submitPurchaseOrder(actor, poId);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/purchase-orders');
  redirect(`/purchase-orders/${poId}`);
}

type Transition = 'submit' | 'approve' | 'cancel' | 'reject';

const DONE: Record<Transition, string> = {
  submit: 'Submitted for approval.',
  approve: 'Purchase order approved.',
  cancel: 'Purchase order cancelled.',
  reject: 'Purchase order returned to draft.',
};

/** Status changes from the PO page. The form posts `transition` (and `reason` for a rejection). */
export async function transitionPoAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const transition = formData.get('transition') as Transition;
  try {
    if (transition === 'submit') await submitPurchaseOrder(actor, id);
    else if (transition === 'approve') await approvePurchaseOrder(actor, id);
    else if (transition === 'cancel') await cancelPurchaseOrder(actor, id);
    else if (transition === 'reject') await rejectPurchaseOrder(actor, id, formToObject(formData));
    else return { error: 'Unknown action.' };
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${id}`);
  return { success: DONE[transition] };
}
