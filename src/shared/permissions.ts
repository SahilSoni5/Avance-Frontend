import { Role, Module, Action } from './types';

type PermissionMatrix = Record<Role, Partial<Record<Module, Action[]>>>;

const CRM_MODULES: Partial<Record<Module, Action[]>> = {
  contacts: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
  accounts: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
  brands: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
  deals: ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'assign'],
  opportunities: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
  tasks: ['create', 'read', 'update', 'delete', 'assign'],
  calls: ['create', 'read', 'update', 'delete'],
  emails: ['create', 'read', 'update', 'delete'],
  calendar: ['create', 'read', 'update', 'delete'],
  campaigns: ['create', 'read', 'update', 'delete', 'approve'],
  reports: ['read', 'export'],
  documents: ['create', 'read', 'update', 'delete'],
  teams: ['create', 'read', 'update', 'delete'],
  users: ['create', 'read', 'update', 'delete'],
  organizations: ['read', 'update'],
  data: ['read', 'export', 'import'],
  hierarchy: ['create', 'read', 'update', 'delete'],
  custom_fields: ['create', 'read', 'update', 'delete'],
};

export const PERMISSIONS: PermissionMatrix = {
  [Role.ADMIN]: {
    ...CRM_MODULES,
    users: ['create', 'read', 'update', 'delete'],
    organizations: ['create', 'read', 'update', 'delete'],
    data: ['read', 'export', 'import'],
    hierarchy: ['create', 'read', 'update', 'delete'],
    teams: ['create', 'read', 'update', 'delete'],
    tickets: ['create', 'read', 'update', 'delete', 'assign'],
    automations: ['create', 'read', 'update', 'delete'],
    products: ['create', 'read', 'update', 'delete'],
    billing: ['read', 'update'],
    goals: ['create', 'read', 'update', 'delete'],
    portal: ['create', 'read', 'update', 'delete'],
  },
  [Role.BOSS]: {
    ...CRM_MODULES,
    users: ['create', 'read', 'update', 'delete'],
    organizations: ['read', 'update'],
    data: ['read', 'export', 'import'],
    hierarchy: ['create', 'read', 'update', 'delete'],
    teams: ['create', 'read', 'update', 'delete'],
    tickets: ['create', 'read', 'update', 'delete', 'assign'],
    automations: ['read'],
    goals: ['read'],
    billing: ['read'],
    portal: ['read'],
  },
  [Role.MANAGER]: {
    contacts: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
    accounts: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
    brands: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
    deals: ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'assign'],
    opportunities: ['create', 'read', 'update', 'delete', 'export', 'import', 'assign'],
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    calls: ['create', 'read', 'update', 'delete'],
    emails: ['create', 'read', 'update', 'delete'],
    calendar: ['create', 'read', 'update', 'delete'],
    campaigns: ['create', 'read', 'update', 'delete', 'approve'],
    reports: ['read', 'export'],
    documents: ['create', 'read', 'update', 'delete'],
    teams: ['read', 'update'],
    users: ['create', 'read', 'update'],
    organizations: ['read'],
    data: ['read', 'export', 'import'],
    hierarchy: ['read'],
    custom_fields: ['read'],
    tickets: ['create', 'read', 'update', 'assign'],
  },
  [Role.EMPLOYEE]: {
    contacts: ['create', 'read', 'update', 'export', 'import'],
    accounts: ['create', 'read', 'update', 'export', 'import'],
    brands: ['create', 'read', 'update', 'export', 'import'],
    deals: ['create', 'read', 'update'],
    opportunities: ['create', 'read', 'update'],
    tasks: ['create', 'read', 'update', 'assign'],
    calls: ['create', 'read', 'update'],
    emails: ['create', 'read', 'update'],
    calendar: ['create', 'read', 'update'],
    campaigns: ['create', 'read'],
    reports: ['read', 'export'],
    documents: ['create', 'read', 'update'],
    teams: ['read'],
    users: ['create', 'read'],
    organizations: ['read'],
    data: ['read', 'export', 'import'],
    custom_fields: ['read'],
  },
  [Role.INTERN]: {
    contacts: ['create', 'read', 'update'],
    accounts: ['read'],
    brands: ['read'],
    deals: ['create', 'read', 'update'],
    opportunities: ['create', 'read', 'update'],
    tasks: ['create', 'read', 'update'],
    calls: ['create', 'read', 'update'],
    emails: ['create', 'read', 'update'],
    calendar: ['create', 'read', 'update'],
    campaigns: ['read'],
    reports: ['read'],
    documents: ['create', 'read', 'update'],
    teams: ['read'],
    users: ['read'],
    organizations: ['read'],
    custom_fields: ['read'],
  },
};

export function hasPermission(role: Role, module: Module, action: Action): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const modulePerms = rolePerms[module] ?? (module === 'brands' ? rolePerms.accounts : undefined);
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}

export function canCreateRole(creatorRole: Role, targetRole: Role): boolean {
  if (creatorRole === Role.ADMIN) return true;
  if (creatorRole === Role.BOSS) {
    return targetRole === Role.MANAGER || targetRole === Role.EMPLOYEE;
  }
  if (creatorRole === Role.MANAGER) {
    return targetRole === Role.EMPLOYEE || targetRole === Role.INTERN;
  }
  if (creatorRole === Role.EMPLOYEE) {
    return targetRole === Role.INTERN;
  }
  return false;
}

export function canDeactivateUser(actorRole: Role, targetRole: Role, isInActorTeam: boolean): boolean {
  if (actorRole === Role.ADMIN) return true;
  if (actorRole === Role.BOSS) {
    return [Role.MANAGER, Role.EMPLOYEE, Role.INTERN].includes(targetRole);
  }
  if (actorRole === Role.MANAGER) {
    return isInActorTeam && [Role.EMPLOYEE, Role.INTERN].includes(targetRole);
  }
  return false;
}
