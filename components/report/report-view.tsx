'use client';

import { Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClaimStatusBadge, OverpromisingBadge } from '@/components/status-badge';
import { ReliabilityGauge } from '@/components/reliability-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReport } from '@/lib/hooks/use-api';
import { formatDate } from '@/lib/utils';

export function ReportView({ id }: { id: string }) {
  const report = useReport(id);

  if (report.isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="mx-auto h-[80vh] max-w-5xl rounded-2xl" />
      </div>
    );
  }

  if (!report.data) {
    return <div className="p-6 text-sm text-muted-foreground">Report not found.</div>;
  }

  const { entity, claims, evidence, voices, sources } = report.data;
  const topEvidence = evidence.slice(0, 8);
  const latestVoice = voices[0];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 print:p-0">
      <div className="mx-auto max-w-5xl space-y-4 print:max-w-none">
        <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 print:hidden md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Shareable accountability report</div>
            <div className="text-lg font-semibold">{entity.name}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
            <Button className="gap-2"><Share2 className="h-4 w-4" /> Share Link</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_280px] print:grid-cols-[1fr_260px]">
          <Card className="glass-panel print:shadow-none">
            <CardHeader>
              <CardTitle>{entity.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{entity.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {entity.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                <OverpromisingBadge value={entity.overpromisingIndex} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Tracked claims" value={String(claims.length)} />
                <MetricCard label="Contradictions" value={String(claims.filter((c) => c.status === 'Contradicted').length)} />
                <MetricCard label="Unfulfilled" value={String(claims.filter((c) => c.status === 'Unfulfilled').length)} />
                <MetricCard label="Confidence signal" value={latestVoice ? `${Math.round((latestVoice.signals.confidenceMismatch ?? 0) * 100)}% mismatch` : 'N/A'} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel print:shadow-none">
            <CardHeader>
              <CardTitle>Scores</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ReliabilityGauge score={entity.reliabilityScore} />
              <div className="w-full rounded-lg border bg-background/60 p-3 text-sm">
                <div className="mb-1 font-medium">Overpromising Index</div>
                <OverpromisingBadge value={entity.overpromisingIndex} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel print:shadow-none">
          <CardHeader>
            <CardTitle>Top 5 Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border bg-background/60 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{claim.structured.category}</Badge>
                  <ClaimStatusBadge status={claim.status} />
                  <Badge variant="secondary">{Math.round(claim.statusConfidence * 100)}% confidence</Badge>
                </div>
                <div className="font-medium">{claim.claimText}</div>
                <div className="mt-2 text-xs text-muted-foreground">Target Date: {formatDate(claim.structured.targetDate)} • Metric: {claim.structured.metric ?? 'N/A'}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-panel print:shadow-none">
            <CardHeader>
              <CardTitle>Evidence Snippets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topEvidence.map((ev) => (
                <div key={ev.id} className="rounded-lg border bg-background/60 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{ev.title}</div>
                    <Badge variant={ev.type === 'supporting' ? 'success' : ev.type === 'contradicting' ? 'danger' : 'secondary'}>{ev.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ev.snippet}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDate(ev.publishedAt)} • {ev.sourceUrl}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass-panel print:shadow-none">
              <CardHeader>
                <CardTitle>Confidence Signal Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {latestVoice ? (
                  <div className="space-y-2 text-sm">
                    <div><strong>Audio:</strong> {latestVoice.audioFileName}</div>
                    <div><strong>Analyzed:</strong> {formatDate(latestVoice.createdAt)}</div>
                    <div className="rounded-lg border bg-background/60 p-3">{latestVoice.summary}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No voice analysis available for this report yet.</p>
                )}
              </CardContent>
            </Card>
            <Card className="glass-panel print:shadow-none">
              <CardHeader>
                <CardTitle>Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {sources.map((src) => (
                    <li key={src} className="rounded-md border bg-background/60 px-3 py-2">{src}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
