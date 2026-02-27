function scoreClaim(claim) {
  let score = 0.35;
  if (['implemented', 'failed', 'metric'].includes(claim.category)) score += 0.25;
  if (claim.timeframe && /20\d{2}|Q[1-4]/i.test(claim.timeframe)) score += 0.15;
  if (/(\$\d|\d+%|\b\d+(\.\d+)?\b)/.test(claim.statement)) score += 0.15;
  if (claim.evidence.some((e) => !!e.quote)) score += 0.1;
  if (/\b(the article claims|people claim|it is claimed|claim that)\b/i.test(claim.statement)) score -= 0.4;
  if (/\b(claims?|promises?)\b/i.test(claim.statement) && !/\b(launched|shipped|released|working on|plans to|will|delayed|cancelled|increased|reduced|reached)\b/i.test(claim.statement)) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

function isRealClaim(claim) {
  const hasAttribution = !!(claim.attribution && (claim.attribution.speaker || claim.attribution.org || claim.attribution.source_type === 'official' || claim.attribution.source_type === 'filing'));
  const hasEvidence = !!(claim.evidence?.length && claim.evidence[0].url);
  const hasVerb = /\b(launched|shipped|released|rolled out|deployed|delivered|implemented|working on|developing|plans to|will|aims to|targets|delayed|cancelled|failed to|reduced|increased|improved|reached|hit|grew|declined)\b/i.test(claim.statement);
  const hasObject = !!(claim.object && claim.object.trim().length > 1);
  if (!hasAttribution || !hasEvidence || !hasVerb || !hasObject) return false;
  return scoreClaim(claim) >= 0.55;
}

const tests = [
  {
    name: 'promise without deliverable => NO claim',
    claim: {
      statement: 'The company promises big things in AI.',
      category: 'planned',
      timeframe: '',
      object: '',
      attribution: { org: 'ExampleCo', source_type: 'news' },
      evidence: [{ url: 'https://example.com', quote: '' }]
    },
    expected: false
  },
  {
    name: 'Apple shipped X feature in iOS 18 => implemented claim',
    claim: {
      statement: 'Apple shipped on-device transcription in iOS 18.',
      category: 'implemented',
      timeframe: '2024',
      object: 'on-device transcription in iOS 18',
      attribution: { org: 'Apple', source_type: 'official' },
      evidence: [{ url: 'https://apple.com/newsroom', quote: 'Apple shipped on-device transcription in iOS 18.' }]
    },
    expected: true
  },
  {
    name: 'Tesla delayed Cybertruck production targets => failed/delayed claim',
    claim: {
      statement: 'Tesla delayed Cybertruck production targets to next year.',
      category: 'failed',
      timeframe: 'next year',
      object: 'Cybertruck production targets',
      attribution: { org: 'Tesla', source_type: 'news' },
      evidence: [{ url: 'https://example.com/tesla-delay', quote: 'Tesla delayed Cybertruck production targets to next year.' }]
    },
    expected: true
  }
];

let ok = 0;
for (const t of tests) {
  const result = isRealClaim(t.claim);
  const pass = result === t.expected;
  if (pass) ok++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${t.name} -> ${result}`);
}

if (ok !== tests.length) process.exit(1);
