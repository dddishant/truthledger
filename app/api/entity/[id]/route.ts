import { NextResponse } from 'next/server';
import { entities } from '@/lib/mock/data';
import { getRealtimeEntityById } from '@/lib/server/realtime';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const entity = entities.find((item) => item.id === context.params.id) ?? getRealtimeEntityById(context.params.id) ?? null;
    if (!entity) return NextResponse.json({ error: 'entity_not_found', data: null }, { status: 200 });
    return NextResponse.json(entity, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'entity_failed', details: (error as Error).message, data: null }, { status: 200 });
  }
}
