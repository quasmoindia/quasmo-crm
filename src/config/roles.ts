/**
 * Dynamic roles and modules – add new entries here to extend.
 * Empty or unknown role = full access (existing users).
 */

/** Role id -> module ids ('*' = all modules) */
export const ROLE_MODULE_MAP: Record<string, readonly string[]> = {
  admin: ['*'],
  user: ['dashboard', 'complaints', 'leads'],
  viewer: ['dashboard'],
  // content_writer: ['dashboard', 'content'],
  // sales_manager: ['dashboard', 'sales', 'leads'],
  technician: ['dashboard', 'complaints'],
};

/** Role id -> display label (fallback if API not used) */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  user: 'User',
  viewer: 'Viewer',
  // content_writer: 'Content writer',
  // sales_manager: 'Sales manager',
  technician: 'Technician',
};

/** Nav items: only modules that have a route get an entry here */
export interface NavModule {
  moduleId: string;
  label: string;
  path: string;
  end: boolean;
}

export const NAV_MODULES: NavModule[] = [
  { moduleId: 'dashboard', label: 'Dashboard', path: '/dashboard', end: true },
  { moduleId: 'users', label: 'User management', path: '/dashboard/users', end: false },
  { moduleId: 'roles', label: 'Role management', path: '/dashboard/roles', end: false },
  { moduleId: 'complaints', label: 'Complaint management', path: '/dashboard/complaints', end: false },
  { moduleId: 'leads', label: 'Lead management', path: '/dashboard/leads', end: false },
  // Sales / Finance / Content – commented for now
  // { moduleId: 'sales', label: 'Sales management', path: '/dashboard/sales', end: false },
  // { moduleId: 'finance', label: 'Finance management', path: '/dashboard/finance', end: false },
  // { moduleId: 'content', label: 'Content', path: '/dashboard/content', end: false },
];

/**
 * Check if user can access module. Uses roleModules from API when present; else falls back to static map.
 * Empty or unknown role = full access (existing users).
 */
export function canAccessModule(
  role: string | undefined,
  moduleId: string,
  roleModules?: string[]
): boolean {
  if (roleModules !== undefined && roleModules !== null) {
    if (roleModules.includes('*')) return true;
    return roleModules.includes(moduleId);
  }
  if (role === undefined || role === null || role === '') return true;
  const moduleIds = ROLE_MODULE_MAP[role];
  if (!moduleIds) return true;
  if (moduleIds.includes('*')) return true;
  return moduleIds.includes(moduleId);
}

export function getRoleLabel(
  role: string | undefined,
  rolesFromApi?: { id: string; label: string }[]
): string {
  if (!role) return '—';
  const fromApi = rolesFromApi?.find((r) => r.id === role);
  if (fromApi) return fromApi.label;
  return ROLE_LABELS[role] ?? role;
}

/** Resolve module id from pathname for route protection (longest path wins) */
export function getModuleIdFromPath(pathname: string): string | null {
  const sorted = [...NAV_MODULES].sort((a, b) => b.path.length - a.path.length);
  const item = sorted.find(
    (m) => pathname === m.path || pathname.startsWith(m.path + '/')
  );
  return item?.moduleId ?? null;
}
