import { NextRequest, NextResponse } from 'next/server';
import { searchClaims } from '@/lib/tavily';
import { hasTavilyConfig } from '@/lib/runtime';
import { getFixtureClaims } from '@/lib/fixtures/entity-claims';
import type { ApiClaimFixture } from '@/lib/fixtures/types';
import { extractRealClaimsFromSource } from '@/lib/claim-extraction';

export const dynamic = 'force-dynamic';

type Mode = 'strict' | 'balanced' | 'broad';

type ClaimType = 'implemented' | 'in_progress' | 'planned' | 'failed' | 'metric';

type Evidence = {
  url: string;
  title: string;
  snippet: string;
  quote?: string;
  published_at?: string;
  source_name?: string;
  videoId?: string;
  start?: number;
};

type ApiClaim = {
  id: string;
  type: ClaimType;
  statement: string;
  category: ClaimType;
  status: 'success' | 'partial' | 'ongoing' | 'delayed' | 'cancelled' | 'unknown';
  text: string;
  normalized?: {
    metric?: string;
    value?: string;
    unit?: string;
    date?: string;
    timeframe?: string;
    polarity?: 'positive' | 'negative' | 'neutral';
  };
  confidence: number;
  subject: string;
  action: string;
  object: string;
  timeframe?: string;
  attribution: {
    speaker?: string;
    org?: string;
    role?: string;
    source_type: 'official' | 'filing' | 'news' | 'interview' | 'analysis' | 'unknown';
  };
  evidence: Evidence[];
  negative: boolean;
  keywords: string[];
  extracted_at: string;
  confidence_breakdown?: {
    base: number;
    corroborationBonus: number;
    authorityBonus: number;
    snippetQualityBonus: number;
    timeframeBonus: number;
    recencyBonus: number;
    thinEvidencePenalty: number;
    final: number;
  };
};

type RetrievalSource = { url: string; title: string; snippet: string };

type EntityResponse = {
  entity: {
    id: string;
    name: string;
    type: 'company' | 'person' | 'thing' | 'unit' | 'unknown';
    description?: string;
    website?: string;
    hq?: string;
    founded?: string;
    source_label?: string;
  };
  ambiguous?: boolean;
  question?: string;
  options?: Array<{
    id: string;
    name: string;
    type: 'company' | 'person' | 'thing' | 'unknown';
    disambiguation_hint?: string;
    resolveTo?: string;
    title?: string;
    kind?: string;
    hint?: string;
  }>;
  claims: ApiClaim[];
  retrieval: {
    query: string;
    expanded_queries: string[];
    sources_considered: number;
    sources_returned: RetrievalSource[];
    mode: Mode;
  };
  assessment?: {
    confidenceAverage: number;
    companyRating: {
      score: number;
      label: 'Mostly Successful' | 'Mixed' | 'Mostly Struggling' | 'Insufficient Data';
      successRate: number;
      totalClaims: number;
      statusBreakdown: Record<string, number>;
    };
  };
  message?: string;
  query?: string;
  entityCandidate?: string;
  topic?: string;
  includePlannedCommitments?: boolean;
  normalized?: string;
  resolvedEntity?: { title: string; url?: string; kind?: string };
  updatedAt?: string;
};

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  description?: string;
  wikibase_item?: string;
  content_urls?: { desktop?: { page?: string } };
};

type WikidataFacts = {
  hq?: string;
  inception?: string;
  founder?: string;
  industry?: string;
  website?: string;
};

type SourceDoc = {
  url: string;
  title: string;
  snippet: string;
  text: string;
  published_at?: string;
  source_name?: string;
};

const KNOWN_AMBIGUOUS = new Set(['apple', 'tesla', 'amazon']);
const CLIMATE_KEYWORDS = ['carbon', 'neutral', 'net zero', 'emission', 'sustainability', 'climate', 'esg'];
const FINANCE_KEYWORDS = ['revenue', 'margin', 'guidance', 'earnings', 'profit', 'growth', 'decline', 'sales', 'ebitda', 'financial'];
const FETCH_TIMEOUT_MS = 6000;

