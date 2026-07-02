'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Crown, Shield, User, Key, Moon, Sun, PanelLeftClose, PanelLeft, Sparkles, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { Role, APP_NAME } from '@crm/shared';
import { cn } from '../lib/utils';
import { NAV_ITEMS, SCOPE_LABELS } from '../config/nav';
import { TopBar } from '../components/TopBar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ScopeDropdown } from '../components/ScopeDropdown';

const ROLE_CONFIG = {
  [Role.BOSS]: { icon: Crown, gradient: 'from-amber-400 to-orange-500', label: 'Boss' },
  [Role.MANAGER]: { icon: Shield, gradient: 'from-indigo-400 to-violet-500', label: 'Manager' },
  [Role.EMPLOYEE]: { icon: User, gradient: 'from-slate-400 to-slate-500', label: 'Employee' },
  [Role.INTERN]: { icon: GraduationCap, gradient: 'from-stone-400 to-stone-500', label: 'Intern' },
  [Role.ADMIN]: { icon: Key, gradient: 'from-rose-400 to-pink-500', label: 'Admin' },
};

const ROUTE_LABELS: Record<string, string> = {
  contacts: 'Contacts',
  brands: 'Brands',
  accounts: 'Brands',
  deals: 'Deals',
  tasks: 'Tasks',
  calls: 'Calls',
  emails: 'Emails',
  calendar: 'Calendar',
  campaigns: 'Campaigns',
  reports: 'Reports',
  documents: 'Documents',
  teams: 'Teams',
  users: 'Users',
  hierarchy: 'Hierarchy',
  settings: 'Settings',
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Dashboard' }];
  return parts.map((part, i) => {
    const path = '/' + parts.slice(0, i + 1).join('/');
    const isId = /^[0-9a-f-]{36}$/i.test(part);
    return {
      label: isId ? 'Detail' : ROUTE_LABELS[part] ?? part,
      href: i < parts.length - 1 ? path : undefined,
    };
  });
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle, setDark } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    setDark(isDark);
  }, [isDark, setDark]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading session...
        </div>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[user.role as Role] ?? ROLE_CONFIG[Role.EMPLOYEE];
  const RoleIcon = roleConfig.icon;
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={cn(
          'relative flex flex-col shrink-0 transition-all duration-300 ease-out',
          'bg-gradient-to-b from-sidebar via-slate-900 to-sidebar',
          'border-r border-sidebar-border',
          sidebarCollapsed ? 'w-[4.25rem]' : 'w-60'
        )}
      >
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" />

        <div className="relative p-4 border-b border-white/5 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center shadow-glow shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">{APP_NAME}</h1>
                <p className="text-[10px] text-slate-400 truncate">{SCOPE_LABELS[user.role]}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center shadow-glow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors',
              sidebarCollapsed && 'absolute -right-3 top-5 bg-sidebar border border-sidebar-border shadow-md'
            )}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="relative flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {visibleNav.map((item, i) => {
            const isActive =
              item.to === '/'
                ? pathname === '/'
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                href={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                style={{ animationDelay: `${i * 20}ms` }}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'animate-slide-up',
                  isActive
                    ? 'nav-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-3 border-t border-white/5">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 mb-3 p-2 rounded-xl bg-white/5">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br shrink-0', roleConfig.gradient)}>
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-white">{user.firstName} {user.lastName}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <RoleIcon className="w-2.5 h-2.5" />{roleConfig.label}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className={cn(
              'flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 w-full px-2 py-2 rounded-lg hover:bg-red-500/10 transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border/60 bg-card/80 backdrop-blur-md flex items-center gap-3 px-4 shrink-0 z-10">
          <TopBar />
          <ScopeDropdown />
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 mesh-bg">
            <div className="px-6 py-2.5 border-b border-border/40 bg-card/40 backdrop-blur-sm">
              <Breadcrumbs items={breadcrumbs} />
            </div>
            <main className="flex-1 overflow-y-auto scrollbar-thin">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
