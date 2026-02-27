import { claims as seedClaims, entities as seedEntities, evidence as seedEvidence, outbreakFeed as seedOutbreakFeed, reportSources as seedReportSources, voiceAnalyses as seedVoiceAnalyses } from '@/lib/mock/data';
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const db: {
  entities: Entity[];
  claims: Claim[];
  evidence: Evidence[];
  voiceAnalyses: VoiceAnalysis[];
  reportSources: string[];
  outbreakFeed: FeedItem[];
} = {
  entities: clone(seedEntities),
  claims: clone(seedClaims),
  evidence: clone(seedEvidence),
  voiceAnalyses: clone(seedVoiceAnalyses),
  reportSources: clone(seedReportSources),
  outbreakFeed: clone(seedOutbreakFeed as unknown as FeedItem[])
};

export function buildGraphForEntity(entityId: string): GraphData {
  const entity = db.entities.find((e) => e.id === entityId);
  if (!entity) return { nodes: [], links: [] };

  const relatedClaims = db.claims.filter((c) => c.subjectEntityId === entityId || c.speakerEntityId === entityId);
  const relatedEvidence = db.evidence.filter((e) => relatedClaims.some((c) => c.id === e.claimId));
  const speakers = db.entities.filter((e) => e.type === 'person' && relatedClaims.some((c) => c.speakerEntityId === e.id));

  const nodes = [
    { id: entity.id, label: entity.name, type: entity.type },
    ...speakers.map((s) => ({ id: s.id, label: s.name, type: s.type })),
    ...relatedClaims.map((c) => ({ id: c.id, label: c.structured.metric ?? c.structured.category, type: 'claim' as const })),
    ...relatedEvidence.map((e) => ({ id: e.id, label: `${e.title.slice(0, 28)}...`, type: 'evidence' as const }))
  ];

  const links: GraphData['links'] = [];
  for (const claim of relatedClaims) {
    links.push({ source: entity.id, target: claim.id, label: 'MADE_CLAIM' });
    if (claim.speakerEntityId) {
      links.push({ source: claim.speakerEntityId, target: claim.id, label: 'MADE_CLAIM' });
      links.push({ source: entity.id, target: claim.speakerEntityId, label: 'RELATES_TO' });
    }
  }

  for (const ev of relatedEvidence) {
    const claim = relatedClaims.find((c) => c.id === ev.claimId);
    if (!claim) continue;
    links.push({
      source: claim.id,
      target: ev.id,
      label: ev.type === 'contradicting' ? 'CONTRADICTED_BY' : ev.type === 'supporting' ? 'SUPPORTED_BY' : 'RELATES_TO'
    });
  }

  return { nodes: Array.from(new Map(nodes.map((n) => [n.id, n])).values()), links };
}