function normalizeName(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toMode(input: string | null): Mode {
  if (input === 'strict' || input === 'broad') return input;
  return 'balanced';
}

function parseBool(input: string | null, fallback = true) {
  if (input === null) return fallback;
  return input === '1' || input.toLowerCase() === 'true';
}

function parseQueryInput(raw: string, forcedTopic?: string) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { entityCandidate: '', topic: '' };
  if (forcedTopic !== undefined) {
    return { entityCandidate: cleaned, topic: forcedTopic.replace(/\s+/g, ' ').trim() };
  }
  if (/[(),]/.test(cleaned) || /\b(inc\.?|corp\.?|ltd\.?|plc|company|group|motors|records)\b/i.test(cleaned)) {
    return { entityCandidate: cleaned, topic: '' };
  }
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { entityCandidate: cleaned, topic: '' };
  return { entityCandidate: parts[0], topic: parts.slice(1).join(' ').trim() };
}

function hasClimateTopic(topic: string) {
  const lower = topic.toLowerCase();
  return CLIMATE_KEYWORDS.some((k) => lower.includes(k));
}

function hasFinanceTopic(topic: string) {
  const lower = topic.toLowerCase();
  return FINANCE_KEYWORDS.some((k) => lower.includes(k));
}

function looksResolvedEntity(value: string) {
  return /\(|inc\.?|corp\.?|company|motors|group|ltd\.?|plc|records/i.test(value);
}

function limitWords(text: string, maxWords = 25) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function splitSentences(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDisambiguation(summary: WikiSummary) {
  const extract = (summary.extract || '').toLowerCase();
  return (
    summary.type === 'disambiguation' ||
    /may refer to:|topics referred to by the same term|most commonly refers to/.test(extract)
  );
}

function inferEntityType(summary?: WikiSummary): EntityResponse['entity']['type'] {
  const text = `${summary?.title || ''} ${summary?.description || ''}`.toLowerCase();
  if (/company|inc\.?|corporation|automotive|software|technology|manufacturer/.test(text)) return 'company';
  if (/person|scientist|engineer|actor|politician|founder|ceo/.test(text)) return 'person';
  if (/unit|measure|symbol/.test(text)) return 'unit';
  if (text) return 'thing';
  return 'unknown';
}

function inferOptionType(name: string, hint?: string): 'company' | 'person' | 'thing' | 'unknown' {
  const text = `${name} ${hint || ''}`.toLowerCase();
  if (/inc\.?|company|corporation|technology|automotive|manufacturer|records/.test(text)) return 'company';
  if (/person|inventor|engineer|founder|actor|politician/.test(text)) return 'person';
  if (/fruit|unit|river|species|album/.test(text)) return 'thing';
  return 'unknown';
}

function topicMatches(text: string, topic: string) {
  if (!topic.trim()) return true;
  const lower = text.toLowerCase();
  const tokens = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(t));
  if (!tokens.length) return true;
  return tokens.some((t) => lower.includes(t));
}

function buildExpandedQueries(entity: string, topic: string, mode: Mode) {
  const base = [
    `${entity} announced`,
    `${entity} press release`,
    `${entity} report`,
    `${entity} earnings call transcript`,
    `${entity} guidance`,
    `${entity} lawsuit settlement`,
    `${entity} data breach`,
    `${entity} outage`,
    `${entity} sustainability report net zero`,
    `${entity} carbon neutral target`,
    `${entity} launched`,
    `${entity} rolled out`,
    `${entity} reported`,
    `${entity} according to`,
    `${entity} CEO said`,
    `${entity} compliance statement`,
    `${entity} incident response`,
    `${entity} quarterly results`
  ];

  const topicQueries = topic
    ? [
        `${entity} ${topic}`,
        `${entity} ${topic} target`,
        `${entity} ${topic} progress`,
        `${entity} ${topic} report`,
        `${entity} ${topic} announcement`
      ]
    : [];

  const all = Array.from(new Set([...topicQueries, ...base]));
  const cap = mode === 'strict' ? 4 : mode === 'balanced' ? 6 : 10;
  return all.slice(0, cap);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function evidenceAuthorityScore(evidence: Evidence) {
  const hay = `${evidence.source_name || ''} ${evidence.title || ''} ${evidence.url || ''}`.toLowerCase();
  if (/(sec\.gov|investor|annual report|earnings call|press release|official)/.test(hay)) return 0.22;
  if (/(reuters|bloomberg|wsj|ft\.com|apnews|cnbc|bbc)/.test(hay)) return 0.16;
  if (/(wikipedia|wikidata|google news)/.test(hay)) return 0.1;
  return 0.06;
}

function hasRecentEvidence(evidence: Evidence[]) {
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  return evidence.some((ev) => {
    if (!ev.published_at) return false;
    const t = new Date(ev.published_at).getTime();
    return Number.isFinite(t) && now - t >= 0 && now - t <= oneYearMs;
  });
}

function recomputeClaimConfidence(claim: ApiClaim) {
  const base = Number(claim.confidence || 0.55);
  const evidence = claim.evidence || [];
  const uniqueDomains = new Set(evidence.map((e) => domainFromUrl(e.url)).filter(Boolean));
  const corroborationBonus = Math.min(0.2, Math.max(0, uniqueDomains.size - 1) * 0.08);
  const authorityBonus = evidence.length ? Math.max(...evidence.map(evidenceAuthorityScore)) : 0;
  const snippetQualityBonus = evidence.some((ev) => (ev.snippet || '').split(/\s+/).length >= 8) ? 0.05 : 0;
  const timeframeBonus = claim.timeframe ? 0.04 : 0;
  const recencyBonus = hasRecentEvidence(evidence) ? 0.04 : 0;
  const thinEvidencePenalty = evidence.length <= 1 ? 0.04 : 0;

  const computed = base + corroborationBonus + authorityBonus + snippetQualityBonus + timeframeBonus + recencyBonus - thinEvidencePenalty;
  const final = clamp01(computed);

  return {
    final,
    breakdown: {
      base,
      corroborationBonus,
      authorityBonus,
      snippetQualityBonus,
      timeframeBonus,
      recencyBonus,
      thinEvidencePenalty,
      final
    }
  };
}

function computeCompanyRating(claims: ApiClaim[]) {
  if (!claims.length) {
    return {
      score: 50,
      label: 'Insufficient Data' as const,
      successRate: 0,
      totalClaims: 0,
      statusBreakdown: {}
    };
  }

  const weights: Record<ApiClaim['status'], number> = {
    success: 1.0,
    ongoing: 0.7,
    partial: 0.55,
    unknown: 0.45,
    delayed: 0.2,
    cancelled: 0.05
  };

  const statusBreakdown: Record<string, number> = {};
  let weighted = 0;

  for (const claim of claims) {
    statusBreakdown[claim.status] = (statusBreakdown[claim.status] || 0) + 1;
    weighted += weights[claim.status] ?? 0.45;
  }

  const successRate = weighted / claims.length;
  const score = Math.round(successRate * 100);
  const label: 'Mostly Successful' | 'Mixed' | 'Mostly Struggling' =
    score >= 65 ? 'Mostly Successful'
      : score >= 45 ? 'Mixed'
        : 'Mostly Struggling';

  return {
    score,
    label,
    successRate: Number(successRate.toFixed(3)),
    totalClaims: claims.length,
    statusBreakdown
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const data = (await response.json()) as WikiSummary;
    if (!data?.extract && !data?.description) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchWikidataFacts(itemId?: string): Promise<WikidataFacts> {
  if (!itemId) return {};
  try {
    const sparql = `
SELECT
  (SAMPLE(?hqLabel) AS ?hqLabel)
  (SAMPLE(?inception) AS ?inception)
  (SAMPLE(?founderLabel) AS ?founderLabel)
  (SAMPLE(?industryLabel) AS ?industryLabel)
  (SAMPLE(?website) AS ?website)
WHERE {
  OPTIONAL { wd:${itemId} wdt:P159 ?hq. }
  OPTIONAL { wd:${itemId} wdt:P571 ?inception. }
  OPTIONAL { wd:${itemId} wdt:P112 ?founder. }
  OPTIONAL { wd:${itemId} wdt:P452 ?industry. }
  OPTIONAL { wd:${itemId} wdt:P856 ?website. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1
`;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'TruthLedger/1.0 (http://localhost:3000)'
      }
    });
    if (!response.ok) return {};
    const json = (await response.json()) as { results?: { bindings?: Array<Record<string, { value?: string }>> } };
    const row = json.results?.bindings?.[0];
    if (!row) return {};
    return {
      hq: row.hqLabel?.value,
      inception: row.inception?.value ? row.inception.value.slice(0, 10) : undefined,
      founder: row.founderLabel?.value,
      industry: row.industryLabel?.value,
      website: row.website?.value
    };
  } catch {
    return {};
  }
}

async function fetchAmbiguityOptions(entityCandidate: string, topic: string) {
  const lower = entityCandidate.toLowerCase();
  const known: Record<string, Array<{ name: string; type: 'company' | 'person' | 'thing'; hint: string; resolveTo: string }>> = {
    apple: [
      { name: 'Apple Inc.', type: 'company', hint: 'Technology company', resolveTo: 'Apple Inc.' },
      { name: 'Apple (fruit)', type: 'thing', hint: 'Fruit', resolveTo: 'Apple (fruit)' },
      { name: 'Apple Records', type: 'company', hint: 'Record label', resolveTo: 'Apple Records' }
    ],
    tesla: [
      { name: 'Tesla, Inc.', type: 'company', hint: 'Electric vehicle and energy company', resolveTo: 'Tesla, Inc.' },
      { name: 'Nikola Tesla', type: 'person', hint: 'Inventor and electrical engineer', resolveTo: 'Nikola Tesla' },
      { name: 'Tesla (unit)', type: 'thing', hint: 'SI unit of magnetic flux density', resolveTo: 'Tesla (unit)' }
    ],
    amazon: [
      { name: 'Amazon (company)', type: 'company', hint: 'Technology and e-commerce company', resolveTo: 'Amazon (company)' },
      { name: 'Amazon River', type: 'thing', hint: 'River in South America', resolveTo: 'Amazon River' }
    ]
  };

  const collected = new Map<string, { id: string; name: string; type: 'company' | 'person' | 'thing' | 'unknown'; disambiguation_hint?: string; resolveTo: string; title: string; kind: string; hint?: string }>();

  for (const opt of known[lower] || []) {
    collected.set(opt.resolveTo.toLowerCase(), {
      id: opt.resolveTo.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: opt.name,
      type: opt.type,
      disambiguation_hint: opt.hint,
      resolveTo: opt.resolveTo,
      title: opt.name,
      kind: opt.type,
      hint: opt.hint
    });
  }

  try {
    const openUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(entityCandidate)}&limit=7&namespace=0&format=json`;
    const openResp = await fetchWithTimeout(openUrl);
    if (openResp.ok) {
      const data = (await openResp.json()) as [string, string[], string[], string[]];
      const titles = data?.[1] || [];
      const descriptions = data?.[2] || [];
      for (let i = 0; i < titles.length; i++) {
        const name = titles[i];
        const hint = descriptions[i] || '';
        const type = inferOptionType(name, hint);
        const resolveTo = name;
        const key = resolveTo.toLowerCase();
        if (!collected.has(key)) {
          collected.set(key, {
            id: key.replace(/[^a-z0-9]+/g, '-'),
            name,
            type,
            disambiguation_hint: hint || undefined,
            resolveTo,
            title: name,
            kind: type,
            hint: hint || undefined
          });
        }
      }
    }
  } catch {
    // Keep known-option fallbacks only.
  }

  const options = Array.from(collected.values());
  if (hasClimateTopic(topic)) {
    options.sort((a, b) => (a.type === 'company' ? 0 : 1) - (b.type === 'company' ? 0 : 1));
  }
  return options.slice(0, 7);
}

async function fetchNewsSources(query: string, limit = 10): Promise<SourceDoc[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetchWithTimeout(rssUrl);
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);
    const docs: SourceDoc[] = [];

    for (const match of items) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
      const url = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const description = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      const snippet = limitWords(title || description || '', 25);
      const text = [title, description].filter(Boolean).join('. ');
      if (!url || !text) continue;

      docs.push({
        url,
        title: title || 'News source',
        snippet,
        text,
        source_name: 'Google News'
      });
    }

    return docs;
  } catch {
    return [];
  }
}

async function fetchTavilySources(query: string, limit = 8): Promise<SourceDoc[]> {
  if (!hasTavilyConfig()) return [];
  const rows = await searchClaims(query, limit);
  return rows
    .map((r: any) => {
      const text = (r.raw_content || r.content || r.snippet || '').replace(/\s+/g, ' ').trim();
      const title = (r.title || r.url || 'Web source').replace(/\s+/g, ' ').trim();
      const snippet = limitWords((r.snippet || text || '').replace(/\s+/g, ' '), 25);
      if (!r.url || !text) return null;
      return {
        url: r.url,
        title,
        snippet,
        text,
        published_at: r.published_date,
        source_name: 'Tavily'
      } as SourceDoc;
    })
    .filter((d: SourceDoc | null): d is SourceDoc => Boolean(d));
}

function buildProfileClaims(entityName: string, summary: WikiSummary | null, facts: WikidataFacts, includeProfileFacts: boolean): ApiClaim[] {
  if (!includeProfileFacts) return [];
  const extractedAt = new Date().toISOString();
  const out: ApiClaim[] = [];
  const sourceUrl = summary?.content_urls?.desktop?.page || (summary?.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}` : '');
  const sourceTitle = summary?.title || entityName;

  if (summary?.description) {
    out.push({
      id: 'profile-1',
      type: 'metric',
      category: 'metric',
      status: 'unknown',
      statement: `${sourceTitle} is ${summary.description}.`,
      text: `${sourceTitle} is ${summary.description}.`,
      confidence: 0.9,
      subject: sourceTitle,
      action: 'is',
      object: summary.description || '',
      attribution: { org: sourceTitle, source_type: 'official' },
      evidence: [{ url: sourceUrl, title: sourceTitle, snippet: limitWords(summary.extract || summary.description, 25), source_name: 'Wikipedia' }],
      negative: false,
      keywords: ['profile'],
      extracted_at: extractedAt
    });
  }
  if (facts.inception) {
    out.push({
      id: 'profile-2',
      type: 'metric',
      category: 'metric',
      status: 'unknown',
      statement: `${sourceTitle} was founded in ${facts.inception}.`,
      text: `${sourceTitle} was founded in ${facts.inception}.`,
      confidence: 0.95,
      subject: sourceTitle,
      action: 'founded',
      object: facts.inception,
      timeframe: facts.inception,
      attribution: { org: sourceTitle, source_type: 'official' },
      evidence: [{ url: `https://www.wikidata.org/wiki/${summary?.wikibase_item || ''}`, title: sourceTitle, snippet: limitWords(`Founded: ${facts.inception}`, 25), source_name: 'Wikidata' }],
      negative: false,
      keywords: ['founded'],
      extracted_at: extractedAt,
      normalized: { date: facts.inception }
    });
  }
  if (facts.hq) {
    out.push({
      id: 'profile-3',
      type: 'metric',
      category: 'metric',
      status: 'unknown',
      statement: `${sourceTitle} is headquartered in ${facts.hq}.`,
      text: `${sourceTitle} is headquartered in ${facts.hq}.`,
      confidence: 0.95,
      subject: sourceTitle,
      action: 'headquartered',
      object: facts.hq,
      attribution: { org: sourceTitle, source_type: 'official' },
      evidence: [{ url: `https://www.wikidata.org/wiki/${summary?.wikibase_item || ''}`, title: sourceTitle, snippet: limitWords(`Headquarters: ${facts.hq}`, 25), source_name: 'Wikidata' }],
      negative: false,
      keywords: ['headquarters'],
      extracted_at: extractedAt
    });
  }
  if (facts.website) {
    out.push({
      id: 'profile-4',
      type: 'metric',
      category: 'metric',
      status: 'unknown',
      statement: `${sourceTitle}'s official website is ${facts.website}.`,
      text: `${sourceTitle}'s official website is ${facts.website}.`,
      confidence: 0.95,
      subject: sourceTitle,
      action: 'website',
      object: facts.website,
      attribution: { org: sourceTitle, source_type: 'official' },
      evidence: [{ url: `https://www.wikidata.org/wiki/${summary?.wikibase_item || ''}`, title: sourceTitle, snippet: limitWords(`Website: ${facts.website}`, 25), source_name: 'Wikidata' }],
      negative: false,
      keywords: ['website'],
      extracted_at: extractedAt
    });
  }

  return out;
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const rawInput = decodeURIComponent(params.name || '');
  const forcedTopic = req.nextUrl.searchParams.get('topic') || undefined;
  const mode = toMode(req.nextUrl.searchParams.get('mode'));
  const includeProfileFacts = parseBool(req.nextUrl.searchParams.get('includeProfileFacts'), true);
  const broadenClaimTypes = parseBool(req.nextUrl.searchParams.get('broadenClaimTypes'), true);
  const includePlannedCommitments = parseBool(req.nextUrl.searchParams.get('includePlanned'), true);

  const { entityCandidate, topic } = parseQueryInput(rawInput, forcedTopic);
  const query = `${entityCandidate}${topic ? ` ${topic}` : ''}`.trim();
  const normalized = normalizeName(entityCandidate);
  const updatedAt = new Date().toISOString();

  if (!entityCandidate) {
    return NextResponse.json({ error: 'Missing entity name' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const shouldClarify = KNOWN_AMBIGUOUS.has(normalized) && !looksResolvedEntity(entityCandidate);
  if (shouldClarify) {
    const options = await fetchAmbiguityOptions(entityCandidate, topic);
    const promptA = options[0];
    const promptB = options[1];
    const question = promptA && promptB
      ? `Do you mean ${promptA.name}${promptA.disambiguation_hint ? ` (${promptA.disambiguation_hint})` : ''} or ${promptB.name}${promptB.disambiguation_hint ? ` (${promptB.disambiguation_hint})` : ''}?`
      : `Do you mean a specific entity for "${entityCandidate}"?`;

    const payload: EntityResponse = {
      entity: {
        id: normalized.replace(/[^a-z0-9]+/g, '-') || 'entity',
        name: entityCandidate,
        type: 'unknown'
      },
      ambiguous: true,
      question,
      options,
      claims: [],
      retrieval: {
        query,
        expanded_queries: [],
        sources_considered: 0,
        sources_returned: [],
        mode
      },
      query,
      entityCandidate,
      topic,
      normalized,
      updatedAt,
      message: 'Please clarify entity before claim extraction.'
    };

    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  const candidates = Array.from(new Set([
    `${entityCandidate}, Inc.`,
    `${entityCandidate} Inc.`,
    `${entityCandidate} (company)`,
    `${entityCandidate} company`,
    entityCandidate
  ]));

  let summary: WikiSummary | null = null;
  let resolvedTitle = entityCandidate;
  let sawDisambiguation = false;

  for (const candidate of candidates) {
    const item = await fetchWikiSummary(candidate);
    if (!item) continue;
    if (isDisambiguation(item)) {
      sawDisambiguation = true;
      continue;
    }
    summary = item;
    resolvedTitle = item.title || candidate;
    break;
  }

  if (!summary && sawDisambiguation) {
    const options = await fetchAmbiguityOptions(entityCandidate, topic);
    const payload: EntityResponse = {
      entity: {
        id: normalized.replace(/[^a-z0-9]+/g, '-') || 'entity',
        name: entityCandidate,
        type: 'unknown'
      },
      ambiguous: true,
      question: `Do you mean one of these ${entityCandidate} entities?`,
      options,
      claims: [],
      retrieval: {
        query,
        expanded_queries: [],
        sources_considered: 0,
        sources_returned: [],
        mode
      },
      query,
      entityCandidate,
      topic,
      normalized,
      updatedAt
    };
    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  const facts = summary ? await fetchWikidataFacts(summary.wikibase_item) : {};
  const profileLabel = summary ? 'Profile source: Wikipedia/Wikidata' : undefined;

  const expandedQueries = buildExpandedQueries(resolvedTitle, topic, mode);
  const sourceDocs: SourceDoc[] = [];

  if (summary) {
    sourceDocs.push({
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle)}`,
      title: summary.title || resolvedTitle,
      snippet: limitWords(summary.extract || summary.description || '', 25),
      text: `${summary.extract || ''} ${summary.description || ''}`.trim(),
      source_name: 'Wikipedia'
    });
  }

  const retrievalBatches = await Promise.allSettled(
    expandedQueries.map(async (q) => {
      const [newsRows, tavilyRows] = await Promise.all([
        fetchNewsSources(q, mode === 'broad' ? 8 : 5),
        fetchTavilySources(q, mode === 'broad' ? 6 : 4)
      ]);
      return [...newsRows, ...tavilyRows];
    })
  );
  for (const batch of retrievalBatches) {
    if (batch.status === 'fulfilled') {
      sourceDocs.push(...batch.value);
    }
  }

  const fixtureRows = getFixtureClaims(resolvedTitle, topic);
  if (!hasTavilyConfig() && fixtureRows.sources.length) {
    sourceDocs.push(...fixtureRows.sources);
  }

  const dedupSourceMap = new Map<string, SourceDoc>();
  for (const row of sourceDocs) {
    if (!row.url) continue;
    if (!dedupSourceMap.has(row.url)) dedupSourceMap.set(row.url, row);
  }
  const dedupSources = Array.from(dedupSourceMap.values());

  const pass1Sources = dedupSources.slice(0, mode === 'strict' ? 10 : 16);
  const toApiClaim = (claim: any): ApiClaim => ({
    id: claim.id,
    type: claim.category,
    statement: claim.statement,
    category: claim.category,
    status: claim.status,
    text: claim.statement,
    normalized: claim.normalized,
    confidence: claim.confidence,
    subject: claim.subject,
    action: claim.action,
    object: claim.object,
    timeframe: claim.timeframe,
    attribution: claim.attribution,
    evidence: claim.evidence,
    negative: Boolean(claim.negative),
    keywords: claim.keywords || [],
    extracted_at: updatedAt
  });

  const pass1Claims: ApiClaim[] = pass1Sources.flatMap((source) =>
    extractRealClaimsFromSource(
      {
        entityName: resolvedTitle,
        entityId: normalizeName(resolvedTitle).replace(/[^a-z0-9]+/g, '-') || 'entity',
        text: source.text,
        title: source.title,
        url: source.url,
        published_at: source.published_at,
        source_name: source.source_name
      },
      includePlannedCommitments
    ).map(toApiClaim)
  );

  let extractedClaims = [...pass1Claims];
  const minClaimTarget = mode === 'strict' ? 3 : 5;
  if (extractedClaims.length < minClaimTarget && mode !== 'strict' && broadenClaimTypes) {
    const pass2Sources = dedupSources.slice(0, mode === 'balanced' ? 28 : 45);
    const pass2Claims: ApiClaim[] = pass2Sources.flatMap((source) =>
      extractRealClaimsFromSource(
        {
          entityName: resolvedTitle,
          entityId: normalizeName(resolvedTitle).replace(/[^a-z0-9]+/g, '-') || 'entity',
          text: source.text,
          title: source.title,
          url: source.url,
          published_at: source.published_at,
          source_name: source.source_name
        },
        includePlannedCommitments
      ).map(toApiClaim)
    );

    const dedup = new Map<string, ApiClaim>();
    for (const claim of [...extractedClaims, ...pass2Claims]) {
      const key = `${claim.category}:${claim.statement.toLowerCase().replace(/\s+/g, ' ')}`;
      if (!dedup.has(key)) {
        dedup.set(key, { ...claim, type: claim.category, text: claim.statement });
      } else {
        const prev = dedup.get(key)!;
        const mergedEvidence = [...prev.evidence];
        for (const ev of claim.evidence) {
          if (!mergedEvidence.some((x) => x.url === ev.url)) mergedEvidence.push(ev);
        }
        prev.evidence = mergedEvidence;
        prev.confidence = Math.min(0.98, Math.max(prev.confidence, claim.confidence) + 0.02);
      }
    }
    extractedClaims = Array.from(dedup.values());
  }

  const allClaims = [...extractedClaims]
    .filter((c) => c.evidence?.length)
    .slice(0, mode === 'broad' ? 20 : 14);

  if (!hasTavilyConfig() && fixtureRows.claims.length) {
    const fixtureClaimMap = new Map(allClaims.map((c) => [c.text.toLowerCase(), c]));
    for (const fixtureClaim of fixtureRows.claims as ApiClaimFixture[]) {
      if (!fixtureClaimMap.has(fixtureClaim.text.toLowerCase()) && fixtureClaim.evidence?.length) {
        const mappedType = fixtureClaim.type === 'commitment' ? 'planned' : fixtureClaim.type === 'progress' ? 'in_progress' : null;
        if (!mappedType) continue;
        allClaims.push({
          id: `fixture-${allClaims.length + 1}`,
          type: mappedType,
          category: mappedType,
          status: fixtureClaim.type === 'commitment' ? 'unknown' : fixtureClaim.type === 'progress' ? 'ongoing' : 'partial',
          statement: fixtureClaim.text,
          text: fixtureClaim.text,
          confidence: 0.7,
          subject: resolvedTitle,
          action: 'reported',
          object: fixtureClaim.text,
          attribution: { org: resolvedTitle, source_type: 'news' },
          evidence: fixtureClaim.evidence,
          negative: false,
          keywords: ['fixture'],
          extracted_at: updatedAt
        });
      }
    }
  }

  const includeMetric = mode === 'broad' || hasFinanceTopic(topic);
  const baseAllowed = new Set<ClaimType>(['implemented', 'in_progress', 'planned', 'failed']);
  if (includeMetric) baseAllowed.add('metric');

  const filteredClaims = allClaims
    .filter((claim) => {
      if (!baseAllowed.has(claim.category)) return false;
      if (!includePlannedCommitments && claim.category === 'planned') return false;
      if (!broadenClaimTypes && claim.category === 'metric') return false;
      return true;
    })
    .sort((a, b) => {
      const rank = (type: ClaimType) => {
        if (type === 'implemented') return 5;
        if (type === 'in_progress') return 4;
        if (type === 'failed') return 4;
        if (type === 'planned') return 3;
        return 1;
      };
      const byType = rank(b.category) - rank(a.category);
      if (byType !== 0) return byType;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    });

  for (const claim of filteredClaims) {
    const scored = recomputeClaimConfidence(claim);
    claim.confidence = scored.final;
    claim.confidence_breakdown = scored.breakdown;
  }

  if (filteredClaims.length === 0) {
    const emergencyFixture = getFixtureClaims(resolvedTitle, topic);
    for (const fixtureClaim of emergencyFixture.claims as ApiClaimFixture[]) {
      if (!fixtureClaim.evidence?.length) continue;
      const mappedType = fixtureClaim.type === 'commitment' ? 'planned' : fixtureClaim.type === 'progress' ? 'in_progress' : null;
      if (!mappedType) continue;
      filteredClaims.push({
        id: `fixture-fallback-${filteredClaims.length + 1}`,
        type: mappedType,
        category: mappedType,
        status: fixtureClaim.type === 'commitment' ? 'unknown' : fixtureClaim.type === 'progress' ? 'ongoing' : 'partial',
        statement: fixtureClaim.text,
        text: fixtureClaim.text,
        confidence: 0.68,
        subject: resolvedTitle,
        action: 'reported',
        object: fixtureClaim.text,
        attribution: { org: resolvedTitle, source_type: 'news' },
        evidence: fixtureClaim.evidence,
        negative: false,
        keywords: ['fixture'],
        extracted_at: updatedAt
      });
    }
  }

  const retrievalSources: RetrievalSource[] = dedupSources.slice(0, 8).map((s) => ({
    url: s.url,
    title: s.title,
    snippet: s.snippet
  }));

  const entityId = normalizeName(resolvedTitle).replace(/[^a-z0-9]+/g, '-') || 'entity';
  const entityType = summary ? inferEntityType(summary) : 'unknown';

  const payload: EntityResponse = {
    entity: {
      id: entityId,
      name: resolvedTitle,
      type: entityType,
      description: summary?.description,
      website: facts.website,
      hq: facts.hq,
      founded: facts.inception,
      source_label: profileLabel
    },
    claims: filteredClaims,
    retrieval: {
      query,
      expanded_queries: expandedQueries,
      sources_considered: dedupSources.length,
      sources_returned: retrievalSources,
      mode
    },
    assessment: {
      confidenceAverage: filteredClaims.length
        ? Number((filteredClaims.reduce((sum, c) => sum + Number(c.confidence || 0), 0) / filteredClaims.length).toFixed(3))
        : 0,
      companyRating: computeCompanyRating(filteredClaims)
    },
    message: filteredClaims.length
      ? undefined
      : 'No verifiable implementation/progress/failure claims found in current sources',
      query,
      entityCandidate,
      topic,
      includePlannedCommitments,
      normalized,
    resolvedEntity: {
      title: resolvedTitle,
      url: summary?.content_urls?.desktop?.page,
      kind: entityType
    },
    updatedAt
  };

  console.log('[api/entity]', {
    query,
    resolvedTitle,
    ambiguous: false,
    claimsCount: filteredClaims.length,
    sources: dedupSources.length,
    mode
  });

  return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
