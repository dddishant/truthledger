export type ClaimCategorySemantic = 'implemented' | 'in_progress' | 'planned' | 'failed' | 'metric';
export type ClaimStatusSemantic = 'success' | 'partial' | 'ongoing' | 'delayed' | 'cancelled' | 'unknown';

export type ClaimEvidenceSemantic = {
  url: string;
  title: string;
  snippet: string;
  quote?: string;
  published_at?: string;
  source_name?: string;
  offset?: number;
  videoId?: string;
  start?: number;
};

export type ClaimAttribution = {
  speaker?: string;
  org?: string;
  role?: string;
  source_type: 'official' | 'filing' | 'news' | 'interview' | 'analysis' | 'unknown';
};

export type ClaimObject = {
  id: string;
  entityId: string;
  statement: string;
  category: ClaimCategorySemantic;
  status: ClaimStatusSemantic;
  subject: string;
  action: string;
  object: string;
  timeframe?: string;
  confidence: number;
  attribution: ClaimAttribution;
  evidence: ClaimEvidenceSemantic[];
  negative: boolean;
  keywords: string[];
  normalized?: {
    metric?: string;
    value?: string;
    unit?: string;
    date?: string;
    timeframe?: string;
    polarity?: 'positive' | 'negative' | 'neutral';
  };
};

export const ACTION_LEXICONS = {
  implemented: ['launched', 'shipped', 'released', 'rolled out', 'deployed', 'delivered', 'introduced', 'made available', 'integrated', 'implemented', 'completed', 'achieved', 'built'],
  in_progress: ['working on', 'developing', 'building', 'testing', 'piloting', 'rolling out', 'preparing', 'iterating', 'training', 'migrating'],
  planned: ['plans to', 'will', 'aims to', 'targets', 'intends to', 'expects to', 'set to', 'scheduled to'],
  failed: ['delayed', 'postponed', 'cancelled', 'scrapped', 'paused', 'halted', 'failed to', 'missed', 'abandoned', 'recalled', 'rolled back'],
  metric: ['reduced', 'increased', 'improved', 'reached', 'hit', 'exceeded', 'missed by', 'grew', 'declined']
} as const;
