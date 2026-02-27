import Link from 'next/link';

export default async function ClaimDetailPage({ params }: { params: { claimId: string } }) {
  const claimId = decodeURIComponent(params.claimId);
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/claim/${encodeURIComponent(claimId)}`, { cache: 'no-store' });

  if (!res.ok) {
    return <div className="min-h-screen grid place-items-center">Claim not found</div>;
  }

  const { claim, entity } = await res.json();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-8 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href={`/dashboard/${encodeURIComponent(entity?.name || '')}`} className="text-zinc-500">← Back to dashboard</Link>
        <h1 className="text-3xl font-black mt-4 mb-4">Claim Detail</h1>
        <p className="text-xl leading-relaxed mb-4">"{claim.text}"</p>
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-zinc-400">
          <p>Category: {claim.category}</p>
          <p>Status: {claim.status}</p>
          <p>Metric: {claim.metric}</p>
          <p>Target: {claim.target}</p>
          <p>Deadline: {claim.deadline}</p>
          <p>Certainty: {claim.certainty}</p>
        </div>
        <h2 className="text-xl font-bold mb-3">Evidence</h2>
        <div className="space-y-3">
          {(claim.evidence || []).map((ev: any) => (
            <div key={ev.id} className="border border-zinc-800 bg-zinc-900 p-4 rounded-xl">
              <p className="text-sm text-zinc-300 mb-2">{ev.summary}</p>
              {ev.url && <a href={ev.url} target="_blank" rel="noopener" className="text-xs underline text-zinc-500">{ev.url}</a>}
            </div>
          ))}
          {(claim.evidence || []).length === 0 && <p className="text-zinc-500">No evidence attached yet.</p>}
        </div>
      </div>
    </main>
  );
}
