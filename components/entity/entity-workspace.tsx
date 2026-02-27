'use client';

import Link from 'next/link';
import { ArrowLeft, FileDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClaimsTable } from '@/components/dashboard/claims-table';
import { ClaimsTimeline } from '@/components/entity/claims-timeline';
import { EntityForceGraph } from '@/components/graph/entity-force-graph';
import { VoiceAnalysisPanel } from '@/components/voice/voice-analysis-panel';
import { EntityOverview } from '@/components/entity/entity-overview';
import { useClaims, useEntity, useEvidenceForClaims, useGraph, useVoiceAnalyses } from '@/lib/hooks/use-api';

export function EntityWorkspace({ id }: { id: string }) {
  const entity = useEntity(id);
  const claims = useClaims(id);
  const claimIds = (claims.data ?? []).map((claim) => claim.id);
  const evidence = useEvidenceForClaims(claimIds);
  const graph = useGraph(id);
  const voice = useVoiceAnalyses(id);
  const filteredEvidence = evidence.data ?? [];

  if (entity.isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="mx-auto h-[80vh] max-w-[1400px] rounded-2xl" />
      </div>
    );
  }

  if (!entity.data) {
    return (
      <div className="min-h-screen p-6">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Entity not found.</p>
            <Link href="/dashboard" className="mt-3 inline-block text-sm text-primary hover:underline">Return to dashboard</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Entity workspace</div>
            <h1 className="text-2xl font-semibold">{entity.data.name}</h1>
          </div>
          <Link href={`/report/${entity.data.id}`}>
            <Button className="gap-2"><FileDown className="h-4 w-4" /> Accountability Report</Button>
          </Link>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <EntityOverview entity={entity.data} claims={claims.data ?? []} evidence={filteredEvidence} />
            <ClaimsTable claims={claims.data ?? []} evidence={filteredEvidence} />
          </TabsContent>

          <TabsContent value="claims">
            <ClaimsTimeline claims={claims.data ?? []} evidence={filteredEvidence} />
          </TabsContent>

          <TabsContent value="graph">
            <EntityForceGraph data={graph.data ?? { nodes: [], links: [] }} />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceAnalysisPanel entityId={id} analyses={voice.data ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
