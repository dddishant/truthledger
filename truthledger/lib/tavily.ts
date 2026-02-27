const TAVILY_BASE = 'https://api.tavily.com';
import { hasTavilyConfig } from '@/lib/runtime';

export async function searchClaims(query: string, maxResults = 10): Promise<any[]> {
  if (!hasTavilyConfig()) {
    return Array.from({ length: Math.min(maxResults, 3) }).map((_, i) => ({
      url: `https://example.com/mock-source-${i + 1}`,
      title: `Mock result ${i + 1}`,
      snippet: `Mock search hit for: ${query}`,
      raw_content: `This mock article discusses promises and progress related to ${query}.`,
      published_date: new Date().toISOString()
    }));
  }

  const response = await fetch(`${TAVILY_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_raw_content: true,
      include_answer: false,
    })
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export async function searchEvidenceForClaim(
  claim: { text: string; metric: string; target: string; deadline: string },
  entityName: string
): Promise<any[]> {
  const queries = [
    `${entityName} "${claim.metric}" ${claim.target} update`,
    `${entityName} ${claim.metric} progress ${new Date().getFullYear()}`,
    `${entityName} promise commitment ${claim.metric} delivered`,
  ];

  const results = await Promise.all(queries.map((q) => searchClaims(q, 5)));
  const flat = results.flat();

  const seen = new Set<string>();
  return flat.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

export async function discoverSourcesForEntity(entityName: string, entityType: 'company' | 'person'): Promise<string[]> {
  const queries = entityType === 'company' ? [
    `${entityName} investor relations press release 2024 2025`,
    `${entityName} earnings call transcript commitments`,
    `${entityName} annual report targets goals`,
    `${entityName} CEO interview promise announcement`,
  ] : [
    `${entityName} public statement promise commitment`,
    `${entityName} interview goals targets 2024 2025`,
    `${entityName} speech announcement forecast`,
  ];

  const results = await Promise.all(queries.map((q) => searchClaims(q, 5)));
  const urls = results.flat().map((r: any) => r.url);
  return [...new Set(urls)];
}
