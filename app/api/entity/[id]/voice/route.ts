import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/server/config';
import * as repo from '@/lib/server/repository';
import * as fallback from '@/lib/server/fallback';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const items = hasDatabase() ? await repo.getVoiceForEntity(context.params.id) : fallback.getVoiceForEntity(context.params.id);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Voice lookup failed', details: (error as Error).message }, { status: 500 });
  }
}
