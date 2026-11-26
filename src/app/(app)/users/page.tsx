import type { Metadata } from 'next';
import Link from 'next/link';
import { ActiveBadge } from '@/components/active-badge';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { param, parsePage } from '@/lib/pagination';
import { requirePageRole } from '@/server/core/auth';
import { listUsers } from '@/server/core/users';

export const metadata: Metadata = { title: 'Users' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsersPage({ searchParams }: Props) {
  const actor = await requirePageRole('ADMIN');
  const sp = await searchParams;
  const q = param(sp.q);
  const result = await listUsers(actor, { q, page: parsePage(sp.page) });

  return (
    <>
      <PageHeader
        title="Users"
        description="Create users, assign roles and deactivate accounts."
        actions={
          <Button asChild>
            <Link href="/users/new">New user</Link>
          </Button>
        }
      />
      <SearchBox q={q} placeholder="Name or email" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Link
                  href={`/users/${u.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {u.name}
                </Link>
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell className="capitalize">{u.role.toLowerCase()}</TableCell>
              <TableCell>
                <ActiveBadge active={u.isActive} />
              </TableCell>
            </TableRow>
          ))}
          {result.rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Pagination {...result} params={{ q }} />
    </>
  );
}
