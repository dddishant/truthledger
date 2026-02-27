import { Claim } from '@/types';
import { getStatusBadgeColor } from '@/lib/scoring';

interface Props {
  entityName: string;
  reliabilityScore: number;
  overpromiseIndex: string;
  claims: Claim[];
}

export default function ShareableReport({ entityName, reliabilityScore, overpromiseIndex, claims }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-white text-zinc-900 max-w-4xl mx-auto px-10 py-16 font-serif">
      <div className="border-b-2 border-zinc-900 pb-8 mb-10">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">TruthLedger Accountability Report</p>
        <h1 className="text-5xl font-black mb-2">{entityName}</h1>
        <p className="text-zinc-500">Generated {date}</p>
        <div className="flex gap-8 mt-6">
          <div><p className="text-xs text-zinc-500 uppercase">Reliability Score</p><p className="text-4xl font-black">{Math.round(reliabilityScore)}/100</p></div>
          <div><p className="text-xs text-zinc-500 uppercase">Overpromise Index</p><p className="text-4xl font-black">{overpromiseIndex}</p></div>
          <div><p className="text-xs text-zinc-500 uppercase">Total Claims Tracked</p><p className="text-4xl font-black">{claims.length}</p></div>
        </div>
      </div>

      <h2 className="text-2xl font-black mb-6">Tracked Claims</h2>
      <div className="space-y-6">
        {claims.map((claim, i) => (
          <div key={claim.id} className="border-l-4 border-zinc-200 pl-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono font-bold text-zinc-400">#{i + 1}</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded border ${getStatusBadgeColor(claim.status)}`}>{claim.status}</span>
              <span className="text-xs text-zinc-500">{claim.category} · {claim.certainty}</span>
            </div>
            <p className="text-lg leading-relaxed mb-2">"{claim.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
