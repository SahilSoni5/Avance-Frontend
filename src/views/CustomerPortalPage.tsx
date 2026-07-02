'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BookOpen, Ticket, Mail, LogIn } from 'lucide-react';
import { Button, Card, Input, Dialog, Badge } from '../components/ui';
import { RecordForm } from '../components/RecordForm';
import { formatDateIST } from '../lib/locale';
import { API_BASE as API_ROOT } from '../lib/config';

const API_BASE = `${API_ROOT}/portal-public`;

async function portalFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? data.error ?? 'Request failed');
  return data;
}

interface Article {
  id: string;
  title: string;
  content: string;
  helpfulCount: number;
}

interface PortalTicket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

export function CustomerPortalPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('portal-token'));
  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [orgSlug] = useState('acme-corp');

  const { data: articles } = useQuery({
    queryKey: ['portal-articles', orgSlug],
    queryFn: () => portalFetch<{ data: Article[] }>(`/articles?org=${orgSlug}`),
  });

  const { data: tickets, refetch: refetchTickets } = useQuery({
    queryKey: ['portal-tickets', token],
    queryFn: () => portalFetch<{ data: PortalTicket[] }>('/tickets', {}, token),
    enabled: !!token,
  });

  const magicLinkMutation = useMutation({
    mutationFn: () => portalFetch('/magic-link', { method: 'POST', body: JSON.stringify({ email, orgSlug }) }),
    onSuccess: () => setMagicSent(true),
  });

  const verifyMutation = useMutation({
    mutationFn: () => portalFetch<{ data: { token: string } }>('/verify', { method: 'POST', body: JSON.stringify({ token: verifyToken }) }),
    onSuccess: (res) => {
      const t = res.data.token;
      localStorage.setItem('portal-token', t);
      setToken(t);
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: (body: { subject: string; description: string }) =>
      portalFetch('/tickets', { method: 'POST', body: JSON.stringify(body) }, token),
    onSuccess: () => {
      refetchTickets();
      setTicketOpen(false);
    },
  });

  const loggedIn = !!token;

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <header className="border-b border-border dark:border-slate-800 bg-card dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Customer Portal</h1>
          {loggedIn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('portal-token');
                setToken(null);
              }}
            >
              Sign Out
            </Button>
          ) : (
            <Badge>Public</Badge>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!loggedIn && (
          <Card className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <LogIn className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Magic Link Login</h2>
            </div>
            {!magicSent ? (
              <div className="flex flex-wrap gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 min-w-[200px]"
                />
                <div className="flex items-end">
                  <Button disabled={!email || magicLinkMutation.isPending} onClick={() => magicLinkMutation.mutate()}>
                    Send Magic Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-green-600">Magic link sent! Enter the token from your email:</p>
                <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Paste token" />
                <Button disabled={!verifyToken || verifyMutation.isPending} onClick={() => verifyMutation.mutate()}>
                  Verify & Sign In
                </Button>
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Knowledge Base</h2>
            </div>
            <div className="space-y-3">
              {articles?.data?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedArticle(a)}
                  className="w-full text-left p-4 rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 hover:border-primary/30 transition-colors"
                >
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{a.helpfulCount} found helpful</p>
                </button>
              ))}
              {!articles?.data?.length && <p className="text-sm text-slate-500">No articles available</p>}
            </div>
          </section>

          {loggedIn && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">My Tickets</h2>
                </div>
                <Button size="sm" onClick={() => setTicketOpen(true)}>New Ticket</Button>
              </div>
              <div className="space-y-3">
                {tickets?.data?.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900">
                    <p className="font-medium">{t.subject}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge>{t.status.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-slate-400">{formatDateIST(t.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {!tickets?.data?.length && <p className="text-sm text-slate-500">No tickets yet</p>}
              </div>
            </section>
          )}
        </div>
      </main>

      <Dialog open={!!selectedArticle} onClose={() => setSelectedArticle(null)} title={selectedArticle?.title ?? ''} className="max-w-2xl">
        {selectedArticle && (
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
        )}
      </Dialog>

      <Dialog open={ticketOpen} onClose={() => setTicketOpen(false)} title="Create Support Ticket">
        <RecordForm
          fields={[
            { name: 'subject', label: 'Subject', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
          ]}
          loading={createTicketMutation.isPending}
          submitLabel="Submit Ticket"
          onSubmit={(values) => createTicketMutation.mutate({ subject: String(values.subject), description: String(values.description) })}
        />
      </Dialog>
    </div>
  );
}
