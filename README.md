# Autonomous Memory for the Internet

Production-ready Next.js frontend + API layer for corporate claim accountability.

## Stack
- Next.js 14 + TypeScript + App Router
- Tailwind + shadcn-style components
- React Query
- Recharts + react-force-graph-2d
- PostgreSQL (required)
- OpenAI (required for `/api/scan`)
- Modulate (required for `/api/voice`)

## Fast Start (Real Data)

1. Install deps
```bash
npm install
```

2. Configure env
```bash
cp .env.example .env.local
```
Fill these values:
- `DATABASE_URL`
- `OPENAI_API_KEY` (for real `/api/scan` extraction)
- `MODULATE_API_KEY`
- `MODULATE_BASE_URL`
- `TAVILY_API_KEY` (for live `/api/search` and `/api/outbreak`)

3. Create DB schema
```bash
psql "$DATABASE_URL" -f db/schema.sql
```

4. Start app
```bash
npm run dev
```

## API Endpoints
- `GET /api/search?q=`
- `GET /api/entity/:id`
- `GET /api/entity/:id/claims`
- `GET /api/entity/:id/graph`
- `GET /api/entity/:id/voice`
- `GET /api/claim/:id/evidence`
- `GET /api/outbreak`
- `GET /api/report/:id`
- `POST /api/scan` (OpenAI extraction)
- `POST /api/voice` (Modulate integration)

## `POST /api/scan` body
```json
{
  "subjectEntityId": "comp-your-company",
  "speakerEntityId": "person-optional",
  "transcriptText": "full transcript or excerpt",
  "sourceUrl": "https://...",
  "sourceTitle": "Q2 Earnings Call"
}
```

## Notes
- No client-side mock API usage remains.
- If env vars are missing, API returns `503` with clear error details.
