import { z } from 'zod';
import { checkbox, decimalString, optionalText, uuid } from '@/lib/schemas/common';

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

export const PO_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
] as const;

export const poLineSchema = z.object({
  productId: uuid('Choose a product.'),
  quantity: decimalString(3, { positive: true }),
  unitPrice: decimalString(2),
});

/** FR-10. Lines arrive as a JSON string from the form's hidden field. */
export const purchaseOrderSchema = z.object({
  vendorId: uuid('Choose a vendor.'),
  warehouseId: uuid('Choose a delivery warehouse.'),
  expectedDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.iso.date('Enter a valid date.').nullable()),
  notes: optionalText(1000),
  lines: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return v;
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    },
    z
      .array(poLineSchema, 'Add at least one line.')
      .min(1, 'Add at least one line.')
      .max(100)
      .refine(
        (lines) => new Set(lines.map((l) => l.productId)).size === lines.length,
        'Each product can appear on only one line.',
      ),
  ),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters).').max(500),
});
