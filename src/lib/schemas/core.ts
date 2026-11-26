import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'MANAGER', 'STAFF']);

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.'),
  password: z.string().min(1, 'Enter your password.'),
});

const base = {
  name: z.string().trim().min(1, 'Name is required.').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email.')),
  role: roleSchema,
};

export const createUserSchema = z.object({
  ...base,
  password: z.string().min(8, 'At least 8 characters.').max(128),
});

export const updateUserSchema = z.object({
  ...base,
  // Blank keeps the current password.
  password: z
    .string()
    .max(128)
    .refine((v) => v === '' || v.length >= 8, 'At least 8 characters.')
    .optional()
    .default(''),
});
