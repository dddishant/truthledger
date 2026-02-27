export type ClaimCategory = 'Financial' | 'Product' | 'ESG' | 'Expansion' | 'Personnel' | 'Legal' | 'Other';
export type ClaimStatus = 'On Track' | 'Behind' | 'Unfulfilled' | 'Contradicted' | 'Fulfilled' | 'Unknown';
export type ClaimCertainty = 'Definitive' | 'Aspirational' | 'Conditional';
export type EvidenceStance = 'Supporting' | 'Contradicting' | 'Neutral';
export type SourceType = 'web' | 'image' | 'pdf' | 'audio';
export type OverpromiseLevel = 'Low' | 'Medium' | 'High';
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface Company {
  id: string;
  name: string;
  ticker?: string;
  industry?: string;
  reliabilityScore: number;
  overpromiseIndex: OverpromiseLevel;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  role?: string;
  reliabilityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  text: string;
  category: ClaimCategory;
  metric: string;
  target: string;
  deadline: string;
  certainty: ClaimCertainty;
  status: ClaimStatus;
  sourceType: SourceType;
  sourceUrl: string;
  sourceDate: string;
  evidence?: Evidence[];
  voiceAnalysis?: VoiceAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  text: string;
  url: string;
  date: string;
  stance: EvidenceStance;
  summary: string;
  sourceType: SourceType;
  createdAt: string;
}

export interface VoiceAnalysis {
  id: string;
  audioUrl?: string;
  signals: VoiceSignal[];
  summary: string;
  confidenceScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
}

export interface VoiceSignal {
  type: string;
  label: string;
  value: number;
  description: string;
}

export interface EntityDashboard {
  entity: Company | Person;
  entityType: 'company' | 'person';
  claims: Claim[];
  reliabilityScore: number;
  overpromiseIndex: OverpromiseLevel;
  scoreHistory: { date: string; score: number }[];
}

export interface ScanRequest {
  entityName: string;
  entityType: 'company' | 'person';
  ticker?: string;
}

export interface ExtractedClaim {
  text: string;
  category: ClaimCategory;
  metric: string;
  target: string;
  deadline: string;
  certainty: ClaimCertainty;
  speaker?: string;
  sourceUrl: string;
  sourceDate: string;
}

export type ClaimType =
  | 'commitment'
  | 'progress'
  | 'factual_profile'
  | 'product_feature'
  | 'financial_metric'
  | 'legal_regulatory'
  | 'incident_outage'
  | 'attribution_quote';

export type RetrievalMode = 'strict' | 'balanced' | 'broad';

export interface ClaimEvidenceV2 {
  url: string;
  title: string;
  snippet: string;
  published_at?: string;
  source_name?: string;
}

export interface ClaimV2 {
  id: string;
  type: ClaimType;
  text: string;
  confidence: number;
  evidence: ClaimEvidenceV2[];
  extracted_at: string;
  normalized?: {
    metric?: string;
    value?: string;
    unit?: string;
    date?: string;
    timeframe?: string;
    polarity?: 'positive' | 'negative' | 'neutral';
  };
}

export interface EntityClaimsResponse {
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
  }>;
  claims: ClaimV2[];
  retrieval: {
    query: string;
    expanded_queries: string[];
    sources_considered: number;
    sources_returned: Array<{ url: string; title: string; snippet: string }>;
    mode: RetrievalMode;
  };
  message?: string;
}
