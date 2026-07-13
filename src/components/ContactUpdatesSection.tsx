'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateTimeIST } from '@/lib/locale';
import { cn } from '@/lib/utils';

export interface ContactUpdate {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700',
  BOSS: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  INTERN: 'bg-gray-100 text-gray-600',
};

interface ContactUpdatesSectionProps {
  contactId: string;
  canPost: boolean;
}

export function ContactUpdatesSection({ contactId, canPost }: ContactUpdatesSectionProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contact-updates', contactId],
    queryFn: () => apiFetch<{ data: ContactUpdate[] }>(`/contacts/${contactId}/updates`),
    enabled: !!contactId,
  });

  const postMutation = useMutation({
    mutationFn: (text: string) =>
      apiFetch(`/contacts/${contactId}/updates`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-updates', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-detail', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      setContent('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const updates = data?.data ?? [];

  function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      setError('Write an update before posting.');
      return;
    }
    postMutation.mutate(text);
  }

  return (
    <section className="pt-4 border-t border-border/40">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <MessageSquarePlus className="w-3.5 h-3.5" />
        POC Updates
      </h4>

      {canPost && (
        <form onSubmit={handlePost} className="mb-4 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Share a POC update for managers and the team..."
            className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {postMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Post Update
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading updates...
        </div>
      ) : updates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No updates yet. Post the latest POC progress for your manager and team.
        </p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {updates.map((update) => (
            <article
              key={update.id}
              className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5"
            >
              <p className="text-sm text-foreground whitespace-pre-wrap">{update.content}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {update.user.firstName} {update.user.lastName}
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full font-medium',
                    ROLE_STYLES[update.user.role] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  {update.user.role}
                </span>
                <span>{formatDateTimeIST(update.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
