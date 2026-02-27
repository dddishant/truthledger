'use client';

import { useState } from 'react';

interface Props {
  loading: boolean;
  onScan: (name: string, type: 'company' | 'person', topic?: string) => Promise<void>;
}

export default function SearchBar({ loading, onScan }: Props) {
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<'company' | 'person'>('company');
  const [resolving, setResolving] = useState(false);
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState<Array<{ id: string; title: string; kind: string; hint: string; resolveTo: string }>>([]);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const input = query.trim();
    if (!input) return;
    setError('');
    setQuestion('');
    setOptions([]);
    setTopic('');
    setResolving(true);
    try {
      const res = await fetch(`/api/entity/${encodeURIComponent(input)}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (payload?.ambiguous) {
        setQuestion(payload.question || 'Do you mean:');
        setOptions(payload.options || []);
        setTopic(payload.topic || '');
        return;
      }
      await onScan(payload?.resolvedEntity?.title || input, entityType, payload?.topic || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve query');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex gap-2 mb-3">
        {(['company', 'person'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${entityType === t ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setQuestion('');
            setOptions([]);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && query.trim() && handleSubmit()}
          placeholder={entityType === 'company' ? 'e.g. Tesla, OpenAI...' : 'e.g. Sam Altman...'}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-lg placeholder:text-zinc-600"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || resolving || !query.trim()}
          className="px-6 py-4 bg-white text-black font-bold rounded-xl disabled:opacity-50"
        >
          {loading ? 'Scanning...' : resolving ? 'Resolving...' : 'Scan'}
        </button>
      </div>
      {question && options.length > 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <div className="mb-2 text-zinc-300">{question}</div>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id || option.resolveTo}
                onClick={() => onScan(option.resolveTo || option.title, entityType, topic)}
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                title={option.hint || option.kind}
              >
                {option.title}{option.hint ? ` (${option.hint})` : ''}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <div className="mt-3 rounded-lg border border-red-700 bg-red-950 p-3 text-sm text-red-200">{error}</div> : null}
    </div>
  );
}
