import { NextResponse } from 'next/server';
import { buildGraphForEntity } from '@/lib/mock/data';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const graph = buildGraphForEntity(context.params.id);
    return NextResponse.json(graph, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'graph_failed', details: (error as Error).message, nodes: [], links: [] }, { status: 200 });
  }
}
