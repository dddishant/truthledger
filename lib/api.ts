import type { Claim, Entity, Evidence, GraphData, VoiceAnalysis } from '@/lib/types';

type FeedItem = {
  id: string;
  type: 'status-change' | 'new-claim' | 'evidence';
  entityId: string;
  title: string;
  detail: string;
  occurredAt: string;
  severity: 'low' | 'medium' | 'high';
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch {
      details = '';
    }
    throw new Error(`API ${response.status}: ${path}${details ? ` - ${details}` : ''}`);
  }

  return response.json() as Promise<T>;
}

export async function searchEntities(query: string): Promise<Entity[]> {
  const response = await apiFetch<{ results?: Entity[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  return response.results ?? [];
}

export async function getEntity(id: string): Promise<Entity | null> {
  try {
    return await apiFetch<Entity>(`/api/entity/${id}`);
  } catch {
    return null;
  }
}

export async function getClaimsForEntity(id: string): Promise<Claim[]> {
  return apiFetch<Claim[]>(`/api/entity/${id}/claims`);
}

export async function getEvidenceForClaim(claimId: string): Promise<Evidence[]> {
  return apiFetch<Evidence[]>(`/api/claim/${claimId}/evidence`);
}

export async function getEvidenceForClaims(claimIds: string[]): Promise<Evidence[]> {
  const settled = await Promise.all(claimIds.map((id) => getEvidenceForClaim(id)));
  return settled.flat().sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export async function getGraphForEntity(id: string): Promise<GraphData> {
  return apiFetch<GraphData>(`/api/entity/${id}/graph`);
}

export async function getVoiceAnalysesForEntity(id: string): Promise<VoiceAnalysis[]> {
  return apiFetch<VoiceAnalysis[]>(`/api/entity/${id}/voice`);
}

export async function submitVoiceAnalysis(entityId: string, file: File): Promise<VoiceAnalysis> {
  const formData = new FormData();
  formData.append('entityId', entityId);
  formData.append('file', file);

  return apiFetch<VoiceAnalysis>('/api/voice', {
    method: 'POST',
    body: formData
  });
}

export async function triggerFreshScan(input: {
  subjectEntityId: string;
  speakerEntityId?: string;
  transcriptText: string;
  sourceUrl?: string;
  sourceTitle?: string;
}): Promise<{ claim: Claim; evidence: Evidence; extractedClaims: Array<{ claimText: string }> }> {
  return apiFetch<{ claim: Claim; evidence: Evidence; extractedClaims: Array<{ claimText: string }> }>('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function getOutbreakFeed(): Promise<FeedItem[]> {
  return apiFetch<FeedItem[]>('/api/outbreak');
}

export async function getWatchlistCompanies(): Promise<Entity[]> {
  const seededIds = ['comp-orbitex', 'comp-helixai', 'comp-novaforge', 'comp-lumen', 'comp-aurora'];
  const results = await Promise.all(seededIds.map((id) => getEntity(id)));
  return results.filter((entity): entity is Entity => Boolean(entity)).slice(0, 5);
}

export async function getReportBundle(id: string) {
  return apiFetch<{
    entity: Entity;
    claims: Claim[];
    evidence: Evidence[];
    voices: VoiceAnalysis[];
    sources: string[];
  }>(`/api/report/${id}`);
}
