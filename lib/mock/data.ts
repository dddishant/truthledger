import type { Claim, Entity, Evidence, GraphData, VoiceAnalysis } from '@/lib/types';

export const entities: Entity[] = [
  {
    id: 'comp-orbitex',
    type: 'company',
    name: 'Orbitex Energy Systems',
    description: 'Grid-scale battery and carbon accounting platform serving utilities across North America and the EU.',
    website: 'https://orbitex.example.com',
    tags: ['Energy', 'ESG', 'Infrastructure'],
    reliabilityScore: 72,
    overpromisingIndex: 'Medium'
  },
  {
    id: 'comp-helixai',
    type: 'company',
    name: 'HelixAI Cloud',
    description: 'Enterprise AI infrastructure provider focused on regulated deployments and model observability.',
    website: 'https://helixai.example.com',
    tags: ['AI', 'Cloud', 'Security'],
    reliabilityScore: 61,
    overpromisingIndex: 'High'
  },
  {
    id: 'comp-novaforge',
    type: 'company',
    name: 'NovaForge Mobility',
    description: 'EV platform manufacturer building commercial fleets and charging orchestration software.',
    website: 'https://novaforge.example.com',
    tags: ['Mobility', 'Manufacturing', 'EV'],
    reliabilityScore: 54,
    overpromisingIndex: 'High'
  },
  {
    id: 'comp-lumen',
    type: 'company',
    name: 'Lumen Bioworks',
    description: 'Biotech tooling company developing sequencing automation for hospital labs.',
    website: 'https://lumenbio.example.com',
    tags: ['Biotech', 'Automation'],
    reliabilityScore: 83,
    overpromisingIndex: 'Low'
  },
  {
    id: 'comp-aurora',
    type: 'company',
    name: 'Aurora Retail OS',
    description: 'Retail analytics and store automation suite used by multinational chains.',
    website: 'https://aurora-retail.example.com',
    tags: ['Retail', 'Analytics', 'AI'],
    reliabilityScore: 67,
    overpromisingIndex: 'Medium'
  },
  {
    id: 'person-mira',
    type: 'person',
    name: 'Mira Chen',
    description: 'CEO of HelixAI Cloud; frequent speaker on enterprise model safety and compliance.',
    tags: ['CEO', 'AI Safety', 'Public Speaker'],
    reliabilityScore: 58,
    overpromisingIndex: 'High'
  },
  {
    id: 'person-daniel',
    type: 'person',
    name: 'Daniel Ortega',
    description: 'CFO of Orbitex Energy Systems, leads profitability and capex guidance communications.',
    tags: ['CFO', 'Finance'],
    reliabilityScore: 76,
    overpromisingIndex: 'Medium'
  },
  {
    id: 'person-isha',
    type: 'person',
    name: 'Isha Raman',
    description: 'Chief Product Officer at NovaForge Mobility overseeing EU expansion and fleet launch timelines.',
    tags: ['Product', 'Mobility'],
    reliabilityScore: 49,
    overpromisingIndex: 'High'
  }
];

export const claims: Claim[] = [
  {
    id: 'claim-001',
    subjectEntityId: 'comp-orbitex',
    speakerEntityId: 'person-daniel',
    claimText: 'Orbitex will achieve net-zero Scope 1 and 2 operations across all manufacturing sites by the end of 2025.',
    structured: {
      category: 'Climate/ESG',
      metric: 'Net-zero (Scope 1+2)',
      targetDate: '2025-12-31T00:00:00.000Z',
      certainty: 'Strong'
    },
    createdAt: '2024-04-18T13:00:00.000Z',
    status: 'Behind',
    statusConfidence: 0.79
  },
  {
    id: 'claim-002',
    subjectEntityId: 'comp-orbitex',
    speakerEntityId: 'person-daniel',
    claimText: 'We expect company-wide profitability in FY2026 with gross margin expansion driven by storage software services.',
    structured: {
      category: 'Financial',
      metric: 'Profitability',
      targetDate: '2026-12-31T00:00:00.000Z',
      certainty: 'Moderate'
    },
    createdAt: '2025-02-12T14:20:00.000Z',
    status: 'On Track',
    statusConfidence: 0.66
  },
  {
    id: 'claim-003',
    subjectEntityId: 'comp-helixai',
    speakerEntityId: 'person-mira',
    claimText: 'HelixAI Cloud will launch sovereign EU hosting for regulated customers by Q3 2025.',
    structured: {
      category: 'Product',
      metric: 'EU launch',
      targetDate: '2025-09-30T00:00:00.000Z',
      certainty: 'Strong'
    },
    createdAt: '2024-11-06T17:30:00.000Z',
    status: 'Unfulfilled',
    statusConfidence: 0.88
  },
  {
    id: 'claim-004',
    subjectEntityId: 'comp-helixai',
    speakerEntityId: 'person-mira',
    claimText: 'Every customer-facing model deployment will ship with red-team evaluation coverage and incident rollback by default in 2025.',
    structured: {
      category: 'AI Safety',
      metric: 'Red-team + rollback default coverage',
      targetDate: '2025-12-31T00:00:00.000Z',
      certainty: 'Hedged'
    },
    createdAt: '2025-01-20T09:10:00.000Z',
    status: 'Unknown',
    statusConfidence: 0.42
  },
  {
    id: 'claim-005',
    subjectEntityId: 'comp-novaforge',
    speakerEntityId: 'person-isha',
    claimText: 'NovaForge will deploy 10,000 commercial EV vans across three EU countries by the end of 2025.',
    structured: {
      category: 'Product',
      metric: '10,000 EV vans in EU',
      targetDate: '2025-12-31T00:00:00.000Z',
      certainty: 'Strong'
    },
    createdAt: '2024-07-02T15:00:00.000Z',
    status: 'Contradicted',
    statusConfidence: 0.91
  },
  {
    id: 'claim-006',
    subjectEntityId: 'comp-lumen',
    claimText: 'Lumen Bioworks plans to hire 250 clinical automation specialists by mid-2026.',
    structured: {
      category: 'Hiring',
      metric: '250 specialists hired',
      targetDate: '2026-06-30T00:00:00.000Z',
      certainty: 'Moderate'
    },
    createdAt: '2025-09-10T10:00:00.000Z',
    status: 'On Track',
    statusConfidence: 0.74
  },
  {
    id: 'claim-007',
    subjectEntityId: 'comp-aurora',
    claimText: 'Aurora Retail OS will cut shrinkage by 20% for top-tier customers using computer vision checkout audits.',
    structured: {
      category: 'Product',
      metric: '20% shrinkage reduction',
      targetDate: '2026-03-31T00:00:00.000Z',
      certainty: 'Hedged'
    },
    createdAt: '2025-08-04T12:00:00.000Z',
    status: 'Unknown',
    statusConfidence: 0.38
  }
];

