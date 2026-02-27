'use client';

import { ArrowUpRight, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverpromisingBadge } from '@/components/status-badge';
import { ReliabilityGauge } from '@/components/reliability-gauge';
import type { Entity } from '@/lib/types';

export function WatchlistCard({ items, loading, onSelect }: { items?: Entity[]; loading?: boolean; onSelect: (id: string) => void }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Active Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && items?.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="group flex w-full items-center justify-between rounded-xl border bg-background/70 p-3 text-left hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Reliability {item.reliabilityScore}</span>
                  <OverpromisingBadge value={item.overpromisingIndex} />
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-1 text-xs text-muted-foreground group-hover:flex">
              Open <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>
        ))}
        {!loading && !items?.length && <div className="text-sm text-muted-foreground">No watchlist entities found.</div>}
      </CardContent>
    </Card>
  );
}

export function ReliabilityOverviewCard({ score, index }: { score: number; index: 'Low' | 'Medium' | 'High' | number }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Reliability Score</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <ReliabilityGauge score={score} />
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Overpromising Index</div>
          <OverpromisingBadge value={index} />
          <p className="max-w-[18rem] text-xs text-muted-foreground">
            Composite signal from claim outcomes, contradiction density, timeline slippage, and confidence mismatch indicators.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
