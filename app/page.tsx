import Link from 'next/link';
import { ArrowRight, AudioLines, Network, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  {
    title: 'Claim Extraction',
    description: 'Track promises with metrics, deadlines, certainty, and speaker attribution from earnings calls and interviews.',
    icon: ScanSearch
  },
  {
    title: 'Knowledge Graph',
    description: 'Map company-to-person-to-claim-to-evidence relationships and inspect contradictions as they emerge over time.',
    icon: Network
  },
  {
    title: 'Voice Confidence Signal',
    description: 'Upload audio clips to compute a mock Confidence Integrity Signal with a Modulate integration placeholder.',
    icon: AudioLines
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="glass-panel rounded-3xl p-6 md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div className="text-sm font-semibold tracking-[0.16em] text-muted-foreground">AUTONOMOUS MEMORY FOR THE INTERNET</div>
            <ThemeToggle />
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border bg-background/60 px-3 py-1 text-xs tracking-wide text-muted-foreground">
                Corporate Claim Accountability Engine
              </div>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                A living memory for public claims.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                Extract commitments, track outcomes, link evidence, and surface confidence mismatches across companies and executives.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">Open Dashboard <ArrowRight className="h-4 w-4" /></Button>
                </Link>
                <Link href="/report/comp-helixai">
                  <Button size="lg" variant="outline">View Demo Report</Button>
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-4">
              <div className="grid gap-3">
                <MiniPanel title="Reliability Score" value="61" subtitle="HelixAI Cloud" trend="Overpromising Index: High" />
                <MiniPanel title="Status Shift" value="Unfulfilled" subtitle="EU Sovereign Hosting Claim" trend="Contradicting evidence added Oct 4, 2025" />
                <MiniPanel title="Voice Signal" value="72%" subtitle="Confidence mismatch" trend="Earnings call Q2 clip" />
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="glass-panel relative overflow-hidden">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-background/60 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">Feature {String(idx + 1).padStart(2, '0')}</div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function MiniPanel({ title, value, subtitle, trend }: { title: string; value: string; subtitle: string; trend: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm">{subtitle}</div>
      <div className="mt-2 text-xs text-muted-foreground">{trend}</div>
    </div>
  );
}
