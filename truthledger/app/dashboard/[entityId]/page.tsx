'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { VoiceAnalysis } from '@/types';
import ReliabilityScore from '@/components/ReliabilityScore';
import OverpromiseIndex from '@/components/OverpromiseIndex';
import EvidenceFeed from '@/components/EvidenceFeed';
import VoiceSignalUploader from '@/components/VoiceSignalUploader';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

type Mode = 'strict' | 'balanced' | 'broad';

type ClaimType =
  | 'implemented'
  | 'in_progress'
  | 'planned'
  | 'failed'
  | 'metric';

const MODE_LABELS: Record<Mode, string> = {
  strict: 'Strict',
  balanced: 'Balanced',
  broad: 'Broad'
};

const TOPIC_SUGGESTIONS = ['carbon neutral', 'net zero target', 'earnings guidance', 'lawsuit settlement', 'outage'];

export default function DashboardPage() {
  const params = useParams<{ entityId: string }>();
  const searchParams = useSearchParams();
  const entityName = decodeURIComponent(params.entityId ?? '');

  const [data, setData] = useState<any>(null);
  const [resolvedQuery, setResolvedQuery] = useState(entityName);
  const [currentTopic, setCurrentTopic] = useState((searchParams.get('topic') || '').trim());
  const [mode, setMode] = useState<Mode>('balanced');
  const [includeProfileFacts, setIncludeProfileFacts] = useState(true);
  const [broadenClaimTypes, setBroadenClaimTypes] = useState(true);
  const [includePlannedCommitments, setIncludePlannedCommitments] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<ClaimType>>(new Set());
  const [ambiguousOptions, setAmbiguousOptions] = useState<Array<{ id: string; name?: string; type?: string; disambiguation_hint?: string; resolveTo?: string; title?: string; kind?: string; hint?: string }>>([]);
  const [ambiguityQuestion, setAmbiguityQuestion] = useState('');
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'claims' | 'evidence' | 'graph' | 'voice'>('claims');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [updatingEvidence, setUpdatingEvidence] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (args?: { entity?: string; topic?: string; displayQuery?: string }) => {
    const entity = (args?.entity ?? entityName).trim();
    const topic = (args?.topic ?? currentTopic).trim();
    const displayQuery = (args?.displayQuery ?? `${entity}${topic ? ` ${topic}` : ''}`).trim();

    if (!entity) {
      setData(null);
      setErrorMessage('Missing entity in URL');
      setApiStatus('error');
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiStatus('loading');
    setErrorMessage('');
    setData(null);
    setAmbiguousOptions([]);
    setAmbiguityQuestion('');
    setResolvedQuery(displayQuery);
    setCurrentTopic(topic);

    try {
      const qp = new URLSearchParams();
      if (topic) qp.set('topic', topic);
      qp.set('mode', mode);
      qp.set('includeProfileFacts', String(includeProfileFacts));
      qp.set('broadenClaimTypes', String(broadenClaimTypes));
      qp.set('includePlanned', String(includePlannedCommitments));
      const url = `/api/entity/${encodeURIComponent(entity)}?${qp.toString()}`;

      console.log('[ui/entity]', { query: entity, topic, mode, includeProfileFacts, broadenClaimTypes, includePlannedCommitments });
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ''}`);
      }

      const payload = await res.json();
      if (payload.ambiguous) {
        setAmbiguousOptions(payload.options || []);
        setAmbiguityQuestion(payload.question || 'Do you mean:');
        setUpdatedAt(payload.updatedAt || '');
        setErrorMessage(payload.question || 'Ambiguous query. Choose one option below.');

        const preferred = (payload.options || []).find((o: any) => (o.type || o.kind) === 'company') || (payload.options || [])[0];
        if (preferred) {
          const previewEntity = preferred.resolveTo || preferred.name || preferred.title;
          if (previewEntity) {
            await loadData({
              entity: previewEntity,
              topic: payload.topic || topic,
              displayQuery: `${previewEntity}${payload.topic || topic ? ` ${payload.topic || topic}` : ''}`.trim()
            });
            setAmbiguousOptions(payload.options || []);
            setAmbiguityQuestion(payload.question || 'Do you mean:');
            return;
          }
        }

        setData(payload);
        setApiStatus('error');
        return;
      }

      const claims = (payload.claims || []).map((claim: any, idx: number) => ({
        id: claim.id || `claim-${idx + 1}`,
        type: claim.type,
        text: claim.text,
        confidence: claim.confidence ?? 0,
        normalized: claim.normalized,
        confidenceBreakdown: claim.confidence_breakdown,
        evidence: (claim.evidence || []).map((ev: any, eIdx: number) => ({
          id: `${claim.id || idx}-ev-${eIdx}`,
          text: ev.snippet,
          summary: ev.snippet,
          url: ev.url,
          videoId: ev.videoId,
          start: ev.start,
          date: ev.published_at || payload.updatedAt || '',
          stance: 'Neutral',
          sourceType: 'web',
          createdAt: payload.updatedAt || ''
        })),
        status: 'Unknown',
        claim_text: claim.text
      }));

      const avgConfidence = payload?.assessment?.confidenceAverage != null
        ? Math.round(Number(payload.assessment.confidenceAverage) * 100)
        : claims.length
          ? Math.round((claims.reduce((sum: number, c: any) => sum + Number(c.confidence || 0), 0) / claims.length) * 100)
          : 50;

      const companyRating = payload?.assessment?.companyRating;
      const ratingScore = companyRating?.score ?? avgConfidence;
      const ratingLabel = companyRating?.label || (ratingScore >= 65 ? 'Mostly Successful' : ratingScore >= 45 ? 'Mixed' : 'Mostly Struggling');
      const delayedCount = companyRating?.statusBreakdown?.delayed || 0;
      const cancelledCount = companyRating?.statusBreakdown?.cancelled || 0;
      const totalClaims = companyRating?.totalClaims || claims.length || 1;
      const failureRatio = (delayedCount + cancelledCount) / totalClaims;
      const derivedOverpromise = failureRatio > 0.45 ? 'High' : failureRatio > 0.25 ? 'Medium' : 'Low';

      const entityObj = payload.entity || { id: entity.toLowerCase(), name: entity, type: 'unknown' };
      const merged = {
        ...payload,
        entity: {
          ...entityObj,
          tags: entityObj?.tags || [],
          reliabilityScore: avgConfidence,
          overpromiseIndex: derivedOverpromise,
          ratingLabel,
          updatedAt: payload.updatedAt || new Date().toISOString()
        },
        claims,
        voiceAnalyses: payload.voiceAnalyses || [],
        scoreHistory: payload.scoreHistory || [{ date: (payload.updatedAt || '').slice(0, 10), score: avgConfidence }]
      };

      setData(merged);
      setUpdatedAt(payload.updatedAt || '');
      setExpandedClaims({});
      setSelectedTypes(new Set(claims.map((c: any) => c.type).filter(Boolean)));
      setApiStatus('ok');
      console.log('[ui/entity]', { status: 'ok', claimsCount: claims.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ui/entity]', err);
      setErrorMessage(message);
      setApiStatus('error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({
      entity: entityName,
      topic: (searchParams.get('topic') || '').trim(),
      displayQuery: `${entityName}${searchParams.get('topic') ? ` ${searchParams.get('topic')}` : ''}`.trim()
    });
  }, [entityName]);

  const updateEvidence = async () => {
    setUpdatingEvidence(true);
    await fetch('/api/update-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityName })
    });
    await loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
    setUpdatingEvidence(false);
  };

  const handleVoiceUpload = async (file: File, claimId?: string) => {
    setUploadingVoice(true);
    const fd = new FormData();
    fd.append('audio', file);
    fd.append('entityName', data?.entity?.name || entityName);
    if (claimId) fd.append('claimId', claimId);
    await fetch('/api/analyze-voice', { method: 'POST', body: fd });
    await loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
    setUploadingVoice(false);
  };

  const handleImageUpload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entityName', data?.entity?.name || entityName);
    await fetch('/api/extract-vision', { method: 'POST', body: fd });
    await loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
  };

  if (loading) return <div className="min-h-screen grid place-items-center">Loading memory...</div>;

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div>Current query: <span className="font-mono">{resolvedQuery || '(empty)'}</span></div>
            <div>API status: <span className="font-mono">{apiStatus}</span></div>
            <div>updatedAt: <span className="font-mono">{updatedAt || '-'}</span></div>
          </div>
          {errorMessage ? <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-sm text-red-200">{errorMessage}</div> : null}
        </div>
      </div>
    );
  }

  const claims = data.claims || [];
  const filteredClaims = claims.filter((c: any) => (selectedTypes.size ? selectedTypes.has(c.type) : true));
  const claimTypeCounts: Record<string, number> = claims.reduce((acc: Record<string, number>, c: any) => {
    acc[c.type || 'unknown'] = (acc[c.type || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  const scoreHistory = data.scoreHistory || [];
  const entity = data.entity || { name: entityName, reliabilityScore: 50, overpromiseIndex: 'Medium' };
  const voiceAnalyses = data.voiceAnalyses || [];
  const retrievalSources = data.retrieval?.sources_returned || [];

  const toggleType = (type: ClaimType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const triggerSuggestedTopic = (topic: string) => {
    loadData({ entity: data?.entity?.name || entityName, topic, displayQuery: `${data?.entity?.name || entityName} ${topic}`.trim() });
  };

  const toYoutubeTimestamp = (seconds?: number) => {
    if (!Number.isFinite(seconds as number) || !seconds || seconds < 0) return '';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-zinc-500 hover:text-white text-sm">← TruthLedger</Link>
        <div className="flex gap-3">
          <button onClick={() => imageInputRef.current?.click()} className="px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg">Upload Slide/PDF</button>
          <input ref={imageInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          <button onClick={updateEvidence} disabled={updatingEvidence} className="px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50">{updatingEvidence ? 'Updating...' : 'Update Evidence'}</button>
          <Link href={`/report/${encodeURIComponent(entityName)}`} className="px-4 py-2 text-sm bg-white text-black font-bold rounded-lg">Share Report</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-300">
          <div>Current query: <span className="font-mono">{resolvedQuery || '(empty)'}</span></div>
          <div>Mode: <span className="font-mono">{MODE_LABELS[mode]}</span></div>
          <div>Topic: <span className="font-mono">{currentTopic || '-'}</span></div>
          <div>API status: <span className="font-mono">{apiStatus}</span></div>
          <div>updatedAt: <span className="font-mono">{updatedAt || '-'}</span></div>
          <div>claims returned: <span className="font-mono">{claims.length}</span></div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400 uppercase mb-2">Strictness</div>
            <div className="flex gap-2">
              {(['strict', 'balanced', 'broad'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
                  }}
                  className={`px-3 py-1 text-xs rounded border ${mode === m ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={broadenClaimTypes}
                onChange={(e) => {
                  setBroadenClaimTypes(e.target.checked);
                  loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
                }}
              />
              Broaden claim types
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={includeProfileFacts}
                onChange={(e) => {
                  setIncludeProfileFacts(e.target.checked);
                  loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
                }}
              />
              Include profile facts
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={includePlannedCommitments}
                onChange={(e) => {
                  setIncludePlannedCommitments(e.target.checked);
                  loadData({ entity: data?.entity?.name || entityName, topic: currentTopic });
                }}
              />
              Include planned commitments
            </label>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div className="text-xs text-zinc-400 uppercase mb-2">Entity Profile</div>
            <div>{entity.name}</div>
            {entity.ratingLabel ? <div className="mt-1 text-zinc-300">Track record: {entity.ratingLabel}</div> : null}
            {entity.description ? <div className="text-zinc-400 mt-1">{entity.description}</div> : null}
            <div className="mt-2 text-xs text-zinc-400">Founded: {entity.founded || '-'}</div>
            <div className="text-xs text-zinc-400">HQ: {entity.hq || '-'}</div>
            <div className="text-xs text-zinc-400 break-all">Website: {entity.website || '-'}</div>
            <div className="text-xs text-zinc-500 mt-1">{entity.source_label || 'Profile source unavailable'}</div>
          </div>
        </div>

        {ambiguousOptions.length > 0 ? (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div className="mb-2 text-zinc-300">{ambiguityQuestion || 'Do you mean:'}</div>
            <div className="flex flex-wrap gap-2">
              {ambiguousOptions.map((option) => {
                const name = option.name || option.title || '';
                const resolveTo = option.resolveTo || name;
                const hint = option.disambiguation_hint || option.hint || '';
                return (
                  <button
                    key={option.id || resolveTo}
                    onClick={() => loadData({ entity: resolveTo, topic: currentTopic, displayQuery: `${resolveTo}${currentTopic ? ` ${currentTopic}` : ''}`.trim() })}
                    className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                  >
                    {name}{hint ? ` (${hint})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {errorMessage ? <div className="mb-6 rounded-lg border border-red-700 bg-red-950 p-4 text-sm text-red-200">{errorMessage}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <ReliabilityScore score={entity.reliabilityScore || 0} />
          <OverpromiseIndex level={entity.overpromiseIndex || 'Low'} />
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Total Claims</p><p className="text-5xl font-black">{claims.length}</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Sources Considered</p><p className="text-5xl font-black">{data.retrieval?.sources_considered || 0}</p></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8 h-52">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Reliability Score Trend</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={scoreHistory}>
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Claim Type Filter</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(claimTypeCounts).map(([type, count]) => {
              const active = selectedTypes.has(type as ClaimType);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type as ClaimType)}
                  className={`px-3 py-1 text-xs rounded border ${active ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-xl w-fit">
          {(['claims', 'evidence', 'graph', 'voice'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-white text-black' : 'text-zinc-400'}`}>{tab}</button>
          ))}
        </div>

        {activeTab === 'claims' && (
          <div className="space-y-3">
            {filteredClaims.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-300">
                <div className="font-medium">{data.message || 'No verifiable implementation/progress/failure claims found in current sources'}</div>
                <div className="mt-3 text-xs uppercase text-zinc-500">Top Retrieved Sources</div>
                <div className="mt-2 space-y-2">
                  {retrievalSources.slice(0, 5).map((s: any, idx: number) => (
                    <div key={`${s.url}-${idx}`} className="rounded border border-zinc-800 p-3 text-xs">
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline text-blue-300 break-all">{s.title || s.url}</a>
                      <div className="mt-1 text-zinc-400">{s.snippet}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs uppercase text-zinc-500">Try These Searches</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TOPIC_SUGGESTIONS.map((topic) => (
                    <button key={topic} className="px-3 py-1 text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-300" onClick={() => triggerSuggestedTopic(topic)}>
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {filteredClaims.map((claim: any) => (
              <div key={claim.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200">
                    {(claim.type === 'implemented' && 'Implemented') ||
                      (claim.type === 'in_progress' && 'In progress') ||
                      (claim.type === 'planned' && 'Planned') ||
                      (claim.type === 'failed' && 'Failed') ||
                      (claim.type === 'metric' && 'Metric') ||
                      claim.type ||
                      'Unknown'}
                  </span>
                  <span className="text-xs text-zinc-300">confidence: {(Number(claim.confidence || 0) * 100).toFixed(0)}%</span>
                </div>
                <p className="text-white text-lg leading-relaxed mt-3">{claim.text || claim.claim_text}</p>
                {claim.normalized?.value ? (
                  <div className="mt-2 text-xs text-zinc-300">
                    Number: <span className="font-mono">{claim.normalized.value}{claim.normalized.unit ? ` ${claim.normalized.unit}` : ''}</span>
                    {claim.normalized.date ? <span className="ml-2 text-zinc-500">({claim.normalized.date})</span> : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="mt-3 text-xs text-zinc-300 underline"
                  onClick={() => setExpandedClaims((prev) => ({ ...prev, [claim.id]: !prev[claim.id] }))}
                >
                  {expandedClaims[claim.id] ? 'Hide evidence' : 'Show evidence'}
                </button>
                {claim.confidenceBreakdown ? (
                  <details className="mt-2 text-xs text-zinc-400">
                    <summary className="cursor-pointer select-none">Confidence breakdown</summary>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-zinc-800 p-3">
                      <div>Base</div><div className="font-mono text-right">{Number(claim.confidenceBreakdown.base || 0).toFixed(2)}</div>
                      <div>Corroboration</div><div className="font-mono text-right">+{Number(claim.confidenceBreakdown.corroborationBonus || 0).toFixed(2)}</div>
                      <div>Authority</div><div className="font-mono text-right">+{Number(claim.confidenceBreakdown.authorityBonus || 0).toFixed(2)}</div>
                      <div>Snippet quality</div><div className="font-mono text-right">+{Number(claim.confidenceBreakdown.snippetQualityBonus || 0).toFixed(2)}</div>
                      <div>Timeframe</div><div className="font-mono text-right">+{Number(claim.confidenceBreakdown.timeframeBonus || 0).toFixed(2)}</div>
                      <div>Recency</div><div className="font-mono text-right">+{Number(claim.confidenceBreakdown.recencyBonus || 0).toFixed(2)}</div>
                      <div>Thin evidence penalty</div><div className="font-mono text-right">-{Number(claim.confidenceBreakdown.thinEvidencePenalty || 0).toFixed(2)}</div>
                      <div className="text-zinc-200">Final</div><div className="font-mono text-right text-zinc-200">{Number(claim.confidenceBreakdown.final || claim.confidence || 0).toFixed(2)}</div>
                    </div>
                  </details>
                ) : null}
                {expandedClaims[claim.id] ? (
                  <div className="mt-3 space-y-2">
                    {(claim.evidence || []).map((ev: any, idx: number) => (
                      <div key={`${claim.id}-ev-${idx}`} className="rounded border border-zinc-800 p-3 text-xs text-zinc-300">
                        <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-300 underline break-all">
                          {ev.title || ev.url}
                        </a>
                        <div className="mt-1">{ev.summary || ev.text}</div>
                        {ev.videoId ? (
                          <div className="mt-1">
                            <a
                              href={`https://www.youtube.com/watch?v=${ev.videoId}${ev.start ? `&t=${Math.floor(ev.start)}` : ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-300 underline"
                            >
                              Watch on YouTube{ev.start ? ` @ ${toYoutubeTimestamp(ev.start)}` : ''}
                            </a>
                          </div>
                        ) : null}
                        {ev.date ? <div className="mt-1 text-zinc-500">{ev.date}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'evidence' && <EvidenceFeed claims={filteredClaims} />}
        {activeTab === 'graph' && <KnowledgeGraph entityName={entity.name} claims={filteredClaims} />}

        {activeTab === 'voice' && (
          <div>
            <VoiceSignalUploader uploading={uploadingVoice} onUpload={handleVoiceUpload} />
            {voiceAnalyses.map((va: VoiceAnalysis) => (
              <div key={va.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-lg">Confidence Integrity Signal</h3>
                  <div className="px-3 py-1 rounded-full text-sm font-bold border border-zinc-700">{va.riskLevel} Risk</div>
                </div>
                <p className="text-zinc-300 mb-6 italic">"{va.summary}"</p>
                <div className="space-y-4">
                  {va.signals.map((sig, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1"><span className="text-sm text-zinc-400">{sig.label}</span><span className="text-sm font-mono">{sig.value}</span></div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${sig.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
