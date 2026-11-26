export const PAGE_SIZE = 25; // NFR-05

export type Page<T> = { rows: T[]; total: number; page: number; pageCount: number };

export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function pageArgs(page: number) {
  return { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export function toPage<T>(rows: T[], total: number, page: number): Page<T> {
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}
