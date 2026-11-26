import { z } from 'zod';

/** Optional text: blank becomes null. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Checkbox posted with a hidden "false" before it; the last value wins. */
export const checkbox = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v !== 'false');

export const uuid = (message = 'Choose an option.') => z.uuid(message);

/** A non-negative decimal with up to `scale` places, kept as a string for Prisma.Decimal. */
export const decimalString = (scale: number, { positive = false } = {}) =>
  z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{1,9}(\\.\\d{1,${scale}})?$`),
      `Enter a number with up to ${scale} decimal places.`,
    )
    .refine((v) => !positive || Number(v) > 0, 'Must be greater than zero.');
