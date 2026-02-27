'use client';

import * as React from 'react';
import { BellRing, ChevronDown, ChevronUp, WandSparkles } from 'lucide-react';
import { ClaimStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { Claim, Evidence } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function ClaimsTimeline({ claims, evidence }: { claims: Claim[]; evidence: Evidence[] }) {
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [selectedClaim, setSelectedClaim] = React.useState<Claim | null>(null);

  const toggle = (id: string) => setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      {claims.map((claim) => {
        const items = evidence.filter((e) => e.claimId === claim.id).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
        const isOpen = expanded.includes(claim.id);
        return (
          <div key={claim.id} className="relative pl-7">
            <div className="absolute left-2 top-2 h-full w-px bg-border" />
            <div className="absolute left-0 top-2 h-4 w-4 rounded-full border-2 border-primary bg-background" />
            <Card className="glass-panel">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{claim.structured.category}</Badge>
                      <ClaimStatusBadge status={claim.status} />
                      <Badge variant="secondary">{Math.round(claim.statusConfidence * 100)}% confidence</Badge>
                    </div>
                    <div className="font-medium leading-snug">{claim.claimText}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Target: {formatDate(claim.structured.targetDate)} • Certainty: {claim.structured.certainty} • Created: {formatDate(claim.createdAt)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedClaim(claim)}>
                          <WandSparkles className="h-4 w-4" /> Generate Alert Text
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generated Alert Text</DialogTitle>
                          <DialogDescription>Mock alert text for newsroom, investor, or policy monitoring workflows.</DialogDescription>
                        </DialogHeader>
                        <div className="rounded-md border bg-muted/50 p-3 text-sm">
                          {selectedClaim
                            ? `Alert: ${selectedClaim.status} update detected for "${selectedClaim.structured.metric ?? selectedClaim.structured.category}". Confidence ${Math.round(selectedClaim.statusConfidence * 100)}%. Review recent contradicting/supporting evidence and timeline slippage.`
                            : 'Select a claim.'}
                        </div>
                        <DialogFooter>
                          <Button type="button">Copy Alert Text</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="sm" onClick={() => toggle(claim.id)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Evidence ({items.length})
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    {items.length === 0 && <div className="text-sm text-muted-foreground">No evidence linked yet.</div>}
                    {items.map((ev) => (
                      <div key={ev.id} className="rounded-lg border bg-background/70 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{ev.title}</div>
                          <Badge variant={ev.type === 'supporting' ? 'success' : ev.type === 'contradicting' ? 'danger' : 'secondary'}>
                            {ev.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{ev.snippet}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <BellRing className="h-3 w-3" /> {formatDate(ev.publishedAt)}
                          <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            source
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
