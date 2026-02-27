import { db, buildGraphForEntity } from '@/lib/mock/store';
import type { Claim, Evidence, VoiceAnalysis } from '@/lib/types';

export function searchEntities(q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return db.entities.slice(0, 20);
  return db.entities.filter(
    (e) =>
      e.name.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term) ||
      e.tags.some((t) => t.toLowerCase().includes(term))
  );
}

export function getEntity(id: string) {
  return db.entities.find((e) => e.id === id) ?? null;
}

export function getClaimsForEntity(id: string) {
  return db.claims
    .filter((c) => c.subjectEntityId === id || c.speakerEntityId === id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getEvidenceForClaim(id: string) {
  return db.evidence.filter((e) => e.claimId === id).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export function getGraphForEntity(id: string) {
  return buildGraphForEntity(id);
}

export function getVoiceForEntity(id: string) {
  return db.voiceAnalyses.filter((v) => v.entityId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getOutbreakFeed() {
  return db.outbreakFeed.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

export function getReportBundle(id: string) {
  const entity = getEntity(id);
  if (!entity) return null;
  const claims = db.claims.filter((c) => c.subjectEntityId === entity.id).slice(0, 5);
  const evidence = db.evidence.filter((ev) => claims.some((c) => c.id === ev.claimId));
  const voices = db.voiceAnalyses.filter((v) => v.entityId === entity.id);
  return { entity, claims, evidence, voices, sources: db.reportSources };
}

export function createScan(input: {
  subjectEntityId: string;
  speakerEntityId?: string;
  transcriptText: string;
  sourceTitle?: string;
  sourceUrl?: string;
  extractedClaims?: Array<{ claimText: string; category: Claim['structured']['category']; metric?: string; targetDate?: string; certainty: Claim['structured']['certainty'] }>;
}) {
  const candidate = input.extractedClaims?.[0];
  const claim: Claim = {
    id: `claim-${Date.now()}`,
    subjectEntityId: input.subjectEntityId,
    speakerEntityId: input.speakerEntityId,
    claimText: candidate?.claimText ?? input.transcriptText.slice(0, 180),
    structured: {
      category: candidate?.category ?? 'Other',
      metric: candidate?.metric,
      targetDate: candidate?.targetDate,
      certainty: candidate?.certainty ?? 'Moderate'
    },
    createdAt: new Date().toISOString(),
    status: 'Unknown',
    statusConfidence: 0.5
  };

  const evidence: Evidence = {
    id: `ev-${Date.now()}`,
    claimId: claim.id,
    type: 'neutral',
    title: input.sourceTitle ?? 'Fresh transcript scan',
    snippet: input.transcriptText.slice(0, 220),
    sourceUrl: input.sourceUrl ?? 'https://source-not-provided.local',
    publishedAt: new Date().toISOString()
  };

  db.claims.unshift(claim);
  db.evidence.unshift(evidence);
  db.outbreakFeed.unshift({
    id: `feed-${Date.now()}`,
    type: 'new-claim',
    entityId: input.subjectEntityId,
    title: 'New claim extracted from transcript scan',
    detail: claim.claimText,
    occurredAt: claim.createdAt,
    severity: 'medium'
  });

  return { claim, evidence };
}

export function createVoiceAnalysis(input: {
  entityId: string;
  claimId?: string;
  audioFileName: string;
  signals?: VoiceAnalysis['signals'];
  summary?: string;
}) {
  const analysis: VoiceAnalysis = {
    id: `va-${Date.now()}`,
    entityId: input.entityId,
    claimId: input.claimId,
    audioFileName: input.audioFileName,
    createdAt: new Date().toISOString(),
    signals:
      input.signals ?? {
        intimidation: Number((0.15 + Math.random() * 0.4).toFixed(2)),
        stress: Number((0.2 + Math.random() * 0.6).toFixed(2)),
        defensiveness: Number((0.15 + Math.random() * 0.6).toFixed(2)),
        confidenceMismatch: Number((0.25 + Math.random() * 0.6).toFixed(2))
      },
    summary:
      input.summary ??
      'Fallback analysis: confidence mismatch and stress rose around timeline certainty statements. Validate against transcript and evidence updates.'
  };
  db.voiceAnalyses.unshift(analysis);
  return analysis;
}
