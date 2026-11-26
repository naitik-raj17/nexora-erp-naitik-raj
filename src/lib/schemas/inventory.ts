import { z } from 'zod';
import { checkbox, decimalString, optionalText, uuid } from '@/lib/schemas/common';

export const UNITS = ['PCS', 'BOX', 'KG', 'LITRE', 'METRE'] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
});

export const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,12}$/, '2–12 letters, digits or dashes.'),
  name: z.string().trim().min(1, 'Name is required.').max(100),
  address: optionalText(300),
  isActive: checkbox,
});

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,32}$/, '2–32 letters, digits or dashes.'),
  name: z.string().trim().min(1, 'Name is required.').max(150),
  categoryId: uuid('Choose a category.'),
  unit: z.enum(UNITS, 'Choose a unit.'),
  reorderLevel: decimalString(3),
  isActive: checkbox,
});

const reason = z.string().trim().min(3, 'Give a reason (at least 3 characters).').max(300);

/** FR-08: goods out. Quantity is entered as a positive number. */
export const stockIssueSchema = z.object({
  productId: uuid('Choose a product.'),
  warehouseId: uuid('Choose a warehouse.'),
  quantity: decimalString(3, { positive: true }),
  reason,
});

/** FR-08: a correction; positive adds stock, negative removes it. */
export const stockAdjustmentSchema = z.object({
  productId: uuid('Choose a product.'),
  warehouseId: uuid('Choose a warehouse.'),
  quantity: z
    .string()
    .trim()
    .regex(/^-?\d{1,9}(\.\d{1,3})?$/, 'Enter a number with up to 3 decimal places, e.g. 5 or -2.5.')
    .refine((v) => Number(v) !== 0, 'Must not be zero.'),
  reason,
});
