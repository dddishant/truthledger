import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
    );
  }
  return driver;
}

export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session: Session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r: any) => {
      const obj: any = {};
      r.keys.forEach((key: string) => {
        const val = r.get(key);
        obj[key] = val && typeof val === 'object' && val.properties ? val.properties : val;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

export async function initSchema() {
  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (v:VoiceAnalysis) REQUIRE v.id IS UNIQUE',
  ];
  for (const c of constraints) {
    await runQuery(c);
  }
}
