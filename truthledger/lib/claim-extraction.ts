import { ACTION_LEXICONS, ClaimAttribution, ClaimCategorySemantic, ClaimObject, ClaimStatusSemantic } from '@/lib/types';

export type CandidateSource = {
  entityName: string;
  entityId: string;
  text: string;
  title: string;
  url: string;
  published_at?: string;
  source_name?: string;
};

const META_PATTERNS = [
  /\b(the article claims|people claim|it is claimed|claim that)\b/i,
  /\b(promises? as a concept|debate about promises|questionable claims)\b/i,
  /\b(rumor|anonymous source|unconfirmed|speculation)\b/i
];

const ACTIONS = [
  ...ACTION_LEXICONS.implemented,
  ...ACTION_LEXICONS.in_progress,
  ...ACTION_LEXICONS.planned,
  ...ACTION_LEXICONS.failed,
  ...ACTION_LEXICONS.metric
].sort((a, b) => b.length - a.length);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ACTION_REGEX = new RegExp(`\\b(${ACTIONS.map(escapeRegex).join('|')})\\b`, 'i');

export function splitSentences(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasMetricNumber(text: string) {
  return /(\$\d|\d+%|\b\d+(\.\d+)?\b)/.test(text);
}

function extractTimeframe(text: string) {
  const m = text.match(/\b(Q[1-4]\s*20\d{2}|20\d{2}|by\s+20\d{2}|as of\s+[A-Za-z]+\s+\d{4})\b/i);
  return m ? m[0] : undefined;
}

function extractNumericInfo(text: string) {
  const metricMatch =
    text.match(/\b(\$?\d+(?:\.\d+)?)(\s?%|\s?(?:billion|million|thousand|bn|m|k))\b/i) ||
    text.match(/\b(\$?\d+(?:,\d{3})*(?:\.\d+)?)\b/);
  if (!metricMatch) return {};

  const rawValue = (metricMatch[1] || '').replace(/,/g, '').trim();
  const rawUnit = (metricMatch[2] || '').trim();
  const isCurrency = rawValue.startsWith('$');
  const value = isCurrency ? rawValue.slice(1) : rawValue;
  const unit = isCurrency ? `$${rawUnit ? ` ${rawUnit}` : ''}`.trim() : rawUnit || undefined;

  return {
    value,
    unit,
    polarity: /\b(reduced|declined|missed|down|decrease|lower)\b/i.test(text)
      ? ('negative' as const)
      : /\b(increased|improved|reached|hit|exceeded|grew|up)\b/i.test(text)
        ? ('positive' as const)
        : ('neutral' as const)
  };
}

function parseTimeToken(input: string | null) {
  if (!input) return undefined;
  const raw = input.trim().toLowerCase();
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) return Number(raw);

  const hms = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const h = Number(hms[1] || 0);
    const m = Number(hms[2] || 0);
    const s = Number(hms[3] || 0);
    return h * 3600 + m * 60 + s;
  }

  const colon = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (colon) {
    if (colon[3]) return Number(colon[1]) * 3600 + Number(colon[2]) * 60 + Number(colon[3]);
    return Number(colon[1]) * 60 + Number(colon[2]);
  }

  return undefined;
}

function extractYouTubeReference(url: string, text: string) {
  let videoId: string | undefined;
  let start: number | undefined;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v') || undefined;
      start = parseTimeToken(parsed.searchParams.get('t')) ?? parseTimeToken(parsed.searchParams.get('start'));
    } else if (host.includes('youtu.be')) {
      const pathId = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      videoId = pathId || undefined;
      start = parseTimeToken(parsed.searchParams.get('t')) ?? parseTimeToken(parsed.searchParams.get('start'));
    }
  } catch {
    // ignore invalid URL
  }

  if (!start) {
    const inline = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (inline) start = parseTimeToken(inline[1]);
  }

  if (!videoId) return { videoId: undefined, start: undefined };
  return { videoId, start };
}

function attributionFromSource(source: CandidateSource, sentence: string): ClaimAttribution {
  const speakerMatch = sentence.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(said|stated|announced|told)\b/);
  const domainOfficial = /(investor|ir\.|sec\.gov|annual report|earnings call|press release|about\.)/i.test(`${source.url} ${source.title}`);
  return {
    speaker: speakerMatch?.[1],
    org: source.entityName,
    role: speakerMatch ? 'Spokesperson' : undefined,
    source_type: domainOfficial ? (source.url.includes('sec.gov') ? 'filing' : 'official') : 'news'
  };
}

