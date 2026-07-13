'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Star } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeIST } from '../lib/locale';
import { ModulePage, LoadingRows, ErrorMessage, StatusBadge, OwnerCell } from '../components/ModulePage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { RichTextEditor } from '../components/RichTextEditor';

function htmlToPlain(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? '';
}
import { Button, Dialog, SectionCard, Badge } from '../components/ui';
import { Input } from '../components/ui/Input';

interface TicketDetail {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  csatScore: number | null;
  assignee: { firstName: string; lastName: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  replies: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
    userId: string | null;
  }>;
  escalations: Array<{ escalationReason: string; createdAt: string }>;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [replyHtml, setReplyHtml] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [csatScore, setCsatScore] = useState(5);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<{ data: TicketDetail }>(`/tickets/${id}`),
    enabled: !!id,
  });

  const ticket = data?.data;

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyHtml('');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/tickets/${id}/escalate`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setEscalateOpen(false);
      setEscalateReason('');
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ score, note }: { score: number; note: string }) =>
      apiFetch(`/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          content: `<p>Ticket closed. CSAT: ${score}/5</p>${note ? `<p>${note}</p>` : ''}`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setCloseOpen(false);
    },
  });

  if (isLoading) return <ModulePage title="Ticket"><LoadingRows /></ModulePage>;
  if (error || !ticket) return <ModulePage title="Ticket"><ErrorMessage error={error ?? 'Not found'} /></ModulePage>;

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <ModulePage title={ticket.subject}>
      <Breadcrumbs items={[{ label: 'Tickets', href: '/tickets' }, { label: ticket.subject }]} />

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <StatusBadge status={ticket.status.replace(/_/g, ' ')} />
        <Badge>{ticket.priority}</Badge>
        {!isClosed && (
          <>
            <Button size="sm" variant="outline" onClick={() => setEscalateOpen(true)}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Escalate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}>Close Ticket</Button>
          </>
        )}
        {ticket.csatScore != null && (
          <Badge variant="success">CSAT: {ticket.csatScore}/5</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {ticket.description && (
            <SectionCard title="Description">
              <p className="text-sm -mt-2">{ticket.description}</p>
            </SectionCard>
          )}

          <SectionCard title="Replies">
            <div className="space-y-4 -mt-2">
              {ticket.replies?.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg ${r.isInternal ? 'bg-muted dark:bg-slate-800/50' : 'bg-primary/5 dark:bg-primary/10'}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: r.content }} className="text-sm prose prose-sm dark:prose-invert max-w-none" />
                  <p className="text-xs text-slate-400 mt-2">{formatDateTimeIST(r.createdAt)}</p>
                </div>
              ))}
              {!ticket.replies?.length && <p className="text-sm text-slate-500">No replies yet</p>}
            </div>

            {!isClosed && (
              <div className="mt-6 pt-4 border-t dark:border-slate-800">
                <RichTextEditor value={replyHtml} onChange={setReplyHtml} placeholder="Write a reply..." />
                <Button
                  className="mt-3"
                  size="sm"
                  disabled={!htmlToPlain(replyHtml).trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate(replyHtml)}
                >
                  Send Reply
                </Button>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Details">
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Assignee</dt><dd>{ticket.assignee ? <OwnerCell owner={ticket.assignee} /> : 'Unassigned'}</dd></div>
              {ticket.contact && (
                <div>
                  <dt className="text-slate-500">Contact</dt>
                  <dd>
                    <Link href={`/contacts/${ticket.contact.id}`} className="text-primary hover:underline">
                      {ticket.contact.firstName} {ticket.contact.lastName}
                    </Link>
                  </dd>
                </div>
              )}
              {ticket.account && (
                <div>
                  <dt className="text-slate-500">Brand</dt>
                  <dd>
                    <Link href={`/brands/${ticket.account.id}`} className="text-primary hover:underline">
                      {ticket.account.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {ticket.escalations?.length > 0 && (
            <SectionCard title="Escalations">
              <ul className="space-y-2 -mt-2">
                {ticket.escalations.map((e, i) => (
                  <li key={i} className="text-sm p-2 rounded bg-amber-50 dark:bg-amber-900/20">
                    {e.escalationReason}
                    <p className="text-xs text-slate-400 mt-1">{formatDateTimeIST(e.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} title="Escalate Ticket">
        <Input
          label="Reason"
          value={escalateReason}
          onChange={(e) => setEscalateReason(e.target.value)}
          placeholder="Why is this being escalated?"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setEscalateOpen(false)}>Cancel</Button>
          <Button disabled={!escalateReason.trim()} onClick={() => escalateMutation.mutate(escalateReason)}>Escalate</Button>
        </div>
      </Dialog>

      <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} title="Close Ticket & CSAT">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Rate customer satisfaction before closing.</p>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setCsatScore(n)} className="p-1">
              <Star className={`w-8 h-8 ${n <= csatScore ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
          <Button onClick={() => closeMutation.mutate({ score: csatScore, note: '' })}>Close Ticket</Button>
        </div>
      </Dialog>
    </ModulePage>
  );
}
