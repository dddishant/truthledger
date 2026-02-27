export type EntityType = string;

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  website?: string;
  logoUrl?: string;
  tags: string[];
  reliabilityScore: number;
  overpromisingIndex: 'Low' | 'Medium' | 'High' | number;
}

export interface Claim {
  id: string;
  subjectEntityId: string;
  speakerEntityId?: string;
  claimText: string;
  structured: {
    category: 'Climate/ESG' | 'Financial' | 'Product' | 'AI Safety' | 'Hiring' | 'Other';
    metric?: string;
    targetDate?: string;
    certainty: 'Strong' | 'Moderate' | 'Hedged';
  };
  createdAt: string;
  status: 'On Track' | 'Behind' | 'Unfulfilled' | 'Contradicted' | 'Unknown';
  statusConfidence: number;
}

export interface Evidence {
  id: string;
  claimId: string;
  type: 'supporting' | 'contradicting' | 'neutral';
  title: string;
  snippet: string;
  sourceUrl: string;
  publishedAt: string;
}

export interface VoiceAnalysis {
  id: string;
  entityId: string;
  claimId?: string;
  audioFileName: string;
  createdAt: string;
  signals: {
    intimidation?: number;
    stress?: number;
    defensiveness?: number;
    confidenceMismatch?: number;
  };
  summary: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label: 'MADE_CLAIM' | 'SUPPORTED_BY' | 'CONTRADICTED_BY' | 'RELATES_TO';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
