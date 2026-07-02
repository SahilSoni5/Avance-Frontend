export enum Role {
  ADMIN = 'ADMIN',
  BOSS = 'BOSS',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  INTERN = 'INTERN',
}

export const ROLE_HIERARCHY_LEVEL: Record<Role, number> = {
  [Role.ADMIN]: 0,
  [Role.BOSS]: 1,
  [Role.MANAGER]: 2,
  [Role.EMPLOYEE]: 3,
  [Role.INTERN]: 4,
};

export type Module =
  | 'contacts'
  | 'accounts'
  | 'brands'
  | 'deals'
  | 'tasks'
  | 'calls'
  | 'emails'
  | 'calendar'
  | 'campaigns'
  | 'reports'
  | 'documents'
  | 'teams'
  | 'users'
  | 'organizations'
  | 'data'
  | 'hierarchy'
  | 'custom_fields'
  /** @deprecated Removed from product UI — API routes kept for data migration */
  | 'tickets'
  | 'automations'
  | 'products'
  | 'billing'
  | 'goals'
  | 'portal';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve' | 'assign';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  reportsToId: string | null;
  hierarchyLevel: number;
  isActive: boolean;
}

export interface ScopeContext {
  userIds: string[];
  teamIds: string[];
  isAdmin: boolean;
  isBoss: boolean;
  scopeType: 'all' | 'team' | 'self';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
  sessionId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
