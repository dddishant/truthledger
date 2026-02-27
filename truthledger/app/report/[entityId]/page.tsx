import { Claim } from '@/types';
import ShareableReport from '@/components/ShareableReport';

export default async function ReportPage({ params }: { params: { entityId: string } }) {
  const entityName = decodeURIComponent(params.entityId);
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/report/${encodeURIComponent(entityName)}`, { cache: 'no-store' });

  if (!res.ok) {
    return <div className="min-h-screen grid place-items-center text-zinc-400">Report not found</div>;
  }

  const { entity, claims } = await res.json();

  return (
    <ShareableReport
      entityName={entityName}
      reliabilityScore={entity?.reliabilityScore || 0}
      overpromiseIndex={entity?.overpromiseIndex || 'Unknown'}
      claims={(claims || []) as Claim[]}
    />
  );
}
