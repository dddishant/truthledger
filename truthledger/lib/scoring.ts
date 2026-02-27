import { Claim, ClaimStatus, OverpromiseLevel } from '@/types';

export function calculateReliabilityScore(claims: Claim[]): number {
  if (!claims.length) return 50;

  const weights: Record<ClaimStatus, number> = {
    Fulfilled: 100,
    'On Track': 75,
    Unknown: 50,
    Behind: 25,
    Unfulfilled: 0,
    Contradicted: 0,
  };

  const definitiveMultiplier = 1.5;

  let totalWeight = 0;
  let weightedScore = 0;

  for (const claim of claims) {
    const multiplier = claim.certainty === 'Definitive' ? definitiveMultiplier : 1;
    const score = weights[claim.status] ?? 50;
    weightedScore += score * multiplier;
    totalWeight += 100 * multiplier;
  }

  return Math.round((weightedScore / totalWeight) * 100);
}

export function calculateOverpromiseIndex(claims: Claim[]): OverpromiseLevel {
  if (!claims.length) return 'Low';

  const definitiveClaims = claims.filter((c) => c.certainty === 'Definitive');
  const failedDefinitive = definitiveClaims.filter(
    (c) => c.status === 'Unfulfilled' || c.status === 'Contradicted' || c.status === 'Behind'
  );

  const ratio = definitiveClaims.length ? failedDefinitive.length / definitiveClaims.length : 0;

  if (ratio > 0.5) return 'High';
  if (ratio > 0.25) return 'Medium';
  return 'Low';
}

export function getStatusColor(status: ClaimStatus): string {
  const colors: Record<ClaimStatus, string> = {
    Fulfilled: 'text-emerald-400',
    'On Track': 'text-blue-400',
    Unknown: 'text-zinc-400',
    Behind: 'text-amber-400',
    Unfulfilled: 'text-red-400',
    Contradicted: 'text-rose-500',
  };
  return colors[status] || 'text-zinc-400';
}

export function getStatusBadgeColor(status: ClaimStatus): string {
  const colors: Record<ClaimStatus, string> = {
    Fulfilled: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    'On Track': 'bg-blue-950 text-blue-400 border-blue-800',
    Unknown: 'bg-zinc-900 text-zinc-400 border-zinc-700',
    Behind: 'bg-amber-950 text-amber-400 border-amber-800',
    Unfulfilled: 'bg-red-950 text-red-400 border-red-800',
    Contradicted: 'bg-rose-950 text-rose-400 border-rose-800',
  };
  return colors[status] || 'bg-zinc-900 text-zinc-400 border-zinc-700';
}
