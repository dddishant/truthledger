import { Claim } from '@/types';

export default function EvidenceFeed({ claims }: { claims: Claim[] }) {
  const evidence = claims
    .flatMap((c) => (c.evidence || []).map((ev) => ({ ...ev, claimText: c.text })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-3">
      {evidence.map((ev) => (
        <div key={ev.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <span className={`text-xl shrink-0 ${ev.stance === 'Supporting' ? 'text-emerald-400' : ev.stance === 'Contradicting' ? 'text-red-400' : 'text-zinc-500'}`}>
              {ev.stance === 'Supporting' ? '✓' : ev.stance === 'Contradicting' ? '✗' : '○'}
            </span>
            <div className="flex-1">
              <p className="text-zinc-300 mb-1">{ev.summary}</p>
              <p className="text-xs text-zinc-600 italic mb-2">Re: "{ev.claimText.slice(0, 90)}..."</p>
              {ev.url && <a href={ev.url} target="_blank" rel="noopener" className="text-xs text-zinc-500 underline">{ev.url}</a>}
            </div>
          </div>
        </div>
      ))}
      {evidence.length === 0 && <p className="text-zinc-500">No evidence yet.</p>}
    </div>
  );
}
