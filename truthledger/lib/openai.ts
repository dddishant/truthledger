import OpenAI from 'openai';
import { hasOpenAIConfig } from '@/lib/runtime';
import { classifySimpleEvidence, extractSimpleClaimsFromText } from '@/lib/mock-store';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });

export async function extractClaimsFromText(text: string, sourceUrl: string, sourceDate: string): Promise<any[]> {
  if (!hasOpenAIConfig()) {
    return extractSimpleClaimsFromText(text, sourceUrl, sourceDate);
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a promise extraction specialist. Extract ALL specific, measurable public promises or commitments from the given text.

For each claim, extract:
- text: verbatim or near-verbatim quote
- category: one of [Financial, Product, ESG, Expansion, Personnel, Legal, Other]
- metric: what is being measured (e.g. "revenue", "carbon emissions", "headcount")
- target: the specific number/goal (e.g. "$10B", "net zero", "50 countries")
- deadline: when it will be achieved (ISO date or natural language like "Q3 2025")
- certainty: "Definitive" (will/commit/guarantee), "Aspirational" (aim/hope/target), or "Conditional" (if/pending/subject to)
- speaker: person who made the claim if identifiable

Return a JSON object: {"claims": Claim[]}. If no claims found, return {"claims": []}.
Only extract forward-looking commitments, not past accomplishments.`
      },
      {
        role: 'user',
        content: `Source URL: ${sourceUrl}\nSource Date: ${sourceDate}\n\nText:\n${text.slice(0, 12000)}`
      }
    ],
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{"claims":[]}');
  return (result.claims || []).map((c: any) => ({ ...c, sourceUrl, sourceDate }));
}

export async function extractClaimsFromImage(
  base64Image: string,
  mimeType: string,
  sourceUrl: string
): Promise<any[]> {
  if (!hasOpenAIConfig()) {
    return [
      {
        text: 'We plan to scale deployment significantly by next year.',
        category: 'Expansion',
        metric: 'deployment scale',
        target: 'significant scale-up',
        deadline: String(new Date().getFullYear() + 1),
        certainty: 'Aspirational',
        speaker: '',
        sourceUrl,
        sourceDate: new Date().toISOString(),
        sourceType: mimeType.includes('pdf') ? 'pdf' : 'image'
      }
    ];
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a promise extraction specialist analyzing images of documents, slides, and infographics.
Extract ALL specific, measurable public promises or commitments visible in the image.
Return a JSON object with a "claims" array. Each claim must have: text, category, metric, target, deadline, certainty, speaker.
Only extract forward-looking commitments.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
          },
          { type: 'text', text: `Source: ${sourceUrl}. Extract all measurable forward-looking claims.` }
        ]
      }
    ],
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{"claims":[]}');
  return (result.claims || []).map((c: any) => ({ ...c, sourceUrl, sourceDate: new Date().toISOString(), sourceType: 'image' }));
}

export async function classifyEvidenceStance(
  claimText: string,
  evidenceText: string
): Promise<{ stance: 'Supporting' | 'Contradicting' | 'Neutral'; summary: string; statusUpdate?: string }> {
  if (!hasOpenAIConfig()) {
    return classifySimpleEvidence(claimText, evidenceText);
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You classify whether a piece of evidence supports, contradicts, or is neutral toward a specific claim.

Also determine if the evidence updates the claim status:
- "Fulfilled": claim was achieved
- "Contradicted": directly denied/reversed
- "Behind": evidence suggests delay
- "On Track": progress confirmed
- "Unknown": no clear signal

Return JSON: { stance: "Supporting"|"Contradicting"|"Neutral", summary: "one sentence", statusUpdate: "..." }`
      },
      {
        role: 'user',
        content: `CLAIM: "${claimText}"\n\nEVIDENCE: "${evidenceText.slice(0, 3000)}"`
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{"stance":"Neutral","summary":"No clear signal","statusUpdate":"Unknown"}');
}

export async function generateEntitySummary(entityName: string, claims: any[]): Promise<string> {
  if (!hasOpenAIConfig()) {
    return `${entityName} has ${claims.length} tracked commitments with mixed progress signals. This summary is generated in mock mode without external AI services.`;
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Generate a concise 2-3 sentence accountability summary for an investor/journalist audience. Focus on patterns: what was promised, what was delivered, what was not.'
      },
      {
        role: 'user',
        content: `Entity: ${entityName}\nClaims: ${JSON.stringify(claims.slice(0, 20), null, 2)}`
      }
    ]
  });
  return response.choices[0].message.content || '';
}