function categoryFromAction(action: string): ClaimCategorySemantic {
  const a = action.toLowerCase();
  if (ACTION_LEXICONS.implemented.some((v) => v === a)) return 'implemented';
  if (ACTION_LEXICONS.in_progress.some((v) => v === a)) return 'in_progress';
  if (ACTION_LEXICONS.planned.some((v) => v === a)) return 'planned';
  if (ACTION_LEXICONS.failed.some((v) => v === a)) return 'failed';
  return 'metric';
}

function statusFromCategory(category: ClaimCategorySemantic): ClaimStatusSemantic {
  if (category === 'implemented') return 'success';
  if (category === 'in_progress') return 'ongoing';
  if (category === 'planned') return 'unknown';
  if (category === 'failed') return 'delayed';
  return 'partial';
}

function normalizeStatement(entityName: string, sentence: string) {
  const clean = sentence.replace(/\s+/g, ' ').trim();
  if (clean.toLowerCase().includes(entityName.toLowerCase())) return clean;
  return `${entityName} ${clean}`.replace(/\s+/g, ' ').trim();
}

function extractProposition(entityName: string, sentence: string) {
  const actionMatch = sentence.match(ACTION_REGEX);
  if (!actionMatch) return null;
  const action = actionMatch[1];
  const idx = sentence.toLowerCase().indexOf(action.toLowerCase());
  if (idx < 0) return null;
  const before = sentence.slice(0, idx).trim();
  const after = sentence.slice(idx + action.length).trim().replace(/^[\s:-]+/, '');
  const subject = before || entityName;
  const object = after.replace(/[.;]+$/, '').trim();
  if (!object) return null;
  return { subject, action, object };
}

export function scoreClaim(claim: ClaimObject) {
  let score = 0.35;

  if (claim.category === 'implemented' || claim.category === 'failed' || claim.category === 'metric') score += 0.25;
  if (claim.timeframe && /20\d{2}|Q[1-4]/i.test(claim.timeframe)) score += 0.15;
  if (hasMetricNumber(claim.statement)) score += 0.15;
  if (claim.evidence.some((e) => Boolean(e.quote))) score += 0.1;

  if (META_PATTERNS.some((p) => p.test(claim.statement))) score -= 0.4;
  if (/\b(claims?|promises?)\b/i.test(claim.statement) && !ACTION_REGEX.test(claim.statement)) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}

export function isRealClaim(claim: ClaimObject) {
  const hasAttribution = Boolean(claim.attribution && (claim.attribution.speaker || claim.attribution.org || claim.attribution.source_type === 'official' || claim.attribution.source_type === 'filing'));
  const hasEvidence = Boolean(claim.evidence?.length && claim.evidence[0].url);
  const hasVerb = ACTION_REGEX.test(claim.statement) || Boolean(claim.action);
  const hasObject = Boolean(claim.object && claim.object.trim().length > 1);
  if (!hasAttribution || !hasEvidence || !hasVerb || !hasObject) return false;
  return scoreClaim(claim) >= 0.55;
}

export function extractRealClaimsFromSource(source: CandidateSource, includePlanned = true): ClaimObject[] {
  const out: ClaimObject[] = [];
  const sentences = splitSentences(source.text).slice(0, 40);

  for (const sentence of sentences) {
    if (!sentence.toLowerCase().includes(source.entityName.toLowerCase().split(' ')[0].toLowerCase())) continue;
    if (!ACTION_REGEX.test(sentence)) continue;
    const prop = extractProposition(source.entityName, sentence);
    if (!prop) continue;

    const category = categoryFromAction(prop.action.toLowerCase());
    if (!includePlanned && category === 'planned') continue;

    const attribution = attributionFromSource(source, sentence);
    const yt = extractYouTubeReference(source.url, sentence);
    const numeric = extractNumericInfo(sentence);
    const timeframe = extractTimeframe(sentence);
    const claim: ClaimObject = {
      id: `${source.entityId}-${out.length + 1}`,
      entityId: source.entityId,
      statement: normalizeStatement(source.entityName, sentence),
      category,
      status: statusFromCategory(category),
      subject: prop.subject,
      action: prop.action,
      object: prop.object,
      timeframe,
      confidence: 0,
      attribution,
      evidence: [
        {
          url: source.url,
          title: source.title,
          snippet: sentence.split(/\s+/).slice(0, 25).join(' '),
          quote: sentence,
          published_at: source.published_at,
          source_name: source.source_name,
          videoId: yt.videoId,
          start: yt.start
        }
      ],
      negative: category === 'failed',
      keywords: [prop.action],
      normalized: {
        value: numeric.value,
        unit: numeric.unit,
        date: timeframe,
        timeframe,
        polarity: numeric.polarity
      }
    };

    claim.confidence = scoreClaim(claim);
    if (isRealClaim(claim)) {
      out.push(claim);
    }
  }

  return out;
}
