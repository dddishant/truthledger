import { NextResponse } from 'next/server';
import { outbreakFeed } from '@/lib/mock/data';
import { realtimeOutbreakFeed } from '@/lib/server/realtime';

export async function GET() {
  try {
    const fallback = [...outbreakFeed].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
    try {
      const live = await realtimeOutbreakFeed();
      const data = [...live, ...fallback].slice(0, 12);
      return NextResponse.json(data, { status: 200 });
    } catch {
      return NextResponse.json(fallback, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'outbreak_failed', details: (error as Error).message, data: [] }, { status: 200 });
  }
}
