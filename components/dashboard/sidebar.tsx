'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Building2, FileText, Home, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard?section=companies', label: 'Companies', icon: Building2 },
  { href: '/dashboard?section=people', label: 'People', icon: Users },
  { href: '/dashboard?section=claims', label: 'Claims', icon: BarChart3 },
  { href: '/dashboard?section=reports', label: 'Reports', icon: FileText },
  { href: '/dashboard?section=settings', label: 'Settings', icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="glass-panel sticky top-4 h-fit rounded-2xl p-3">
      <div className="mb-4 px-2 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AMI</div>
        <div className="mt-1 text-sm font-semibold">Claim Accountability Engine</div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === '/dashboard' && item.href.startsWith('/dashboard');
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground',
                active && item.label === 'Dashboard' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
