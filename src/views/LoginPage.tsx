'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { Button, Input } from '../components/ui';
import { API_BASE } from '../lib/config';
import { APP_NAME, Role } from '@crm/shared';

interface LoginUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          email,
          password,
          ...(needs2FA && totpCode ? { totpCode } : {}),
        }),
      });
      let data: { error?: { code?: string; message?: string }; data?: { accessToken: string; user: LoginUser } };
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? 'Invalid server response' : `Login failed (${res.status})`);
      }
      if (!res.ok) {
        if (data.error?.code === 'TOTP_REQUIRED') {
          setNeeds2FA(true);
          setError('Enter the 6-digit code from your authenticator app');
          return;
        }
        throw new Error(data.error?.message ?? 'Login failed');
      }
      if (!data.data?.accessToken || !data.data.user) {
        throw new Error('Invalid server response');
      }
      setAuth(data.data.accessToken, data.data.user);
      router.push('/');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Login timed out. The API may be unavailable — check /api/health and redeploy.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="absolute inset-0 mesh-bg opacity-60" />
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
          </div>

          <div className="space-y-6 max-w-md animate-slide-up">
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
              Close deals.
              <br />
              <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
                Delight customers.
              </span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Your all-in-one workspace for contacts, pipeline, tickets, and team hierarchy — built for speed.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {['Pipeline Kanban', 'Smart Search', 'Role Scoping', 'Live Notifications'].map((feat) => (
                <span
                  key={feat}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/10 backdrop-blur-sm"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500">© {APP_NAME}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background mesh-bg">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">{APP_NAME}</span>
          </div>

          <div className="glass-card p-8 sm:p-10 !rounded-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">Sign in to continue to your workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20 animate-slide-up">
                  {error}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {needs2FA && (
                <Input
                  label="Authenticator code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                />
              )}
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-glow-sm active:scale-[0.98] transition-transform"
              >
                {loading ? 'Signing in...' : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
