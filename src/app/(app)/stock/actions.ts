'use server';

import { revalidatePath } from 'next/cache';
import { formToObject, toActionState, type ActionState } from '@/lib/action-state';
import { formatQty } from '@/lib/format';
import { requireUser } from '@/server/core/auth';
import { adjustStock, issueStock } from '@/server/inventory/stock';

export async function recordMovementAction(
  type: 'ISSUE' | 'ADJUSTMENT',
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const input = formToObject(formData);
    const { onHand } =
      type === 'ISSUE' ? await issueStock(actor, input) : await adjustStock(actor, input);
    revalidatePath('/stock');
    revalidatePath(`/products/${input.productId}`);
    return {
      success: `${type === 'ISSUE' ? 'Stock issued' : 'Adjustment saved'}. New on hand: ${formatQty(onHand)}.`,
    };
  } catch (e) {
    return toActionState(e);
  }
}