export const evidence: Evidence[] = [
  {
    id: 'ev-001',
    claimId: 'claim-001',
    type: 'supporting',
    title: 'Orbitex Q2 sustainability report shows two plants transitioned to renewable PPAs',
    snippet: 'The report confirms 68% of Scope 1+2 footprint is now covered by renewable procurement and electrified heat pilots.',
    sourceUrl: 'https://news.example.com/orbitex-sustainability-q2',
    publishedAt: '2025-06-15T08:00:00.000Z'
  },
  {
    id: 'ev-002',
    claimId: 'claim-001',
    type: 'contradicting',
    title: 'Regulatory filing reveals delayed retrofit at Monterrey manufacturing site',
    snippet: 'Capex timing slipped into 2026 due to permit backlog, extending diesel backup usage at the largest site.',
    sourceUrl: 'https://filings.example.com/orbitex-10q-q3',
    publishedAt: '2025-10-30T12:00:00.000Z'
  },
  {
    id: 'ev-003',
    claimId: 'claim-002',
    type: 'supporting',
    title: 'Orbitex earnings call cites software margins above 62%',
    snippet: 'Management reported services ARR acceleration and improved hardware gross margins, supporting profitability trajectory.',
    sourceUrl: 'https://earnings.example.com/orbitex-fy25-q4',
    publishedAt: '2026-02-10T22:00:00.000Z'
  },
  {
    id: 'ev-004',
    claimId: 'claim-003',
    type: 'contradicting',
    title: 'HelixAI postpones sovereign EU region rollout',
    snippet: 'Customer update states data residency controls remain in beta with revised availability in 2026.',
    sourceUrl: 'https://status.example.com/helix-eu-region-update',
    publishedAt: '2025-10-04T09:00:00.000Z'
  },
  {
    id: 'ev-005',
    claimId: 'claim-004',
    type: 'neutral',
    title: 'HelixAI documentation introduces optional rollback workflows',
    snippet: 'Rollback and red-team templates are documented but marked optional for self-managed deployments.',
    sourceUrl: 'https://docs.example.com/helixai/release-notes',
    publishedAt: '2025-12-12T16:00:00.000Z'
  },
  {
    id: 'ev-006',
    claimId: 'claim-005',
    type: 'contradicting',
    title: 'NovaForge scales back EU fleet manufacturing guidance',
    snippet: 'Investor presentation revises 2025 output to 2,800 units due to battery supply constraints and homologation delays.',
    sourceUrl: 'https://investors.example.com/novaforge-guidance-update',
    publishedAt: '2025-09-21T11:00:00.000Z'
  },
  {
    id: 'ev-007',
    claimId: 'claim-005',
    type: 'supporting',
    title: 'Pilot fleet launches in Germany and Spain',
    snippet: 'NovaForge confirmed first 420 vans deployed with logistics partners, indicating partial progress toward the EU target.',
    sourceUrl: 'https://press.example.com/novaforge-eu-pilot',
    publishedAt: '2025-05-01T07:30:00.000Z'
  },
  {
    id: 'ev-008',
    claimId: 'claim-006',
    type: 'supporting',
    title: 'Lumen job board surpasses 140 open clinical automation roles',
    snippet: 'Recruiting data and regional hiring events indicate staffing expansion remains on pace for 2026 goals.',
    sourceUrl: 'https://jobs.example.com/lumen-openings',
    publishedAt: '2026-01-08T10:15:00.000Z'
  },
  {
    id: 'ev-009',
    claimId: 'claim-007',
    type: 'neutral',
    title: 'Aurora publishes early shrinkage benchmark study',
    snippet: 'Study shows median 9-12% improvement in trial stores but notes broad variance by store layout and staffing mix.',
    sourceUrl: 'https://research.example.com/aurora-shrinkage-study',
    publishedAt: '2026-01-18T13:00:00.000Z'
  }
];

