import { NextResponse } from 'next/server';
import { entities } from '@/lib/mock/data';
import { realtimeSearchEntities } from '@/lib/server/realtime';

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function makeEntityId(input: { id?: any; type?: any; name?: any }) {
  const rawId = input?.id != null ? String(input.id).trim() : '';
  if (rawId) return rawId;

  const type = input?.type ? String(input.type) : 'entity';
  const name = input?.name ? String(input.name) : 'unknown';
  return `${slugify(type)}:${slugify(name)}`;
}

function normalizeEntity(e: any) {
  const name = e?.name ? String(e.name) : 'Unknown';
  const type = e?.type ? String(e.type) : 'entity';
  const tags = Array.isArray(e?.tags) ? e.tags.map(String) : [];

  return {
    ...e,
    id: makeEntityId({ id: e?.id, type, name }),
    name,
    type,
    tags,
    description: e?.description ? String(e.description) : '',
    website: e?.website ? String(e.website) : '',
    reliabilityScore: typeof e?.reliabilityScore === 'number' ? e.reliabilityScore : 0,
    overpromisingIndex: typeof e?.overpromisingIndex === 'number' ? e.overpromisingIndex : 0
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    if (!q) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const mockResults = entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.description.toLowerCase().includes(q) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(q))
    );

    try {
      const realtime = await realtimeSearchEntities(q);
      const rawResults = [...realtime, ...mockResults].slice(0, 20);
      const normalized = (rawResults ?? []).map(normalizeEntity);
      if (normalized.some((x) => !x.id)) {
        console.warn(
          '[api/search] entity missing id after normalization',
          normalized.filter((x) => !x.id)
        );
      }
      return NextResponse.json({ results: normalized }, { status: 200 });
    } catch {
      const normalized = (mockResults ?? []).map(normalizeEntity);
      if (normalized.some((x) => !x.id)) {
        console.warn(
          '[api/search] entity missing id after normalization',
          normalized.filter((x) => !x.id)
        );
      }
      return NextResponse.json({ results: normalized }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'search_failed', details: (error as Error).message, results: [] },
      { status: 200 }
    );
  }
}
