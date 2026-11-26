import { AppShell } from '@/components/app-shell';

// Day 9 replaces this placeholder with the signed-in user from the session.
const PLACEHOLDER_USER = { name: 'Demo Admin', role: 'ADMIN' as const };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell user={PLACEHOLDER_USER}>{children}</AppShell>;
}
