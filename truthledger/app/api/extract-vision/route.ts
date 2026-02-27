import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromImage, extractClaimsFromText } from '@/lib/openai';
import { runQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import { addClaims } from '@/lib/mock-store';
import { inMockMode } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const entityName = formData.get('entityName') as string;
  const sourceUrl = (formData.get('sourceUrl') as string) || 'uploaded-file';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const mimeType = file.type;

  const claims = mimeType.includes('pdf')
    ? await extractClaimsFromText((await pdf(Buffer.from(buffer))).text, sourceUrl, new Date().toISOString())
    : await extractClaimsFromImage(Buffer.from(buffer).toString('base64'), mimeType, sourceUrl);

  if (inMockMode()) {
    const created = addClaims(entityName, claims, mimeType.includes('pdf') ? 'pdf' : 'image');
    return NextResponse.json({ success: true, claims: created });
  }

  for (const claim of claims) {
    const claimId = uuidv4();
    await runQuery(
      `MATCH (e {name: $entityName})
       CREATE (c:Claim {
         id: $id, text: $text, category: $category, metric: $metric,
         target: $target, deadline: $deadline, certainty: $certainty,
         status: 'Unknown', sourceType: $sourceType, sourceUrl: $sourceUrl,
         sourceDate: $sourceDate, createdAt: datetime(), updatedAt: datetime()
       })
       CREATE (e)-[:HAS_CLAIM]->(c)`,
      {
        entityName,
        id: claimId,
        text: claim.text || '',
        category: claim.category || 'Other',
        metric: claim.metric || '',
        target: claim.target || '',
        deadline: claim.deadline || 'Unspecified',
        certainty: claim.certainty || 'Aspirational',
        sourceType: mimeType.includes('pdf') ? 'pdf' : 'image',
        sourceUrl,
        sourceDate: new Date().toISOString(),
      }
    );
  }

  return NextResponse.json({ success: true, claims });
}
