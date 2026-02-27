'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEntity, useEntitySearch, useOutbreakFeed, useWatchlist, useClaims, useEvidenceForClaims, useTriggerFreshScan } from '@/lib/hooks/use-api';
import { AppSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { WatchlistCard, ReliabilityOverviewCard } from '@/components/dashboard/watchlist-card';
import { OutbreakFeed } from '@/components/dashboard/outbreak-feed';
import { SelectedEntityPanel } from '@/components/dashboard/selected-entity-panel';
import { ClaimsTable } from '@/components/dashboard/claims-table';
import { startScanProgressStream, type ScanProgressEvent } from '@/lib/realtime';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState('');
  const watchlist = useWatchlist();
  const search = useEntitySearch(query);

  const defaultSelectedId = watchlist.data?.[0]?.id ?? '';
  const [selectedId, setSelectedId] = React.useState<string>('');
  React.useEffect(() => {
    if (!selectedId && defaultSelectedId) setSelectedId(defaultSelectedId);
  }, [defaultSelectedId, selectedId]);

  const selectedEntity = useEntity(selectedId);
  const selectedClaims = useClaims(selectedId);
  const selectedClaimIds = React.useMemo(() => (selectedClaims.data ?? []).map((claim) => claim.id), [selectedClaims.data]);
  const selectedEvidence = useEvidenceForClaims(selectedClaimIds);
  const scan = useTriggerFreshScan();
  const feed = useOutbreakFeed();
  const [scanProgress, setScanProgress] = React.useState<ScanProgressEvent | null>(null);

  const watchlistItems = query.trim() ? (search.data ?? []).filter((e) => e.type === 'company').slice(0, 5) : watchlist.data;
  const runFreshScan = async () => {
    if (!selectedId) return;
    const stopStream = startScanProgressStream(selectedId, {
      onEvent: (event) => setScanProgress(event),
      onDone: (event) => setScanProgress(event),
      onError: (message) =>
        setScanProgress({
          step: 'error',
          message,
          progress: 100,
          entityId: selectedId,
          ts: new Date().toISOString()
        })
    });

    try {
      await scan.mutateAsync({
        subjectEntityId: selectedId,
        transcriptText:
          'In this quarter, we commit to delivering audited reliability controls by Q4 2026 and targeting positive operating margin within fiscal year 2027. We believe rollout risk is manageable and execution is well underway.',
        sourceTitle: 'Manual Fresh Scan Trigger',
        sourceUrl: 'https://example.com/manual-fresh-scan'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims', selectedId] }),
        queryClient.invalidateQueries({ queryKey: ['outbreak-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['graph', selectedId] })
      ]);
    } finally {
      stopStream();
      setTimeout(() => setScanProgress(null), 1800);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[260px_1fr]">
        <AppSidebar />
        <div className="space-y-4">
          <DashboardTopbar
            query={query}
            onQueryChange={setQuery}
            onRunFreshScan={runFreshScan}
            scanning={scan.isPending}
            scanProgressMessage={scanProgress?.message}
            scanProgressPercent={scanProgress?.progress}
          />

          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <WatchlistCard items={watchlistItems} loading={watchlist.isLoading || search.isLoading} onSelect={setSelectedId} />
            <SelectedEntityPanel entity={selectedEntity.data} loading={selectedEntity.isLoading} />
          </div>

          {selectedEntity.data && (
            <ReliabilityOverviewCard score={selectedEntity.data.reliabilityScore} index={selectedEntity.data.overpromisingIndex} />
          )}

          <div className="grid gap-4 2xl:grid-cols-[1.35fr_0.9fr]">
            <ClaimsTable claims={selectedClaims.data ?? []} evidence={selectedEvidence.data ?? []} />
            <OutbreakFeed items={feed.data as any} loading={feed.isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
