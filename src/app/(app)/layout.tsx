import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/server/core/auth';

// Every page under (app) needs a signed-in, active user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
