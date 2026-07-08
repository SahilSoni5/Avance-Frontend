import {
  LayoutDashboard, Users, Building2, CheckSquare, Phone, Mail,
  Calendar, Megaphone, BarChart3, FileText, UsersRound, Settings, Crown,
  GitBranch, UserCircle, UserCog, Target,
} from 'lucide-react';
import { Role } from '@crm/shared';

const ALL_ROLES = [Role.ADMIN, Role.BOSS, Role.MANAGER, Role.EMPLOYEE, Role.INTERN] as const;
const NON_INTERN = [Role.ADMIN, Role.BOSS, Role.MANAGER, Role.EMPLOYEE] as const;

/** Core AVANCE modules — extra modules (tickets, goals, billing, etc.) are not exposed in the UI. */
export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [...ALL_ROLES] },
  { to: '/contacts', icon: Users, label: 'Contacts', roles: [...ALL_ROLES] },
  { to: '/brands', icon: Building2, label: 'Brands', roles: [...ALL_ROLES] },
  { to: '/opportunities', icon: Target, label: 'Opportunities', roles: [...ALL_ROLES] },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', roles: [...ALL_ROLES] },
  { to: '/calls', icon: Phone, label: 'Calls', roles: [...ALL_ROLES] },
  { to: '/emails', icon: Mail, label: 'Emails', roles: [...ALL_ROLES] },
  { to: '/calendar', icon: Calendar, label: 'Calendar', roles: [...ALL_ROLES] },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns', roles: [...ALL_ROLES] },
  { to: '/teams', icon: UsersRound, label: 'Teams', roles: [...ALL_ROLES] },
  { to: '/users', icon: UserCog, label: 'Users', roles: [Role.ADMIN, Role.BOSS, Role.MANAGER] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: [...ALL_ROLES] },
  { to: '/documents', icon: FileText, label: 'Documents', roles: [...ALL_ROLES] },
  { to: '/org-chart', icon: GitBranch, label: 'Org Chart', roles: [Role.ADMIN] },
  { to: '/hierarchy', icon: Crown, label: 'Hierarchy', roles: [Role.ADMIN] },
  { to: '/profile', icon: UserCircle, label: 'My Profile', roles: [...ALL_ROLES] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: [...NON_INTERN] },
];

export const SCOPE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Viewing: Org-Wide',
  [Role.BOSS]: 'Viewing: Org-Wide',
  [Role.MANAGER]: 'Viewing: My Team',
  [Role.EMPLOYEE]: 'Viewing: My Records',
  [Role.INTERN]: 'Viewing: My Records',
};
