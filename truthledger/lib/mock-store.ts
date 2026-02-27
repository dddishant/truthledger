import { calculateOverpromiseIndex, calculateReliabilityScore } from '@/lib/scoring';
import { Claim, ClaimCategory, ClaimCertainty, ClaimStatus, Company, Person, VoiceAnalysis } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type EntityType = 'company' | 'person';

type StoredEntity = {
  type: EntityType;
  entity: Company | Person;
  claims: Claim[];
  voiceAnalyses: VoiceAnalysis[];
  scoreHistory: { date: string; score: number }[];
};

const db = {
  entities: new Map<string, StoredEntity>(),
  claimsById: new Map<string, { entityName: string; claim: Claim }>()
};

function nowIso() {
  return new Date().toISOString();
}

function dateOnly(iso: string) {
  return iso.slice(0, 10);
}

function ensureEntity(entityName: string, entityType: EntityType, ticker?: string) {
  const key = entityName.toLowerCase();
  const existing = db.entities.get(key);
  if (existing) return existing;

  const ts = nowIso();
  const entity = entityType === 'company'
    ? ({
        id: uuidv4(),
        name: entityName,
        ticker: ticker || '',
        industry: 'Technology',
        reliabilityScore: 50,
        overpromiseIndex: 'Low',
        createdAt: ts,
        updatedAt: ts
      } as Company)
    : ({
        id: uuidv4(),
        name: entityName,
        role: 'Public Figure',
        reliabilityScore: 50,
        createdAt: ts,
        updatedAt: ts
      } as Person);

  const store: StoredEntity = { type: entityType, entity, claims: [], voiceAnalyses: [], scoreHistory: [] };
  db.entities.set(key, store);
  return store;
}

function refreshScores(store: StoredEntity) {
  const score = calculateReliabilityScore(store.claims);
  const overpromise = calculateOverpromiseIndex(store.claims);
  (store.entity as any).reliabilityScore = score;
  if ('overpromiseIndex' in store.entity) {
    (store.entity as Company).overpromiseIndex = overpromise;
  }
  store.entity.updatedAt = nowIso();
  store.scoreHistory.push({ date: dateOnly(store.entity.updatedAt), score });
  store.scoreHistory = store.scoreHistory.slice(-20);
}

function mockClaims(entityName: string, sourceUrl?: string): Claim[] {
  const d = new Date();
  const nextYear = String(d.getFullYear() + 1);
  const sourceDate = nowIso();
  return [
    {
      id: uuidv4(),
      text: `${entityName} will launch two major AI products by Q4 ${nextYear}.`,
      category: 'Product',
      metric: 'product launches',
      target: '2 major AI products',
      deadline: `Q4 ${nextYear}`,
      certainty: 'Definitive',
      status: 'Unknown',
      sourceType: 'web',
      sourceUrl: sourceUrl || 'https://example.com/press-release',
      sourceDate,
      evidence: [],
      createdAt: sourceDate,
      updatedAt: sourceDate
    },
    {
      id: uuidv4(),
      text: `${entityName} targets 30% growth in annual revenue by ${nextYear}.`,
      category: 'Financial',
      metric: 'annual revenue growth',
      target: '30%',
      deadline: nextYear,
      certainty: 'Aspirational',
      status: 'Unknown',
      sourceType: 'web',
      sourceUrl: sourceUrl || 'https://example.com/investor-call',
      sourceDate,
      evidence: [],
      createdAt: sourceDate,
      updatedAt: sourceDate
    },
    {
      id: uuidv4(),
      text: `${entityName} commits to reduce carbon emissions by 50% before 2030.`,
      category: 'ESG',
      metric: 'carbon emissions',
      target: '50% reduction',
      deadline: '2030-12-31',
      certainty: 'Definitive',
      status: 'Unknown',
      sourceType: 'web',
      sourceUrl: sourceUrl || 'https://example.com/sustainability',
      sourceDate,
      evidence: [],
      createdAt: sourceDate,
      updatedAt: sourceDate
    }
  ];
}

export function scanEntity(entityName: string, entityType: EntityType, ticker?: string) {
  const store = ensureEntity(entityName, entityType, ticker);
  const newClaims = mockClaims(entityName);
  for (const claim of newClaims) {
    store.claims.push(claim);
    db.claimsById.set(claim.id, { entityName: store.entity.name, claim });
  }
  refreshScores(store);
  return {
    success: true,
    entityName,
    claimsFound: newClaims.length,
    urlsScanned: 3,
    reliabilityScore: (store.entity as any).reliabilityScore,
    overpromiseIndex: (store.entity as any).overpromiseIndex || 'Low',
    errors: [] as string[]
  };
}

export function getEntity(entityName: string) {
  const store = db.entities.get(entityName.toLowerCase());
  if (!store) return null;
  return {
    entity: store.entity,
    entityType: store.type,
    claims: store.claims,
    voiceAnalyses: store.voiceAnalyses,
    scoreHistory: store.scoreHistory
  };
}

export function addClaims(entityName: string, claims: Partial<Claim>[], sourceType: Claim['sourceType']) {
  const store = ensureEntity(entityName, 'company');
  const ts = nowIso();
  const created: Claim[] = claims.map((c) => ({
    id: uuidv4(),
    text: c.text || `Mock claim for ${entityName}`,
    category: c.category || 'Other',
    metric: c.metric || '',
    target: c.target || '',
    deadline: c.deadline || 'Unspecified',
    certainty: c.certainty || 'Aspirational',
    status: 'Unknown',
    sourceType,
    sourceUrl: c.sourceUrl || 'uploaded-file',
    sourceDate: c.sourceDate || ts,
    evidence: [],
    createdAt: ts,
    updatedAt: ts
  }));
  for (const claim of created) {
    store.claims.push(claim);
    db.claimsById.set(claim.id, { entityName: store.entity.name, claim });
  }
  refreshScores(store);
  return created;
}

