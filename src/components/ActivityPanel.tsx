'use client';

import { Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui';

export interface ActivityPanelProps {
  recordLabel?: string;
  className?: string;
}

export function ActivityPanel({ recordLabel = 'your workspace', className }: ActivityPanelProps) {
  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col border-l border-border/60 bg-card/80 backdrop-blur-md',
        className
      )}
    >
      <Card className="h-full rounded-none border-0 shadow-none bg-transparent">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            Live Activity
          </CardTitle>
          <p className="text-xs text-muted-foreground">Recent updates across {recordLabel}</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Calls, emails, tasks, and notes will appear here as your team works.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
