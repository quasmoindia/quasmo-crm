import { NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FiBell, FiSettings } from 'react-icons/fi';
import { clearStoredToken, useCurrentUser } from '../api/auth';
import { canAccessModule, NAV_MODULES, getModuleIdFromPath } from '../config/roles';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useCurrentUser();
  const user = data?.user;
  const visibleNavItems = user
    ? NAV_MODULES.filter((item) => canAccessModule(user.role, item.moduleId, user.roleModules))
    : NAV_MODULES;

  const currentModuleId = getModuleIdFromPath(location.pathname);
  const canAccessCurrent =
    !currentModuleId || !user || canAccessModule(user.role, currentModuleId, user.roleModules);
  const redirectToDashboard = user && currentModuleId && !canAccessCurrent;

  function handleLogout() {
    clearStoredToken();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-200 p-4">
          <h1 className="text-lg font-semibold text-slate-800">Quasmo CRM</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {visibleNavItems.map(({ path, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <span className="mr-auto text-sm font-medium text-slate-700">
            Welcome, {user?.fullName ?? user?.email ?? 'User'}
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <FiBell className="size-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Settings"
          >
            <FiSettings className="size-5" />
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6">
          {redirectToDashboard ? <Navigate to="/dashboard" replace /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
