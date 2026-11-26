import Link from 'next/link';
import type { Role } from '@prisma/client';
import { navForRole } from '@/lib/nav';
import { NavLink } from '@/components/nav-link';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/(auth)/sign-in/actions';

type Props = {
  user: { name: string; role: Role };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const sections = navForRole(user.role);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/40 md:block">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Nexora ERP
          </Link>
        </div>
        <NavList sections={sections} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none font-semibold">☰ Nexora ERP</summary>
            <div className="absolute left-0 z-20 mt-2 w-60 rounded-md border bg-background shadow-md">
              <NavList sections={sections} />
            </div>
          </details>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              <span className="font-medium">{user.name}</span>
              <span className="ml-2 capitalize text-muted-foreground">
                {user.role.toLowerCase()}
              </span>
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavList({ sections }: { sections: ReturnType<typeof navForRole> }) {
  return (
    <nav aria-label="Main" className="space-y-5 p-3">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