export const voiceAnalyses: VoiceAnalysis[] = [
  {
    id: 'va-001',
    entityId: 'comp-helixai',
    claimId: 'claim-003',
    audioFileName: 'helixai-q2-earnings-call-clip.mp3',
    createdAt: '2026-01-12T14:00:00.000Z',
    signals: {
      intimidation: 0.18,
      stress: 0.64,
      defensiveness: 0.58,
      confidenceMismatch: 0.72
    },
    summary: 'Moderate-to-high stress markers appear during timeline questions, with elevated confidence mismatch when discussing EU region readiness.'
  }
];

export const reportSources = [
  'HelixAI Cloud FY2025 Q3 shareholder letter',
  'HelixAI product release notes (Q4 2025)',
  'Customer incident/status updates',
  'Conference interview transcript (Mira Chen, Dec 2025)',
  'Public documentation and roadmap changelogs'
];

export function buildGraphForEntity(entityId: string): GraphData {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return { nodes: [], links: [] };

  const relatedClaims = claims.filter((c) => c.subjectEntityId === entityId || c.speakerEntityId === entityId);
  const relatedEvidence = evidence.filter((e) => relatedClaims.some((c) => c.id === e.claimId));
  const speakers = entities.filter((e) => e.type === 'person' && relatedClaims.some((c) => c.speakerEntityId === e.id));

  const nodes = [
    { id: entity.id, label: entity.name, type: entity.type },
    ...speakers.map((s) => ({ id: s.id, label: s.name, type: s.type })),
    ...relatedClaims.map((c) => ({ id: c.id, label: c.structured.metric ?? c.structured.category, type: 'claim' as const })),
    ...relatedEvidence.map((e) => ({ id: e.id, label: e.title.slice(0, 28) + '...', type: 'evidence' as const }))
  ];

  const links = [] as GraphData['links'];

  for (const c of relatedClaims) {
    links.push({ source: entity.id, target: c.id, label: 'MADE_CLAIM' });
    if (c.speakerEntityId) {
      links.push({ source: c.speakerEntityId, target: c.id, label: 'MADE_CLAIM' });
      links.push({ source: entity.id, target: c.speakerEntityId, label: 'RELATES_TO' });
    }
  }

  for (const e of relatedEvidence) {
    const claim = relatedClaims.find((c) => c.id === e.claimId);
    if (!claim) continue;
    links.push({
      source: claim.id,
      target: e.id,
      label: e.type === 'contradicting' ? 'CONTRADICTED_BY' : e.type === 'supporting' ? 'SUPPORTED_BY' : 'RELATES_TO'
    });
  }

  const uniqueNodes = Array.from(new Map(nodes.map((n) => [n.id, n])).values());
  return { nodes: uniqueNodes, links };
}

export const outbreakFeed = [
  {
    id: 'feed-1',
    type: 'status-change',
    entityId: 'comp-helixai',
    title: 'EU sovereign hosting claim marked Unfulfilled',
    detail: 'HelixAI customer update revised launch to 2026, contradicting prior Q3 2025 commitment.',
    occurredAt: '2025-10-04T09:05:00.000Z',
    severity: 'high'
  },
  {
    id: 'feed-2',
    type: 'new-claim',
    entityId: 'comp-orbitex',
    title: 'Profitability guidance reaffirmed for FY2026',
    detail: 'CFO highlighted software margin expansion and capex discipline on earnings call.',
    occurredAt: '2026-02-10T22:10:00.000Z',
    severity: 'medium'
  },
  {
    id: 'feed-3',
    type: 'evidence',
    entityId: 'comp-novaforge',
    title: 'Fleet output revised to 2,800 units for 2025',
    detail: 'Guidance update materially weakens confidence in 10,000 EU van deployment claim.',
    occurredAt: '2025-09-21T11:30:00.000Z',
    severity: 'high'
  },
  {
    id: 'feed-4',
    type: 'evidence',
    entityId: 'comp-lumen',
    title: 'Hiring pace supports 2026 staffing expansion target',
    detail: 'Job board and hiring event data suggest continued momentum for clinical automation roles.',
    occurredAt: '2026-01-08T10:45:00.000Z',
    severity: 'low'
  }
] as const;
