import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OverpromisingBadge } from '@/components/status-badge';
import { ReliabilityGauge } from '@/components/reliability-gauge';
import type { Claim, Entity, Evidence } from '@/lib/types';

export function EntityOverview({ entity, claims, evidence }: { entity: Entity; claims: Claim[]; evidence: Evidence[] }) {
  const contradicted = claims.filter((c) => c.status === 'Contradicted' || c.status === 'Unfulfilled').length;
  const onTrack = claims.filter((c) => c.status === 'On Track').length;
  const deadlines = claims.filter((c) => c.structured.targetDate).length;
  const contradictionEvidence = evidence.filter((e) => e.type === 'contradicting').length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>{entity.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{entity.description}</p>
          <div className="flex flex-wrap gap-2">
            {entity.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
            <OverpromisingBadge value={entity.overpromisingIndex} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Tracked Claims" value={claims.length} />
            <Stat label="Claims w/ Deadlines" value={deadlines} />
            <Stat label="On Track" value={onTrack} />
            <Stat label="Contradicted/Unfulfilled" value={contradicted} tone="danger" />
            <Stat label="Contradicting Evidence" value={contradictionEvidence} tone="warning" />
          </div>
        </CardContent>
      </Card>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Accountability Posture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ReliabilityGauge score={entity.reliabilityScore} />
          <div className="text-center text-sm text-muted-foreground">
            Reliability score combines claim outcomes, evidence quality, deadline slippage, and consistency of public statements over time.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'danger' }) {
  const toneClass = tone === 'danger' ? 'text-rose-600 dark:text-rose-300' : tone === 'warning' ? 'text-amber-600 dark:text-amber-300' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
