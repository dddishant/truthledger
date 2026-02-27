import type { ApiClaimFixture, SourceDocFixture } from './types';

const FIXTURES: Record<string, { claims: ApiClaimFixture[]; sources: SourceDocFixture[] }> = {
  'apple inc.': {
    claims: [
      {
        type: 'commitment',
        text: 'Apple commits to be carbon neutral across its entire footprint by 2030.',
        evidence: [
          {
            url: 'https://www.apple.com/environment/',
            title: 'Apple Environment',
            snippet: 'Apple is committed to being carbon neutral across our entire footprint by 2030.',
            source_name: 'Apple'
          }
        ]
      }
    ],
    sources: [
      {
        url: 'https://www.apple.com/environment/',
        title: 'Apple Environment',
        snippet: 'Apple is committed to being carbon neutral across our entire footprint by 2030.',
        text: 'Apple is committed to being carbon neutral across our entire footprint by 2030.',
        source_name: 'Apple'
      }
    ]
  },
  'tesla, inc.': {
    claims: [
      {
        type: 'commitment',
        text: 'Tesla states its mission is to accelerate the world’s transition to sustainable energy.',
        evidence: [
          {
            url: 'https://www.tesla.com/about',
            title: 'About Tesla',
            snippet: 'Tesla’s mission is to accelerate the world’s transition to sustainable energy.',
            source_name: 'Tesla'
          }
        ]
      }
    ],
    sources: [
      {
        url: 'https://www.tesla.com/about',
        title: 'About Tesla',
        snippet: 'Tesla’s mission is to accelerate the world’s transition to sustainable energy.',
        text: 'Tesla’s mission is to accelerate the world’s transition to sustainable energy.',
        source_name: 'Tesla'
      }
    ]
  }
};

function normalize(name: string) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getFixtureClaims(entityName: string, topic: string): { claims: ApiClaimFixture[]; sources: SourceDocFixture[] } {
  const base = FIXTURES[normalize(entityName)] || { claims: [], sources: [] };
  if (!topic.trim()) return base;

  const lowerTopic = topic.toLowerCase();
  const claims = base.claims.filter((c) => c.text.toLowerCase().includes(lowerTopic) || c.evidence.some((e) => e.snippet.toLowerCase().includes(lowerTopic)));
  const sources = base.sources.filter((s) => s.text.toLowerCase().includes(lowerTopic) || s.snippet.toLowerCase().includes(lowerTopic));
  return { claims, sources };
}
