import { getOptionalEnv } from '@/lib/server/config';
import type { Entity } from '@/lib/types';

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score?: number;
};

type OutbreakItem = {
  id: string;
  type: 'status-change' | 'new-claim' | 'evidence';
  entityId: string;
  title: string;
  detail: string;
  occurredAt: string;
  severity: 'low' | 'medium' | 'high';
};

const realtimeEntityCache = new Map<string, Entity>();

function encodeRealtimeEntityId(url: string) {
  return `rtu-${Buffer.from(url).toString('base64url')}`;
}

function decodeRealtimeEntityId(id: string) {
  if (!id.startsWith('rtu-')) return null;
  const encoded = id.slice(4);
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

async function tavilySearch(query: string, maxResults = 8): Promise<TavilyResult[]> {
  const apiKey = getOptionalEnv('TAVILY_API_KEY');
  if (!apiKey) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Tavily failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as { results?: TavilyResult[] };
  return payload.results ?? [];
}

function titleToName(title: string) {
  return title.split(/[-|:]/)[0].trim().slice(0, 70) || 'Live Source Entity';
}

export async function realtimeSearchEntities(query: string): Promise<Entity[]> {
  const results = await tavilySearch(query, 10);

  const entities = results.map((result) => ({
    id: encodeRealtimeEntityId(result.url),
    type: 'company',
    name: titleToName(result.title),
    description: result.content?.slice(0, 240) || result.title,
    website: result.url,
    tags: ['Live', 'Tavily'],
    reliabilityScore: 50,
    overpromisingIndex: 'Medium'
  }));

  for (const entity of entities) {
    realtimeEntityCache.set(entity.id, entity);
  }

  return entities;
}

export function getRealtimeEntityById(id: string): Entity | null {
  const cached = realtimeEntityCache.get(id);
  if (cached) return cached;

  const website = decodeRealtimeEntityId(id);
  if (!website) {
    if (!id.startsWith('rt-')) return null;
    return {
      id,
      type: 'company',
      name: 'Live Search Entity',
      description: 'Live entity result from search. Re-run search to refresh full metadata.',
      tags: ['Live', 'Tavily'],
      reliabilityScore: 50,
      overpromisingIndex: 'Medium'
    };
  }

  return {
    id,
    type: 'company',
    name: new URL(website).hostname.replace(/^www\./, ''),
    description: 'Live entity resolved from search result source URL.',
    website,
    tags: ['Live', 'Tavily'],
    reliabilityScore: 50,
    overpromisingIndex: 'Medium'
  };
}

export async function realtimeOutbreakFeed(): Promise<OutbreakItem[]> {
  const query =
    'corporate guidance missed targets delayed launch contradiction earnings call claim update latest';
  const results = await tavilySearch(query, 8);

  return results.map((result, i) => ({
    id: `rt-feed-${i}-${Date.now()}`,
    type: 'evidence',
    entityId: 'comp-helixai',
    title: result.title,
    detail: result.content?.slice(0, 220) || result.url,
    occurredAt: result.published_date ? new Date(result.published_date).toISOString() : new Date().toISOString(),
    severity: (result.score ?? 0) > 0.8 ? 'high' : (result.score ?? 0) > 0.55 ? 'medium' : 'low'
  }));
}
