'use client';

import { CalendarRange, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';

interface DashboardTopbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onRunFreshScan: () => void;
  scanning?: boolean;
  scanProgressMessage?: string;
  scanProgressPercent?: number;
}

export function DashboardTopbar({
  query,
  onQueryChange,
  onRunFreshScan,
  scanning,
  scanProgressMessage,
  scanProgressPercent
}: DashboardTopbarProps) {
  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search company or person (e.g. HelixAI, Mira Chen)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2">
          <CalendarRange className="h-4 w-4" />
          Last 12 months
        </Button>
        <Button className="gap-2" onClick={onRunFreshScan} disabled={scanning}>
          <Sparkles className="h-4 w-4" />
          {scanning ? 'Scanning...' : 'Run Fresh Scan'}
        </Button>
        <ThemeToggle />
      </div>
      {scanProgressMessage ? (
        <div className="text-xs text-muted-foreground lg:ml-2">
          {scanProgressMessage}
          {typeof scanProgressPercent === 'number' ? ` (${Math.round(scanProgressPercent)}%)` : ''}
        </div>
      ) : null}
    </div>
  );
}
