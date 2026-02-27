interface ReliabilityScoreProps {
  score: number;
}

export default function ReliabilityScore({ score }: ReliabilityScoreProps) {
  const tone = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const bar = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Reliability Score</p>
      <p className={`text-5xl font-black ${tone}`}>{Math.round(score)}</p>
      <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
