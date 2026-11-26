import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requirePageRole } from '@/server/core/auth';
import { UserForm } from '../user-form';

export const metadata: Metadata = { title: 'New user' };

export default async function NewUserPage() {
  await requirePageRole('ADMIN');
  return (
    <>
      <PageHeader title="New user" />
      <UserForm />
    </>
  );
}
