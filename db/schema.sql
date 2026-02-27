CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('company', 'person')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  reliability_score INTEGER NOT NULL DEFAULT 50 CHECK (reliability_score BETWEEN 0 AND 100),
  overpromising_index TEXT NOT NULL DEFAULT 'Medium' CHECK (overpromising_index IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY DEFAULT ('claim-' || replace(gen_random_uuid()::text, '-', '')),
  subject_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  speaker_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
  claim_text TEXT NOT NULL,
  structured JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('On Track', 'Behind', 'Unfulfilled', 'Contradicted', 'Unknown')),
  status_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY DEFAULT ('ev-' || replace(gen_random_uuid()::text, '-', '')),
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('supporting', 'contradicting', 'neutral')),
  title TEXT NOT NULL,
  snippet TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_analyses (
  id TEXT PRIMARY KEY DEFAULT ('va-' || replace(gen_random_uuid()::text, '-', '')),
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  claim_id TEXT REFERENCES claims(id) ON DELETE SET NULL,
  audio_file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signals JSONB NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbreak_events (
  id TEXT PRIMARY KEY DEFAULT ('feed-' || replace(gen_random_uuid()::text, '-', '')),
  type TEXT NOT NULL CHECK (type IN ('status-change', 'new-claim', 'evidence')),
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high'))
);

CREATE TABLE IF NOT EXISTS report_sources (
  id BIGSERIAL PRIMARY KEY,
  source_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_subject ON claims(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_claims_speaker ON claims(speaker_entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_claim ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_voice_entity ON voice_analyses(entity_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_entity ON outbreak_events(entity_id);