export function updateEvidence(entityName: string, claimId?: string) {
  const store = db.entities.get(entityName.toLowerCase());
  if (!store) return { success: true, evidenceAdded: 0 };
  const candidates = claimId ? store.claims.filter((c) => c.id === claimId) : store.claims.slice(0, 10);
  let evidenceAdded = 0;

  for (const claim of candidates) {
    const evidence = {
      id: uuidv4(),
      text: `Latest coverage discussing progress on: ${claim.metric || claim.text}`,
      url: `https://example.com/evidence/${claim.id}`,
      date: nowIso(),
      stance: (Math.random() > 0.6 ? 'Contradicting' : 'Supporting') as 'Supporting' | 'Contradicting',
      summary: Math.random() > 0.6 ? 'Recent reports suggest timeline slippage against the original promise.' : 'Recent updates indicate measurable progress toward the stated target.',
      sourceType: 'web' as const,
      createdAt: nowIso()
    };
    claim.evidence = [...(claim.evidence || []), evidence];
    claim.status = evidence.stance === 'Supporting' ? 'On Track' : 'Behind';
    claim.updatedAt = nowIso();
    evidenceAdded++;
  }

  refreshScores(store);
  return { success: true, evidenceAdded };
}

export function addVoiceAnalysis(entityName: string, payload: Omit<VoiceAnalysis, 'id' | 'createdAt'>) {
  const store = ensureEntity(entityName, 'company');
  const created: VoiceAnalysis = { ...payload, id: uuidv4(), createdAt: nowIso() };
  store.voiceAnalyses.unshift(created);
  store.voiceAnalyses = store.voiceAnalyses.slice(0, 10);
  store.entity.updatedAt = nowIso();
  return created;
}

export function getClaim(claimId: string) {
  const row = db.claimsById.get(claimId);
  if (!row) return null;
  const entity = db.entities.get(row.entityName.toLowerCase());
  return { claim: row.claim, entity: entity?.entity || null };
}

export function patchClaim(claimId: string, patch: Partial<Claim>) {
  const row = db.claimsById.get(claimId);
  if (!row) return null;
  const claim = row.claim;
  const allowed = ['status', 'category', 'certainty', 'deadline', 'metric', 'target'] as const;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      (claim as any)[key] = patch[key];
    }
  }
  claim.updatedAt = nowIso();

  const store = db.entities.get(row.entityName.toLowerCase());
  if (store) refreshScores(store);
  return claim;
}

export function buildReport(entityName: string) {
  const store = db.entities.get(entityName.toLowerCase());
  if (!store) return null;
  const summary = `${store.entity.name} has ${store.claims.length} tracked promises. ` +
    `${store.claims.filter((c) => c.status === 'On Track' || c.status === 'Fulfilled').length} show positive momentum, while ` +
    `${store.claims.filter((c) => c.status === 'Behind' || c.status === 'Contradicted' || c.status === 'Unfulfilled').length} need closer scrutiny.`;

  return {
    entity: store.entity,
    claims: store.claims,
    summary,
    generatedAt: nowIso()
  };
}

export function extractSimpleClaimsFromText(text: string, sourceUrl: string, sourceDate: string): Partial<Claim>[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 30);

  const promiseSentences = sentences.filter((s) => /(will|plan|target|aim|commit|expects?|by\s+\d{4}|Q[1-4])/i.test(s)).slice(0, 5);

  return promiseSentences.map((s) => ({
    text: s,
    category: (/revenue|profit|margin|earnings|guidance/i.test(s) ? 'Financial' : /carbon|emission|sustain/i.test(s) ? 'ESG' : /launch|product|ship|release/i.test(s) ? 'Product' : 'Other') as ClaimCategory,
    metric: /revenue|profit|margin|earnings/i.test(s) ? 'financial performance' : /carbon|emission/i.test(s) ? 'carbon emissions' : 'stated objective',
    target: (s.match(/(\d+%|\$\d+[A-Za-z]?|Q[1-4]\s*\d{4}|\d{4})/) || [''])[0],
    deadline: (s.match(/(Q[1-4]\s*\d{4}|by\s+\d{4}|\d{4})/i) || ['Unspecified'])[0].replace(/^by\s+/i, ''),
    certainty: (/(will|commit|guarantee)/i.test(s) ? 'Definitive' : /(if|subject to|pending)/i.test(s) ? 'Conditional' : 'Aspirational') as ClaimCertainty,
    sourceUrl,
    sourceDate
  }));
}

export function classifySimpleEvidence(_claimText: string, evidenceText: string): { stance: 'Supporting' | 'Contradicting' | 'Neutral'; summary: string; statusUpdate: ClaimStatus } {
  if (/(missed|delay|cut|reduced guidance|lawsuit|failed|behind)/i.test(evidenceText)) {
    return { stance: 'Contradicting', summary: 'Evidence indicates setbacks versus the original commitment.', statusUpdate: 'Behind' };
  }
  if (/(achieved|delivered|on track|completed|met target|ahead)/i.test(evidenceText)) {
    return { stance: 'Supporting', summary: 'Evidence suggests measurable progress toward the commitment.', statusUpdate: 'On Track' };
  }
  return { stance: 'Neutral', summary: 'No clear directional signal from this evidence.', statusUpdate: 'Unknown' };
}
