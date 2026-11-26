import type { MovementType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

const LABEL: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  ISSUE: 'Issue',
  ADJUSTMENT: 'Adjustment',
};

export function MovementBadge({ type }: { type: MovementType }) {
  return (
    <Badge variant={type === 'RECEIPT' ? 'default' : type === 'ISSUE' ? 'secondary' : 'outline'}>
      {LABEL[type]}
    </Badge>
  );
}
