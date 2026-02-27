import { NextRequest, NextResponse } from 'next/server';
import { analyzeVoiceClip } from '@/lib/modulate';
import { runQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import { addVoiceAnalysis } from '@/lib/mock-store';
import { inMockMode } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;
  const entityName = formData.get('entityName') as string;
  const claimId = formData.get('claimId') as string | null;

  const buffer = await audioFile.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const result = await analyzeVoiceClip(base64, audioFile.type);

  if (inMockMode()) {
    addVoiceAnalysis(entityName, {
      audioUrl: '',
      signals: result.signals,
      summary: result.summary,
      confidenceScore: result.confidenceScore,
      riskLevel: result.riskLevel
    });
    return NextResponse.json({ success: true, ...result });
  }

  const vaId = uuidv4();
  await runQuery(
    `MATCH (e {name: $entityName})
     CREATE (va:VoiceAnalysis {
       id: $id, signals: $signals, summary: $summary,
       confidenceScore: $score, riskLevel: $risk, createdAt: datetime()
     })
     CREATE (e)-[:HAS_VOICE_SIGNAL]->(va)
     WITH va
     CALL {
       WITH va
       MATCH (c:Claim {id: $claimId}) WHERE $claimId <> ''
       CREATE (va)-[:ABOUT_CLAIM]->(c)
     }
     RETURN va`,
    {
      entityName,
      id: vaId,
      signals: JSON.stringify(result.signals),
      summary: result.summary,
      score: result.confidenceScore,
      risk: result.riskLevel,
      claimId: claimId || '',
    }
  );

  return NextResponse.json({ success: true, ...result });
}
