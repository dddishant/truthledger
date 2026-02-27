import { Claim } from '@/types';
import { getStatusBadgeColor } from '@/lib/scoring';

export default function ClaimCard({ claim }: { claim: Claim }) {
  const semanticType = (claim as any).type as string | undefined;
  const semanticStatus = (claim as any).statusSemantic as string | undefined;
  const badge =
    (semanticType === 'implemented' && 'Implemented') ||
    (semanticType === 'in_progress' && 'In progress') ||
    (semanticType === 'planned' && 'Planned') ||
    (semanticType === 'failed' && 'Failed') ||
    (semanticType === 'metric' && 'Metric') ||
    claim.category;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeColor(claim.status)}`}>
              {claim.status}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{badge}</span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{semanticStatus || claim.certainty}</span>
          </div>
          <p className="text-white text-lg leading-relaxed mb-3">"{(claim as any).statement || claim.text}"</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            {claim.metric && <span>{claim.metric}: {claim.target}</span>}
            {claim.deadline && claim.deadline !== 'Unspecified' && <span>By {claim.deadline}</span>}
            {claim.sourceUrl && <a href={claim.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2">Source</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
