'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Tags } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OverpromisingBadge } from '@/components/status-badge';
import { ReliabilityGauge } from '@/components/reliability-gauge';
import type { Entity } from '@/lib/types';

export function SelectedEntityPanel({ entity, loading }: { entity?: Entity | null; loading?: boolean }) {
  const safeEntity = entity ?? null;
  const tags = safeEntity?.tags ?? [];
  const canNavigate = Boolean(safeEntity?.id);

  return (
    <Card className="glass-panel h-full">
      <CardHeader>
        <CardTitle>Selected Entity Panel</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <Skeleton className="h-64 w-full rounded-xl" />}

        {!loading && !safeEntity && (
          <div className="text-sm text-muted-foreground">
            Select a company or person to inspect claims, evidence, graph relationships, and voice signals.
          </div>
        )}

        {!loading && safeEntity && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {safeEntity.type ?? 'entity'}
                </div>
                <div className="text-xl font-semibold">{safeEntity.name ?? 'Unknown'}</div>
                {safeEntity.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{safeEntity.description}</p>
                ) : null}
              </div>
              <ReliabilityGauge score={safeEntity.reliabilityScore ?? 0} />
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  <Tags className="h-3 w-3" /> {tag}
                </Badge>
              ))}
              <OverpromisingBadge value={safeEntity.overpromisingIndex ?? 0} />
            </div>

            {safeEntity.website ? (
              <a
                href={safeEntity.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> {safeEntity.website}
              </a>
            ) : null}

            <div className="flex gap-2">
              {canNavigate ? (
                <>
                  <Link
                    href={`/entity/${safeEntity.id}`}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Open Entity Workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={`/report/${safeEntity.id}`} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium">
                    View Report
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    title="Entity id missing from search result. Fix /api/search normalization."
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Open Entity Workspace <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Entity id missing from search result. Fix /api/search normalization."
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium opacity-60"
                  >
                    View Report
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
