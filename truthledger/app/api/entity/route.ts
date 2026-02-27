import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { error: 'Missing entity name in path. Use /api/entity/<name>' },
    { status: 400, headers: { 'Cache-Control': 'no-store' } }
  );
}
