import { NextResponse } from 'next/server';
import { evidence } from '@/lib/mock/data';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const data = evidence
      .filter((item) => item.claimId === context.params.id)
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'evidence_failed', details: (error as Error).message, data: [] }, { status: 200 });
  }
}
