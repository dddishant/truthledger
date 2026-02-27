import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import { searchEvidenceForClaim } from '@/lib/tavily';
import { classifyEvidenceStance } from '@/lib/openai';
import { calculateReliabilityScore, calculateOverpromiseIndex } from '@/lib/scoring';
import { v4 as uuidv4 } from 'uuid';
import { inMockMode } from '@/lib/runtime';
import { updateEvidence } from '@/lib/mock-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { entityName, claimId } = await req.json();

  if (inMockMode()) {
    return NextResponse.json(updateEvidence(entityName, claimId));
  }

  const query = claimId
    ? `MATCH (c:Claim {id: $claimId}) RETURN c`
    : `MATCH (e {name: $entityName})-[:HAS_CLAIM]->(c:Claim) WHERE c.status = 'Unknown' RETURN c LIMIT 20`;

  const claimRows = await runQuery(query, { claimId, entityName });
  const claims = claimRows.map((r: any) => r.c);
  let evidenceAdded = 0;

  for (const claim of claims) {
    const evidenceResults = await searchEvidenceForClaim(claim, entityName);

    for (const result of evidenceResults.slice(0, 3)) {
      const { stance, summary, statusUpdate } = await classifyEvidenceStance(
        claim.text,
        result.raw_content || result.content || result.snippet || ''
      );

      const evidenceId = uuidv4();
      const relType = stance === 'Supporting' ? 'SUPPORTED_BY' : stance === 'Contradicting' ? 'CONTRADICTED_BY' : 'MENTIONED_IN';

      await runQuery(
        `MATCH (c:Claim {id: $claimId})
         CREATE (e:Evidence {
           id: $id, text: $text, url: $url, date: $date,
           stance: $stance, summary: $summary, sourceType: 'web',
           createdAt: datetime()
         })
         CREATE (c)-[:${relType}]->(e)`,
        {
          claimId: claim.id,
          id: evidenceId,
          text: (result.raw_content || result.content || '').slice(0, 2000),
          url: result.url || '',
          date: result.published_date || new Date().toISOString(),
          stance,
          summary,
        }
      );

      if (statusUpdate && statusUpdate !== 'Unknown') {
        await runQuery(`MATCH (c:Claim {id: $claimId}) SET c.status = $status, c.updatedAt = datetime()`, {
          claimId: claim.id,
          status: statusUpdate
        });
      }

      evidenceAdded++;
    }
  }

  if (entityName) {
    const entityRows = await runQuery(`MATCH (e {name: $name})-[:HAS_CLAIM]->(c:Claim) RETURN e, collect(c) as claims`, { name: entityName });
    if (entityRows.length) {
      const claimsForEntity = entityRows[0].claims || [];
      const reliabilityScore = calculateReliabilityScore(claimsForEntity);
      const overpromiseIndex = calculateOverpromiseIndex(claimsForEntity);
      await runQuery(`MATCH (e {name: $name}) SET e.reliabilityScore = $score, e.overpromiseIndex = $index, e.updatedAt = datetime()`, {
        name: entityName,
        score: reliabilityScore,
        index: overpromiseIndex
      });
    }
  }

  return NextResponse.json({ success: true, evidenceAdded });
}
