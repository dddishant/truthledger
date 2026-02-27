import { NextResponse } from 'next/server';
import { claims } from '@/lib/mock/data';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const data = claims
      .filter((claim) => claim.subjectEntityId === context.params.id || claim.speakerEntityId === context.params.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'claims_failed', details: (error as Error).message, data: [] }, { status: 200 });
  }
}
