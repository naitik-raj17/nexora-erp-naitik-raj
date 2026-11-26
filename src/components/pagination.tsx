import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = {
  page: number;
  pageCount: number;
  total: number;
  /** Current query string values to keep when changing page. */
  params: Record<string, string>;
};

export function Pagination({ page, pageCount, total, params }: Props) {
  const href = (p: number) => `?${new URLSearchParams({ ...params, page: String(p) })}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total} {total === 1 ? 'record' : 'records'} · page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
