import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/server/config';
import * as repo from '@/lib/server/repository';
import * as fallback from '@/lib/server/fallback';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const bundle = hasDatabase() ? await repo.getReportBundle(context.params.id) : fallback.getReportBundle(context.params.id);
    if (!bundle) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    return NextResponse.json(bundle);
  } catch (error) {
    return NextResponse.json({ error: 'Report bundle failed', details: (error as Error).message }, { status: 500 });
  }
}
