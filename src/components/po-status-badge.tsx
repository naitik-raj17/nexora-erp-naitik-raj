import type { PoStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STYLE: Record<PoStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-foreground' },
  SUBMITTED: { label: 'Submitted', className: 'bg-amber-100 text-amber-900' },
  APPROVED: { label: 'Approved', className: 'bg-sky-100 text-sky-900' },
  PARTIALLY_RECEIVED: { label: 'Partially received', className: 'bg-violet-100 text-violet-900' },
  RECEIVED: { label: 'Received', className: 'bg-emerald-100 text-emerald-900' },
  CANCELLED: { label: 'Cancelled', className: 'bg-muted text-muted-foreground line-through' },
};

export const poStatusLabel = (s: PoStatus) => STYLE[s].label;

export function PoStatusBadge({ status }: { status: PoStatus }) {
  return (
    <Badge className={cn('border-transparent', STYLE[status].className)}>
      {STYLE[status].label}
    </Badge>
  );
}
