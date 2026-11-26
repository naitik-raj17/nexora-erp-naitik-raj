import { z } from 'zod';
import { ForbiddenError, NotFoundError, ValidationError } from '@/server/errors';

/** What a form's server action returns to `useActionState`. */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: string;
};

export const initialState: ActionState = {};

/** Turns known errors into form state; anything else is rethrown (500). */
export function toActionState(err: unknown): ActionState {
  if (err instanceof z.ZodError) {
    return {
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(err).fieldErrors,
    };
  }
  if (err instanceof ValidationError) return { error: err.message, fieldErrors: err.fieldErrors };
  if (err instanceof ForbiddenError || err instanceof NotFoundError) return { error: err.message };
  throw err;
}

/** FormData to a plain object; repeated keys are not used by our forms. */
export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries())
    if (typeof v === 'string' && !k.startsWith('$')) out[k] = v;
  return out;
}
