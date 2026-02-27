import { OverpromiseLevel } from '@/types';

export default function OverpromiseIndex({ level }: { level: OverpromiseLevel | string }) {
  const color = level === 'Low' ? 'text-emerald-400' : level === 'Medium' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Overpromise Index</p>
      <p className={`text-3xl font-black mt-2 ${color}`}>{level}</p>
      <p className="text-xs text-zinc-600 mt-2">Based on definitive claim track record</p>
    </div>
  );
}
