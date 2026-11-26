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
