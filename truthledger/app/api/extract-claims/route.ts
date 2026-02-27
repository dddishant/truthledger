import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromText } from '@/lib/openai';
import { scrapeUrl } from '@/lib/yutori';
import { runQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import { addClaims, extractSimpleClaimsFromText } from '@/lib/mock-store';
import { inMockMode } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { entityName, text, url, sourceDate } = await req.json();

  const inputText = text || (url ? (await scrapeUrl(url)).text : '');
  if (!inputText) {
    return NextResponse.json({ error: 'No text/url input available' }, { status: 400 });
  }

  if (inMockMode()) {
    const claims = extractSimpleClaimsFromText(inputText, url || 'manual-input', sourceDate || new Date().toISOString());
    const created = addClaims(entityName, claims, 'web');
    return NextResponse.json({ success: true, claims: created });
  }

  const claims = await extractClaimsFromText(inputText, url || 'manual-input', sourceDate || new Date().toISOString());

  for (const claim of claims) {
    await runQuery(
      `MATCH (e {name: $entityName})
       CREATE (c:Claim {
         id: $id, text: $text, category: $category, metric: $metric,
         target: $target, deadline: $deadline, certainty: $certainty,
         status: 'Unknown', sourceType: 'web', sourceUrl: $sourceUrl,
         sourceDate: $sourceDate, createdAt: datetime(), updatedAt: datetime()
       })
       CREATE (e)-[:HAS_CLAIM]->(c)`,
      {
        entityName,
        id: uuidv4(),
        text: claim.text || '',
        category: claim.category || 'Other',
        metric: claim.metric || '',
        target: claim.target || '',
        deadline: claim.deadline || 'Unspecified',
        certainty: claim.certainty || 'Aspirational',
        sourceUrl: claim.sourceUrl || url || '',
        sourceDate: claim.sourceDate || new Date().toISOString(),
      }
    );
  }

  return NextResponse.json({ success: true, claims });
}
