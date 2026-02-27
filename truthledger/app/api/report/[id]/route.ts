import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import { generateEntitySummary } from '@/lib/openai';
import { buildReport } from '@/lib/mock-store';
import { inMockMode } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const entityName = decodeURIComponent(params.id);

  if (inMockMode()) {
    const report = buildReport(entityName);
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(report);
  }

  const rows = await runQuery(
    `MATCH (e {name: $name})-[:HAS_CLAIM]->(c:Claim)
     OPTIONAL MATCH (c)-[:SUPPORTED_BY|CONTRADICTED_BY|MENTIONED_IN]->(ev:Evidence)
     RETURN e, c, collect(ev) as evidence
     ORDER BY c.createdAt DESC`,
    { name: entityName }
  );

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const entity = rows[0].e;
  const claims = rows.map((r: any) => ({ ...r.c, evidence: (r.evidence || []).filter((ev: any) => ev && ev.id) }));
  const summary = await generateEntitySummary(entityName, claims);

  return NextResponse.json({
    entity,
    claims,
    summary,
    generatedAt: new Date().toISOString()
  });
}
