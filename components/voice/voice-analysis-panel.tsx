'use client';

import * as React from 'react';
import { AudioLines, Info, UploadCloud } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { VoiceAnalysis } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useSubmitVoiceAnalysis } from '@/lib/hooks/use-api';

function SignalBar({ label, value }: { label: string; value?: number }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function VoiceAnalysisPanel({ entityId, analyses }: { entityId: string; analyses: VoiceAnalysis[] }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const queryClient = useQueryClient();
  const mutation = useSubmitVoiceAnalysis(entityId);

  const latest = mutation.data ?? analyses[0];

  const onFile = (f?: File | null) => setFile(f ?? null);

  const analyze = async () => {
    if (!file) return;
    await mutation.mutateAsync(file);
    await queryClient.invalidateQueries({ queryKey: ['voice', entityId] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="h-4 w-4" /> Voice Confidence Signal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-xl border-2 border-dashed p-5 text-center transition ${dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background/60'}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">Drag and drop an audio clip</div>
            <div className="mt-1 text-xs text-muted-foreground">Earnings call, interview, or statement clip (mp3/wav)</div>
            <input className="mt-3 w-full text-xs" type="file" accept="audio/*" onChange={(e) => onFile(e.target.files?.[0])} />
            {file && <div className="mt-2 text-xs text-primary">Selected: {file.name}</div>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2">
                    <Info className="h-3 w-3" /> Integration note
                  </button>
                </TooltipTrigger>
                <TooltipContent>Placeholder integration point for Modulate API</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button className="w-full" disabled={!file || mutation.isPending} onClick={analyze}>
            {mutation.isPending ? 'Analyzing...' : 'Analyze with Modulate'}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Signals & Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latest && <div className="text-sm text-muted-foreground">No analyses yet. Upload a clip to generate a Confidence Integrity Signal.</div>}
          {latest && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{latest.audioFileName}</Badge>
                <Badge variant="secondary">{formatDate(latest.createdAt)}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SignalBar label="Stress" value={latest.signals.stress} />
                <SignalBar label="Defensiveness" value={latest.signals.defensiveness} />
                <SignalBar label="Intimidation" value={latest.signals.intimidation} />
                <SignalBar label="Confidence Mismatch" value={latest.signals.confidenceMismatch} />
              </div>
              <div className="rounded-lg border bg-background/60 p-4 text-sm">{latest.summary}</div>
              {analyses.length > 1 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Previous Analyses</div>
                  {analyses.slice(1, 4).map((a) => (
                    <div key={a.id} className="rounded-md border bg-background/50 p-3 text-xs text-muted-foreground">
                      {a.audioFileName} • {formatDate(a.createdAt)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
