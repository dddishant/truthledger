import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import { discoverSourcesForEntity } from '@/lib/tavily';
import { scrapeUrl } from '@/lib/yutori';
import { extractClaimsFromText } from '@/lib/openai';
import { calculateReliabilityScore, calculateOverpromiseIndex } from '@/lib/scoring';
import { v4 as uuidv4 } from 'uuid';
import { inMockMode } from '@/lib/runtime';
import { scanEntity } from '@/lib/mock-store';
import { extractRealClaimsFromSource } from '@/lib/claim-extraction';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { entityName, entityType, ticker } = await req.json();

  if (inMockMode()) {
    return NextResponse.json(scanEntity(entityName, entityType, ticker));
  }

  const entityId = uuidv4();
  const label = entityType === 'company' ? 'Company' : 'Person';

  await runQuery(
    `MERGE (e:${label} {name: $name})
     ON CREATE SET e.id = $id, e.ticker = $ticker, e.reliabilityScore = 50,
                   e.overpromiseIndex = 'Unknown', e.createdAt = datetime(), e.updatedAt = datetime()
     ON MATCH SET e.updatedAt = datetime()
     RETURN e`,
    { name: entityName, id: entityId, ticker: ticker || '' }
  );

  const urls = await discoverSourcesForEntity(entityName, entityType);
  const allClaims: any[] = [];
  const errors: string[] = [];

  for (const url of urls.slice(0, 10)) {
    try {
      const { text } = await scrapeUrl(url);
      if (!text || text.length < 100) continue;
      const extracted = extractRealClaimsFromSource(
        {
          entityName,
          entityId,
          text,
          title: url,
          url,
          published_at: new Date().toISOString(),
          source_name: 'web'
        },
        true
      );
      if (extracted.length > 0) {
        allClaims.push(
          ...extracted.map((c) => ({
            text: c.statement,
            category: c.category === 'implemented' || c.category === 'in_progress' ? 'Product' : c.category === 'metric' ? 'Financial' : c.category === 'failed' ? 'Legal' : 'Other',
            metric: c.action,
            target: c.object,
            deadline: c.timeframe || 'Unspecified',
            certainty: c.category === 'planned' ? 'Aspirational' : 'Definitive',
            sourceUrl: url,
            sourceDate: new Date().toISOString()
          }))
        );
      } else {
        const claims = await extractClaimsFromText(text, url, new Date().toISOString());
        allClaims.push(...claims);
      }
    } catch {
      errors.push(`Failed: ${url}`);
    }
  }

  for (const claim of allClaims) {
    const claimId = uuidv4();
    await runQuery(
      `MATCH (e:${label} {name: $entityName})
       CREATE (c:Claim {
         id: $id, text: $text, category: $category, metric: $metric,
         target: $target, deadline: $deadline, certainty: $certainty,
         status: 'Unknown', sourceType: 'web', sourceUrl: $sourceUrl,
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
        sourceUrl: claim.sourceUrl || '',
        sourceDate: claim.sourceDate || new Date().toISOString(),
      }
    );
  }

  const claimRows = await runQuery(`MATCH (e:${label} {name: $entityName})-[:HAS_CLAIM]->(c:Claim) RETURN c`, { entityName });
  const claims = claimRows.map((r: any) => r.c);
  const reliabilityScore = calculateReliabilityScore(claims);
  const overpromiseIndex = calculateOverpromiseIndex(claims);

  await runQuery(
    `MATCH (e:${label} {name: $entityName})
     SET e.reliabilityScore = $score, e.overpromiseIndex = $index, e.updatedAt = datetime()`,
    { entityName, score: reliabilityScore, index: overpromiseIndex }
  );

  return NextResponse.json({
    success: true,
    entityName,
    claimsFound: allClaims.length,
    urlsScanned: urls.length,
    reliabilityScore,
    overpromiseIndex,
    errors,
  });
}
