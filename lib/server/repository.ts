import { query } from '@/lib/server/db';
import type { Claim, Entity, Evidence, GraphData, VoiceAnalysis } from '@/lib/types';

type EntityRow = {
  id: string;
  type: 'company' | 'person';
  name: string;
  description: string;
  website: string | null;
  logo_url: string | null;
  tags: string[];
  reliability_score: number;
  overpromising_index: 'Low' | 'Medium' | 'High';
};

type ClaimRow = {
  id: string;
  subject_entity_id: string;
  speaker_entity_id: string | null;
  claim_text: string;
  structured: Claim['structured'];
  created_at: string;
  status: Claim['status'];
  status_confidence: number;
};

type EvidenceRow = {
  id: string;
  claim_id: string;
  type: Evidence['type'];
  title: string;
  snippet: string;
  source_url: string;
  published_at: string;
};

type VoiceRow = {
  id: string;
  entity_id: string;
  claim_id: string | null;
  audio_file_name: string;
  created_at: string;
  signals: VoiceAnalysis['signals'];
  summary: string;
};

function mapEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    tags: row.tags ?? [],
    reliabilityScore: row.reliability_score,
    overpromisingIndex: row.overpromising_index
  };
}

function mapClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    subjectEntityId: row.subject_entity_id,
    speakerEntityId: row.speaker_entity_id ?? undefined,
    claimText: row.claim_text,
    structured: row.structured,
    createdAt: row.created_at,
    status: row.status,
    statusConfidence: row.status_confidence
  };
}

function mapEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    claimId: row.claim_id,
    type: row.type,
    title: row.title,
    snippet: row.snippet,
    sourceUrl: row.source_url,
    publishedAt: row.published_at
  };
}

function mapVoice(row: VoiceRow): VoiceAnalysis {
  return {
    id: row.id,
    entityId: row.entity_id,
    claimId: row.claim_id ?? undefined,
    audioFileName: row.audio_file_name,
    createdAt: row.created_at,
    signals: row.signals,
    summary: row.summary
  };
}

export async function searchEntities(queryText: string): Promise<Entity[]> {
  const q = queryText.trim();
  const rows = await query<EntityRow>(
    `
    SELECT id, type, name, description, website, logo_url, tags, reliability_score, overpromising_index
    FROM entities
    WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%' OR EXISTS (
      SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE '%' || $1 || '%'
    ))
    ORDER BY reliability_score DESC, name ASC
    LIMIT 30
    `,
    [q]
  );

  return rows.map(mapEntity);
}

