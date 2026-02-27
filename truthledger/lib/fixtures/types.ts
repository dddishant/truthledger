export type SourceDocFixture = {
  url: string;
  title: string;
  snippet: string;
  text: string;
  published_at?: string;
  source_name?: string;
};

export type ApiClaimFixture = {
  type:
    | 'commitment'
    | 'progress'
    | 'factual_profile'
    | 'product_feature'
    | 'financial_metric'
    | 'legal_regulatory'
    | 'incident_outage'
    | 'attribution_quote';
  text: string;
  evidence: Array<{
    url: string;
    title: string;
    snippet: string;
    published_at?: string;
    source_name?: string;
  }>;
};
