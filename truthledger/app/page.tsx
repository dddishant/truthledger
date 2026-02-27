'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleScan = async (entityName: string, entityType: 'company' | 'person', topic?: string) => {
    setLoading(true);
    await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityName, entityType })
    });
    const dashUrl = `/dashboard/${encodeURIComponent(entityName)}${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`;
    router.push(dashUrl);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8">
      <div className="mb-16 text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Memory Engine
        </div>
        <h1 className="text-6xl font-black tracking-tight mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">TruthLedger</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
          The internet forgets. We don't. Track every public promise, commitment, and claim.
        </p>
      </div>

      <SearchBar loading={loading} onScan={handleScan} />

      <div className="mt-12 flex flex-wrap gap-2 justify-center max-w-2xl">
        {['Tesla', 'OpenAI', 'Volkswagen', 'WeWork', 'Elizabeth Holmes'].map((ex) => (
          <button key={ex} onClick={() => handleScan(ex, ex === 'Elizabeth Holmes' ? 'person' : 'company')} className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg">
            {ex}
          </button>
        ))}
      </div>
    </main>
  );
}
