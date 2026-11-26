import { Badge } from '@/components/ui/badge';

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="secondary">Active</Badge>
  ) : (
    <Badge variant="outline">Inactive</Badge>
  );
}
