import { z } from 'zod';
import { checkbox, optionalText } from '@/lib/schemas/common';

export const vendorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150),
  contactName: optionalText(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v || null)
    .pipe(z.email('Enter a valid email.').nullable()),
  phone: optionalText(40),
  isActive: checkbox,
});
