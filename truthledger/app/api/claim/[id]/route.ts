import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import { getClaim, patchClaim } from '@/lib/mock-store';
import { inMockMode } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const claimId = decodeURIComponent(params.id);

  if (inMockMode()) {
    const row = getClaim(claimId);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  }

  const rows = await runQuery(
    `MATCH (e)-[:HAS_CLAIM]->(c:Claim {id: $id})
     OPTIONAL MATCH (c)-[:SUPPORTED_BY|CONTRADICTED_BY|MENTIONED_IN]->(ev:Evidence)
     RETURN c, e, collect(ev) as evidence`,
    { id: claimId }
  );

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    claim: {
      ...rows[0].c,
      evidence: (rows[0].evidence || []).filter((ev: any) => ev && ev.id)
    },
    entity: rows[0].e
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const claimId = decodeURIComponent(params.id);
  const patch = await req.json();

  if (inMockMode()) {
    const claim = patchClaim(claimId, patch);
    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, claim });
  }

  const allowed = ['status', 'category', 'certainty', 'deadline', 'metric', 'target'];
  const updates: string[] = [];
  const values: Record<string, any> = { id: claimId };

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      updates.push(`c.${key} = $${key}`);
      values[key] = patch[key];
    }
  }

  if (!updates.length) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const query = `MATCH (c:Claim {id: $id}) SET ${updates.join(', ')}, c.updatedAt = datetime() RETURN c`;
  const rows = await runQuery(query, values);

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, claim: rows[0].c });
}
