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

/** Form lines arrive as a JSON string from a hidden field; arrays pass through (tests, services). */
function parseJson(v: unknown) {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

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
    parseJson,
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

/** Receipt form field name for a PO line's quantity; field errors use the same key. */
export const qtyField = (lineId: string) => `qty:${lineId}`;

/** FR-12. Lines with quantity 0 are skipped; at least one must be above zero. */
export const goodsReceiptSchema = z.object({
  receivedOn: z.iso.date('Enter a valid date.'),
  notes: optionalText(1000),
  lines: z.preprocess(
    parseJson,
    z
      .array(
        z.object({ purchaseOrderLineId: uuid('Unknown line.'), quantity: decimalString(3) }),
        'Enter the quantities received.',
      )
      .max(100)
      .refine(
        (lines) => new Set(lines.map((l) => l.purchaseOrderLineId)).size === lines.length,
        'Each line can appear only once.',
      )
      .refine(
        (lines) => lines.some((l) => Number(l.quantity) > 0),
        'Enter a quantity for at least one line.',
      ),
  ),
});
