import type { Prisma } from '@prisma/client';

type Num = Prisma.Decimal | number | string;

/** Quantities: up to 3 decimals, no trailing zeros. */
export function formatQty(value: Num) {
  return Number(value.toString()).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

export function formatMoney(value: Num) {
  return Number(value.toString()).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });
}

export function formatDate(value: Date | null | undefined) {
  return value
    ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export function formatDateTime(value: Date) {
  return value.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const poLabel = (n: number) => `PO-${String(n).padStart(6, '0')}`;
export const grnLabel = (n: number) => `GRN-${String(n).padStart(6, '0')}`;
