'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href as Route}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block rounded-md px-2 py-1.5 text-sm hover:bg-accent',
        active ? 'bg-accent font-medium' : 'text-muted-foreground',
      )}
    >
      {children}
    </Link>
  );
}
