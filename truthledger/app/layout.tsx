import './globals.css';
import type { Metadata } from 'next';
import { initSchema } from '@/lib/neo4j';
import { hasNeo4jConfig } from '@/lib/runtime';

export const metadata: Metadata = {
  title: 'TruthLedger',
  description: 'Living accountability ledger for public promises',
};

let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  if (!hasNeo4jConfig()) return;
  try {
    await initSchema();
    schemaInitialized = true;
  } catch (error) {
    console.error('Neo4j schema init failed:', error);
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSchema();

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
