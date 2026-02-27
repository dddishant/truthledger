# TruthLedger

Hackathon-ready accountability engine for tracking public promises and evidence over time.

## Setup

1. Copy env template:
   - `cp .env.local.example .env.local`
2. Fill all API keys and Neo4j credentials in `.env.local`
3. Install dependencies:
   - `npm install`
4. Start app:
   - `npm run dev`
5. Optional smoke test for entity route:
   - `bash scripts/test-entity-route.sh`
6. Semantic claim validator examples:
   - `npm run test:real-claims`

## Entity Claims API

`GET /api/entity/:name?topic=&mode=&includeProfileFacts=&broadenClaimTypes=`

- `mode`: `strict | balanced | broad` (default `balanced`)
- `includeProfileFacts`: `true | false` (default `true`)
- `broadenClaimTypes`: `true | false` (default `true`)
- `includePlanned`: `true | false` (default `true`)

Response includes:
- `entity` profile panel data (`description`, `website`, `hq`, `founded`, `source_label`)
- `claims[]` with `type`, `confidence`, and evidence array (`url`, `title`, `snippet`)
- `retrieval` diagnostics (`expanded_queries`, `sources_considered`, `sources_returned`)
- ambiguity payload (`question`, `options`) when the query is ambiguous

## Demo flow

1. Open `/` and scan an entity (e.g. Tesla)
2. View dashboard scores and claims
3. Click `Update Evidence`
4. Upload a slide/PDF to extract more claims
5. Upload audio for voice signal analysis
6. Open `Share Report`
