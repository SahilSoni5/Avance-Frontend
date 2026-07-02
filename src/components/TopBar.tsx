'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Bell, User, Building2, Handshake, CheckSquare, Command } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

const TYPE_ICONS: Record<string, typeof User> = {
  contact: User,
  account: Building2,
  brand: Building2,
  deal: Handshake,
  task: CheckSquare,
};

const TYPE_COLORS: Record<string, string> = {
  contact: 'from-indigo-500 to-violet-500',
  account: 'from-sky-500 to-cyan-500',
  brand: 'from-sky-500 to-cyan-500',
  deal: 'from-emerald-500 to-teal-500',
  task: 'from-rose-500 to-pink-500',
};

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export function TopBar() {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => apiFetch<{ results: Array<{ type: string; id: string; label: string }> }>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiFetch<{ data: NotificationRow[]; unreadCount: number }>('/notifications?limit=20'),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchRef.current?.querySelector('input')?.focus();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const routes: Record<string, string> = {
    contact: '/contacts',
    account: '/brands',
    brand: '/brands',
    deal: '/deals',
    task: '/tasks',
  };

  const unread = notifData?.unreadCount ?? 0;
  const notifications = notifData?.data ?? [];

  function openNotification(n: NotificationRow) {
    if (!n.isRead) markReadMutation.mutate(n.id);
    setNotifOpen(false);
    const type = n.relatedEntityType?.toLowerCase();
    if (type && n.relatedEntityId && routes[type]) {
      router.push(`${routes[type]}/${n.relatedEntityId}`);
    }
  }

  return (
    <>
      <div className="relative flex-1 max-w-xl" ref={searchRef}>
        <div
          className={cn(
            'relative flex items-center rounded-xl border transition-all duration-200',
            focused || searchOpen
              ? 'border-primary/40 bg-card shadow-glow-sm ring-2 ring-primary/10'
              : 'border-border/60 bg-muted/40 hover:bg-muted/60'
          )}
        >
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setFocused(true); }}
            onBlur={() => setFocused(false)}
            placeholder="Search contacts, brands, deals..."
            className="w-full pl-10 pr-24 py-2.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground outline-none rounded-xl"
          />
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            <span className="kbd hidden sm:inline-flex">
              <Command className="w-2.5 h-2.5 mr-0.5" />K
            </span>
          </div>
        </div>

        {searchOpen && query.length >= 2 && (
          <div className="absolute top-full mt-2 w-full bg-card border border-border/60 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 animate-slide-up">
            {isFetching ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg shimmer" />
                ))}
              </div>
            ) : searchData?.results?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No results for "{query}"</p>
            ) : (
              searchData?.results?.map((r) => {
                const Icon = TYPE_ICONS[r.type] ?? Search;
                const color = TYPE_COLORS[r.type] ?? 'from-slate-500 to-slate-600';
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    onClick={() => { router.push(`${routes[r.type] ?? '/'}/${r.id}`); setSearchOpen(false); setQuery(''); }}
                  >
                    <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shrink-0', color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 truncate font-medium text-foreground">{r.label}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {r.type}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className="relative p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] flex flex-col bg-card border border-border/60 rounded-2xl shadow-xl z-50 animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            </div>
            <ul className="overflow-y-auto scrollbar-thin flex-1 divide-y divide-border/60">
              {notifications.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">No notifications</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors',
                        !n.isRead && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                        <div className={cn('min-w-0 flex-1', n.isRead && 'ml-4')}>
                          <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
