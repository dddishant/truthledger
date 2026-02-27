import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, hasOpenAI } from '@/lib/server/config';
import { extractClaimsFromText, type ExtractedClaim } from '@/lib/server/llm';
import * as repo from '@/lib/server/repository';
import * as fallback from '@/lib/server/fallback';

const bodySchema = z.object({
  subjectEntityId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  speakerEntityId: z.string().optional(),
  transcriptText: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  sourceTitle: z.string().min(3).optional()
});

function buildDefaultExtraction(text: string): ExtractedClaim[] {
  return [
    {
      claimText: text.slice(0, 180),
      category: 'Other',
      metric: undefined,
      targetDate: undefined,
      certainty: 'Moderate'
    }
  ];
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'Invalid request payload',
          details: parsed.error.flatten(),
          addedClaims: 0,
          addedEvidence: 0
        },
        { status: 200 }
      );
    }

    const payload = parsed.data;
    const subjectEntityId = payload.subjectEntityId ?? payload.entityId ?? 'comp-helixai';
    const transcriptText =
      payload.transcriptText ??
      'Management expects to improve reliability controls and deliver roadmap milestones by the next two quarters with moderate confidence.';

    let extractedClaims: ExtractedClaim[] = buildDefaultExtraction(transcriptText);
    let llmUsed = false;
    let llmError: string | undefined;

    if (hasOpenAI()) {
      try {
        extractedClaims = await extractClaimsFromText(transcriptText);
        llmUsed = true;
      } catch (error) {
        llmError = (error as Error).message;
      }
    }

    if (!hasDatabase()) {
      const created = fallback.createScan({
        subjectEntityId,
        speakerEntityId: payload.speakerEntityId,
        transcriptText,
        sourceTitle: payload.sourceTitle,
        sourceUrl: payload.sourceUrl,
        extractedClaims
      });

      if (!hasOpenAI()) {
        return NextResponse.json(
          {
            ok: false,
            reason: 'Missing OPENAI_API_KEY',
            addedClaims: 0,
            addedEvidence: 0,
            claim: created.claim,
            evidence: created.evidence,
            extractedClaims
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          reason: llmError ? 'OpenAI failed, used fallback extraction' : 'Scan complete',
          details: llmError,
          addedClaims: 1,
          addedEvidence: 1,
          llmUsed,
          claim: created.claim,
          evidence: created.evidence,
          extractedClaims
        },
        { status: 200 }
      );
    }

    const primary = extractedClaims[0];
    const createdClaim = await repo.createClaim({
      subjectEntityId,
      speakerEntityId: payload.speakerEntityId,
      claimText: primary.claimText,
      structured: {
        category: primary.category,
        metric: primary.metric,
        targetDate: primary.targetDate,
        certainty: primary.certainty
      },
      status: 'Unknown',
      statusConfidence: 0.5
    });

    const createdEvidence = await repo.createEvidence({
      claimId: createdClaim.id,
      type: 'neutral',
      title: payload.sourceTitle ?? 'Freshly scanned transcript segment',
      snippet: transcriptText.slice(0, 220),
      sourceUrl: payload.sourceUrl ?? 'https://source-not-provided.local'
    });

    await repo.createOutbreakEvent({
      type: 'new-claim',
      entityId: subjectEntityId,
      title: 'New claim extracted from transcript scan',
      detail: createdClaim.claimText,
      severity: 'medium'
    });

    if (!hasOpenAI()) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'Missing OPENAI_API_KEY',
          addedClaims: 0,
          addedEvidence: 0,
          claim: createdClaim,
          evidence: createdEvidence,
          extractedClaims
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reason: llmError ? 'OpenAI failed, used fallback extraction' : 'Scan complete',
        details: llmError,
        addedClaims: 1,
        addedEvidence: 1,
        llmUsed,
        claim: createdClaim,
        evidence: createdEvidence,
        extractedClaims
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Scan failed',
        details: (error as Error).message,
        addedClaims: 0,
        addedEvidence: 0
      },
      { status: 200 }
    );
  }
}
