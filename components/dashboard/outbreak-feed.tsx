'use client';

import { BellDot, Dot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  severity: 'low' | 'medium' | 'high';
};

export function OutbreakFeed({ items, loading }: { items?: FeedItem[]; loading?: boolean }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Claim Outbreak Feed</CardTitle>
        <BellDot className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        {!loading && items?.map((item) => (
          <div key={item.id} className="rounded-xl border bg-background/60 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="font-medium leading-tight">{item.title}</div>
              <Badge variant={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : 'success'}>
                {item.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{item.detail}</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Dot className="h-4 w-4" />
              {formatDate(item.occurredAt)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