export async function getEntity(id: string): Promise<Entity | null> {
  const rows = await query<EntityRow>(
    `SELECT id, type, name, description, website, logo_url, tags, reliability_score, overpromising_index FROM entities WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? mapEntity(rows[0]) : null;
}

export async function getClaimsForEntity(id: string): Promise<Claim[]> {
  const rows = await query<ClaimRow>(
    `
    SELECT id, subject_entity_id, speaker_entity_id, claim_text, structured, created_at, status, status_confidence
    FROM claims
    WHERE subject_entity_id = $1 OR speaker_entity_id = $1
    ORDER BY created_at DESC
    `,
    [id]
  );

  return rows.map(mapClaim);
}

export async function getEvidenceForClaim(claimId: string): Promise<Evidence[]> {
  const rows = await query<EvidenceRow>(
    `
    SELECT id, claim_id, type, title, snippet, source_url, published_at
    FROM evidence
    WHERE claim_id = $1
    ORDER BY published_at DESC
    `,
    [claimId]
  );

  return rows.map(mapEvidence);
}

export async function getVoiceForEntity(entityId: string): Promise<VoiceAnalysis[]> {
  const rows = await query<VoiceRow>(
    `
    SELECT id, entity_id, claim_id, audio_file_name, created_at, signals, summary
    FROM voice_analyses
    WHERE entity_id = $1
    ORDER BY created_at DESC
    `,
    [entityId]
  );

  return rows.map(mapVoice);
}

export async function createClaim(input: {
  subjectEntityId: string;
  speakerEntityId?: string;
  claimText: string;
  structured: Claim['structured'];
  status?: Claim['status'];
  statusConfidence?: number;
}) {
  const rows = await query<ClaimRow>(
    `
    INSERT INTO claims (subject_entity_id, speaker_entity_id, claim_text, structured, created_at, status, status_confidence)
    VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    RETURNING id, subject_entity_id, speaker_entity_id, claim_text, structured, created_at, status, status_confidence
    `,
    [
      input.subjectEntityId,
      input.speakerEntityId ?? null,
      input.claimText,
      JSON.stringify(input.structured),
      input.status ?? 'Unknown',
      input.statusConfidence ?? 0.45
    ]
  );

  return mapClaim(rows[0]);
}

export async function createEvidence(input: {
  claimId: string;
  type: Evidence['type'];
  title: string;
  snippet: string;
  sourceUrl: string;
}) {
  const rows = await query<EvidenceRow>(
    `
    INSERT INTO evidence (claim_id, type, title, snippet, source_url, published_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id, claim_id, type, title, snippet, source_url, published_at
    `,
    [input.claimId, input.type, input.title, input.snippet, input.sourceUrl]
  );

  return mapEvidence(rows[0]);
}

export async function createVoiceAnalysis(input: {
  entityId: string;
  claimId?: string;
  audioFileName: string;
  signals: VoiceAnalysis['signals'];
  summary: string;
}) {
  const rows = await query<VoiceRow>(
    `
    INSERT INTO voice_analyses (entity_id, claim_id, audio_file_name, created_at, signals, summary)
    VALUES ($1, $2, $3, NOW(), $4, $5)
    RETURNING id, entity_id, claim_id, audio_file_name, created_at, signals, summary
    `,
    [input.entityId, input.claimId ?? null, input.audioFileName, JSON.stringify(input.signals), input.summary]
  );

  return mapVoice(rows[0]);
}

export async function getGraphForEntity(entityId: string): Promise<GraphData> {
  const entity = await getEntity(entityId);
  if (!entity) return { nodes: [], links: [] };

  const claims = await getClaimsForEntity(entityId);
  const evidenceBatches = await Promise.all(claims.map((claim) => getEvidenceForClaim(claim.id)));
  const allEvidence = evidenceBatches.flat();

  const speakerIds = Array.from(new Set(claims.map((claim) => claim.speakerEntityId).filter(Boolean) as string[]));
  const speakerRows = speakerIds.length
    ? await query<EntityRow>(
        `SELECT id, type, name, description, website, logo_url, tags, reliability_score, overpromising_index FROM entities WHERE id = ANY($1::text[])`,
        [speakerIds]
      )
    : [];
  const speakers = speakerRows.map(mapEntity);

  const nodes: GraphData['nodes'] = [
    { id: entity.id, label: entity.name, type: entity.type },
    ...speakers.map((s) => ({ id: s.id, label: s.name, type: s.type })),
    ...claims.map((c) => ({ id: c.id, label: c.structured.metric ?? c.structured.category, type: 'claim' as const })),
    ...allEvidence.map((e) => ({ id: e.id, label: `${e.title.slice(0, 28)}...`, type: 'evidence' as const }))
  ];

  const links: GraphData['links'] = [];
  for (const claim of claims) {
    links.push({ source: entity.id, target: claim.id, label: 'MADE_CLAIM' });
    if (claim.speakerEntityId) {
      links.push({ source: claim.speakerEntityId, target: claim.id, label: 'MADE_CLAIM' });
      links.push({ source: entity.id, target: claim.speakerEntityId, label: 'RELATES_TO' });
    }
  }
  for (const ev of allEvidence) {
    const parent = claims.find((c) => c.id === ev.claimId);
    if (!parent) continue;
    links.push({
      source: parent.id,
      target: ev.id,
      label: ev.type === 'supporting' ? 'SUPPORTED_BY' : ev.type === 'contradicting' ? 'CONTRADICTED_BY' : 'RELATES_TO'
    });
  }

  return { nodes: Array.from(new Map(nodes.map((node) => [node.id, node])).values()), links };
}

export async function getOutbreakFeed() {
  const rows = await query<{
    id: string;
    type: 'status-change' | 'new-claim' | 'evidence';
    entity_id: string;
    title: string;
    detail: string;
    occurred_at: string;
    severity: 'low' | 'medium' | 'high';
  }>(
    `SELECT id, type, entity_id, title, detail, occurred_at, severity FROM outbreak_events ORDER BY occurred_at DESC LIMIT 50`
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    entityId: row.entity_id,
    title: row.title,
    detail: row.detail,
    occurredAt: row.occurred_at,
    severity: row.severity
  }));
}

export async function createOutbreakEvent(input: {
  type: 'status-change' | 'new-claim' | 'evidence';
  entityId: string;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}) {
  await query(
    `INSERT INTO outbreak_events (type, entity_id, title, detail, occurred_at, severity) VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [input.type, input.entityId, input.title, input.detail, input.severity]
  );
}

export async function getReportBundle(entityId: string) {
  const entity = await getEntity(entityId);
  if (!entity) return null;

  const claims = (await getClaimsForEntity(entityId)).slice(0, 5);
  const evidence = (await Promise.all(claims.map((claim) => getEvidenceForClaim(claim.id)))).flat();
  const voices = await getVoiceForEntity(entityId);

  const sourcesRows = await query<{ source_text: string }>('SELECT source_text FROM report_sources ORDER BY created_at DESC LIMIT 20');

  return {
    entity,
    claims,
    evidence,
    voices,
    sources: sourcesRows.map((row) => row.source_text)
  };
}
