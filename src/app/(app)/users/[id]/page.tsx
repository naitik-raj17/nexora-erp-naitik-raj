import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActiveBadge } from '@/components/active-badge';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { getUser } from '@/server/core/users';
import { NotFoundError } from '@/server/errors';
import { ActiveToggle } from '../active-toggle';
import { UserForm } from '../user-form';

export const metadata: Metadata = { title: 'Edit user' };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageRole('ADMIN');
  const { id } = await params;
  const user = await getUser(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  return (
    <>
      <PageHeader title={user.name} description={<ActiveBadge active={user.isActive} />} />
      <div className="grid gap-8">
        <UserForm user={user} />
        {user.id !== actor.id && <ActiveToggle id={user.id} isActive={user.isActive} />}
      </div>
    </>
  );
}
