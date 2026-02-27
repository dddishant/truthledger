'use client';

import * as React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClaimStatusBadge } from '@/components/status-badge';
import type { Claim, Evidence } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function ClaimsTable({ claims, evidence }: { claims: Claim[]; evidence: Evidence[] }) {
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [sortKey, setSortKey] = React.useState<'createdAt' | 'targetDate' | 'statusConfidence'>('createdAt');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const categories = Array.from(new Set(claims.map((c) => c.structured.category)));
  const statuses = Array.from(new Set(claims.map((c) => c.status)));

  const rows = React.useMemo(() => {
    const filtered = claims.filter(
      (c) => (statusFilter === 'All' || c.status === statusFilter) && (categoryFilter === 'All' || c.structured.category === categoryFilter)
    );
    return filtered.sort((a, b) => {
      const av = sortKey === 'targetDate' ? new Date(a.structured.targetDate ?? 0).getTime() : sortKey === 'createdAt' ? new Date(a.createdAt).getTime() : a.statusConfidence;
      const bv = sortKey === 'targetDate' ? new Date(b.structured.targetDate ?? 0).getTime() : sortKey === 'createdAt' ? new Date(b.createdAt).getTime() : b.statusConfidence;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [claims, statusFilter, categoryFilter, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Claims</CardTitle>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-md border bg-background px-2 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="rounded-md border bg-background px-2 py-1 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option>All</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => toggleSort('targetDate')}>
                  Target Date <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => toggleSort('statusConfidence')}>
                  Confidence <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Last Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((claim) => {
              const claimEvidence = evidence.filter((e) => e.claimId === claim.id).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
              const lastEvidence = claimEvidence[0];
              return (
                <TableRow key={claim.id}>
                  <TableCell>
                    <div className="max-w-[360px]">
                      <div className="line-clamp-2 font-medium">{claim.claimText}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Created {formatDate(claim.createdAt)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{claim.structured.category}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(claim.structured.targetDate)}</TableCell>
                  <TableCell><ClaimStatusBadge status={claim.status} /></TableCell>
                  <TableCell>{Math.round(claim.statusConfidence * 100)}%</TableCell>
                  <TableCell>
                    {lastEvidence ? (
                      <div className="max-w-[240px] text-xs">
                        <div className="truncate font-medium">{lastEvidence.title}</div>
                        <div className="text-muted-foreground">{formatDate(lastEvidence.publishedAt)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No evidence</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
