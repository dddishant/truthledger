import OpenAI from 'openai';
import { z } from 'zod';
import { getOptionalEnv, requireEnv } from '@/lib/server/config';

const claimSchema = z.object({
  claimText: z.string().min(10),
  category: z.enum(['Climate/ESG', 'Financial', 'Product', 'AI Safety', 'Hiring', 'Other']),
  metric: z.string().optional(),
  targetDate: z.string().optional(),
  certainty: z.enum(['Strong', 'Moderate', 'Hedged'])
});

const extractionSchema = z.object({ claims: z.array(claimSchema).min(1).max(5) });

export type ExtractedClaim = z.infer<typeof claimSchema>;

function parseJsonPayload(raw: string): ExtractedClaim[] {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = extractionSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Invalid OpenAI extraction payload: ${parsed.error.message}`);
  }
  return parsed.data.claims;
}

export async function extractClaimsFromText(transcript: string): Promise<ExtractedClaim[]> {
  const client = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  const model = getOptionalEnv('OPENAI_MODEL') ?? 'gpt-4o-mini';

  const response = await client.responses.create({
    model,
    temperature: 0.1,
    input: [
      {
        role: 'system',
        content:
          'Extract concrete public commitments from corporate speech. Return strict JSON only with claims[]. Dates should be ISO format when possible.'
      },
      { role: 'user', content: transcript }
    ]
  });

  const output = response.output_text?.trim();
  if (!output) throw new Error('OpenAI returned empty output');

  return parseJsonPayload(output);
}
