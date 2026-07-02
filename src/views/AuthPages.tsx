'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Mail, Loader2 } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { API_BASE as API } from '../lib/config';

async function postJson<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: { message?: string; code?: string } }> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data: data.data, error: data.error };
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [devLinks, setDevLinks] = useState<Array<{ to: string; subject: string; text?: string }>>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await postJson('/auth/forgot-password', { email });
      if (!result.ok) throw new Error(result.error?.message ?? 'Request failed');
      setSent(true);
      try {
        const dev = await fetch(`${API}/dev/emails`);
        if (dev.ok) {
          const json = await dev.json();
          setDevLinks(json.data ?? []);
        }
      } catch {
        // dev endpoint optional
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link if the account exists">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
          {devLinks.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm space-y-2">
              <p className="font-medium text-amber-800 dark:text-amber-200">Dev mode — captured emails</p>
              {devLinks.slice(0, 3).map((m, i) => (
                <p key={i} className="text-xs break-all text-amber-900 dark:text-amber-100">{m.text ?? m.subject}</p>
              ))}
              <p className="text-xs text-muted-foreground">Or open <code className="text-xs">GET /api/dev/emails</code></p>
            </div>
          )}
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send reset link <Mail className="w-4 h-4" /></>}
          </Button>
          <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await postJson('/auth/reset-password', { token, password });
      if (!result.ok) throw new Error(result.error?.message ?? 'Reset failed');
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This reset link is missing a token">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">Request a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set new password" subtitle="Choose a strong password (min 8 characters)">
      {done ? (
        <p className="text-sm text-green-600">Password updated. Redirecting to sign in…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const result = await postJson('/auth/verify-email', { token });
      if (cancelled) return;
      if (result.ok) {
        setStatus('ok');
        setMessage('Email verified successfully.');
      } else {
        setStatus('error');
        setMessage(result.error?.message ?? 'Verification failed');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthShell title="Verify email" subtitle="Confirming your email address">
      {!token && <p className="text-sm text-red-600">Invalid verification link.</p>}
      {token && status === 'loading' && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
      {status === 'ok' && (
        <div className="space-y-3">
          <p className="text-sm text-green-600">{message}</p>
          <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            Sign in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      {status === 'error' && <p className="text-sm text-red-600">{message}</p>}
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 mesh-bg">
      <div className="w-full max-w-md glass-card p-8 !rounded-2xl animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
