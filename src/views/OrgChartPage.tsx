'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Shield, UserCircle, GraduationCap, KeyRound, Users2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/auth.store';

interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string | null;
  email: string;
  isActive: boolean;
  reports?: OrgNode[];
}

const ROLE_CONFIG: Record<string, { style: string; icon: React.ElementType; gradient: string }> = {
  BOSS: { style: 'border-amber-300 bg-amber-50', icon: Crown, gradient: 'from-amber-400 to-orange-500' },
  MANAGER: { style: 'border-indigo-300 bg-indigo-50', icon: Shield, gradient: 'from-indigo-400 to-violet-500' },
  EMPLOYEE: { style: 'border-slate-300 bg-slate-50', icon: UserCircle, gradient: 'from-slate-400 to-slate-600' },
  INTERN: { style: 'border-gray-300 bg-gray-50', icon: GraduationCap, gradient: 'from-gray-400 to-gray-500' },
  ADMIN: { style: 'border-rose-300 bg-rose-50', icon: KeyRound, gradient: 'from-rose-400 to-pink-500' },
};

function OrgNodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const config = ROLE_CONFIG[node.role] ?? ROLE_CONFIG.EMPLOYEE;
  const { icon: Icon } = config;
  const hasChildren = node.reports && node.reports.length > 0;
  const initials = `${node.firstName[0]}${node.lastName[0]}`;

  return (
    <div className={cn('flex flex-col items-center', depth > 0 && 'mt-4')}>
      {/* Connector line from parent */}
      {depth > 0 && <div className="w-px h-6 bg-border/60" />}

      {/* Node */}
      <div
        className={cn('relative border-2 rounded-2xl p-4 min-w-[160px] max-w-[200px] text-center shadow-sm',
          config.style,
          !node.isActive && 'opacity-60',
          hasChildren && 'cursor-pointer hover:shadow-md transition-shadow'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {node.avatar ? (
          <img src={node.avatar} alt={node.firstName} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
        ) : (
          <div className={cn('w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br', config.gradient)}>
            {initials}
          </div>
        )}
        <p className="font-semibold text-sm text-foreground leading-tight">{node.firstName} {node.lastName}</p>
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <Icon className="w-3 h-3" />
          <span className="text-xs text-muted-foreground">{node.role}</span>
        </div>
        {hasChildren && (
          <button type="button" className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-3 flex flex-row gap-6 items-start relative">
          {/* Horizontal connector */}
          {node.reports!.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-border/60" style={{ top: '24px' }} />
          )}
          {node.reports!.map(child => (
            <OrgNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => apiFetch<{ data: OrgNode[] }>('/org/chart'),
    enabled: !!user && ['ADMIN'].includes(user.role),
  });

  const roots = data?.data ?? [];

  if (user && !['ADMIN'].includes(user.role)) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>You do not have access to Org Chart.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <h1 className="text-2xl font-bold text-foreground">Org Chart</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visual hierarchy of your organisation. Click nodes to expand/collapse.</p>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No org chart data</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {roots.map(node => (
              <OrgNodeCard key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
