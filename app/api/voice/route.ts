import { NextResponse } from 'next/server';
import { hasDatabase, hasModulate } from '@/lib/server/config';
import { analyzeWithModulate } from '@/lib/server/modulate';
import * as repo from '@/lib/server/repository';
import * as fallback from '@/lib/server/fallback';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const entityId = String(form.get('entityId') ?? '');
    const claimId = String(form.get('claimId') ?? '');
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Expected multipart file field: file' }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    let modulate: Awaited<ReturnType<typeof analyzeWithModulate>> | null = null;
    if (hasModulate()) {
      try {
        modulate = await analyzeWithModulate(file, entityId);
      } catch (error) {
        console.warn('[api/voice] Modulate unavailable, using fallback analysis:', (error as Error).message);
      }
    }

    if (!hasDatabase()) {
      const saved = fallback.createVoiceAnalysis({
        entityId,
        claimId: claimId || undefined,
        audioFileName: file.name,
        signals: modulate?.signals,
        summary: modulate?.summary
      });
      return NextResponse.json(saved);
    }

    const saved = await repo.createVoiceAnalysis({
      entityId,
      claimId: claimId || undefined,
      audioFileName: file.name,
      signals: modulate?.signals ?? {
        intimidation: 0.2,
        stress: 0.45,
        defensiveness: 0.4,
        confidenceMismatch: 0.5
      },
      summary: modulate?.summary ?? 'Fallback voice analysis generated without external provider.'
    });

    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Voice analysis failed', details: (error as Error).message }, { status: 500 });
  }
}
