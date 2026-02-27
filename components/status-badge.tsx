import { Badge } from '@/components/ui/badge';
import type { Claim } from '@/lib/types';

export function ClaimStatusBadge({ status }: { status: Claim['status'] }) {
  const variant =
    status === 'On Track'
      ? 'success'
      : status === 'Behind'
        ? 'warning'
        : status === 'Unknown'
          ? 'secondary'
          : 'danger';
  return <Badge variant={variant}>{status}</Badge>;
}

export function OverpromisingBadge({ value }: { value: 'Low' | 'Medium' | 'High' | number }) {
  const normalized = typeof value === 'number' ? (value <= 33 ? 'Low' : value <= 66 ? 'Medium' : 'High') : value;
  const variant = normalized === 'Low' ? 'success' : normalized === 'Medium' ? 'warning' : 'danger';
  return <Badge variant={variant}>{normalized}</Badge>;
}
