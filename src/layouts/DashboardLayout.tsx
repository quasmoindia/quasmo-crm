import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  FiAlertCircle,
  FiBarChart2,
  // FiBell,
  FiBox,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShoppingCart,
  FiUsers,
  FiUserCheck,
  FiX,
  FiClock,
  FiBriefcase,
  FiGlobe,
  FiShoppingBag,
} from 'react-icons/fi';
import { clearStoredToken, useCurrentUser } from '../api/auth';
import {
  canAccessAttendancePath,
  getVisibleAttendanceNavItems,
} from '../config/attendanceNav';
import { canUseDefaultSelfPunch, getAttendanceModuleTitle, isSelfPunchPath } from '../config/attendanceAccess';
import { canAccessModule, NAV_MODULES, getModuleIdFromPath } from '../config/roles';
import { useKioskMode } from '../hooks/useKioskMode';
import { BrandLogo } from '../components/BrandLogo';
import { GlobalSearch } from '../components/GlobalSearch';

const NAV_SECTIONS = [
  { title: null, moduleIds: ['dashboard'] },
  { title: 'Sales & CRM', moduleIds: ['leads', 'customers', 'complaints', 'tenders', 'tradeindia_inquiries', 'indiamart_leads'] },
  { title: 'Products & Inventory', moduleIds: ['products', 'orders', 'documents'] },
  { title: null, moduleIds: ['attendance'] },
  { title: 'Operations', moduleIds: ['invoices', 'expenses', 'users', 'roles'] },
] as const;

const navIconsByModuleId: Record<string, IconType> = {
  dashboard: FiGrid,
  leads: FiBarChart2,
  customers: FiUsers,
  complaints: FiAlertCircle,
  tenders: FiBriefcase,
  tradeindia_inquiries: FiGlobe,
  indiamart_leads: FiShoppingBag,
  products: FiBox,
  orders: FiShoppingCart,
  documents: FiFileText,
  invoices: FiClipboard,
  expenses: FiDollarSign,
  users: FiUserCheck,
  roles: FiSettings,
  attendance: FiClock,
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useCurrentUser();
  const user = data?.user;
  const visibleNavItems = user
    ? NAV_MODULES.filter((item) => canAccessModule(user.role, item.moduleId, user.roleModules))
    : NAV_MODULES;

  const currentModuleId = getModuleIdFromPath(location.pathname);
  const onSelfPunchPath = isSelfPunchPath(location.pathname);
  const canAccessCurrent =
    !currentModuleId ||
    !user ||
    (onSelfPunchPath && canUseDefaultSelfPunch(user.role)) ||
    canAccessModule(user.role, currentModuleId, user.roleModules);
  const redirectToDashboard = user && currentModuleId && !canAccessCurrent;
  const canAttendanceModule =
    !!user && canAccessModule(user.role, 'attendance', user.roleModules);
  const canSelfPunchNav = !!user && canUseDefaultSelfPunch(user.role);
  const attendanceSidebarItems = getVisibleAttendanceNavItems(user?.role);
  const attendanceRouteForbidden =
    !!user &&
    location.pathname.startsWith('/dashboard/attendance') &&
    !canAccessAttendancePath(location.pathname, user.role);
  const attendanceFallbackPath =
    attendanceSidebarItems[0]?.path ?? '/dashboard';
  const attendanceSectionTitle = getAttendanceModuleTitle(user?.role);
  const navByModuleId = new Map(visibleNavItems.map((item) => [item.moduleId, item]));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const { locked: kioskLocked } = useKioskMode();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  function handleLogout() {
    clearStoredToken();
    navigate('/', { replace: true });
  }

  const sidebarContent = (
    <>
      <div className="flex h-17 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 sm:px-5">
        <BrandLogo variant="mark" iconClassName="h-10 w-10" />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 lg:hidden"
          aria-label="Close navigation menu"
        >
          <FiX className="size-5" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3.5">
        {NAV_SECTIONS.map((section) => {
          const isAttendanceSection = (section.moduleIds as readonly string[]).includes('attendance');
          const sectionTitle = isAttendanceSection ? attendanceSectionTitle : section.title;

          const sectionItems = section.moduleIds
            .filter((moduleId) => moduleId !== 'attendance')
            .map((moduleId) => navByModuleId.get(moduleId))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

          const showAttendance =
            isAttendanceSection && (canSelfPunchNav || (canAttendanceModule && attendanceSidebarItems.length > 0));

          if (!sectionItems.length && !showAttendance) return null;

          return (
            <div key={isAttendanceSection ? 'attendance' : section.title ?? 'root'} className="space-y-2">
              {sectionTitle ? (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {sectionTitle}
                </p>
              ) : null}
              <div className="space-y-1">
                {sectionItems.map(({ path, label, end, moduleId }) => {
                  const Icon = navIconsByModuleId[moduleId] ?? FiGrid;
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      end={end}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-linear-to-r from-[#3f51ff] to-[#305dff] text-white shadow-[0_8px_20px_rgba(59,93,255,0.35)]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  );
                })}
                {showAttendance
                  ? attendanceSidebarItems.map(({ path, label, end, icon: Icon, activePaths }) => (
                      <NavLink
                        key={path}
                        to={path}
                        end={end}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl py-2 pl-4 pr-3 text-sm font-medium transition-all ${
                            (activePaths ? activePaths.includes(location.pathname) : isActive)
                              ? 'bg-linear-to-r from-[#3f51ff] to-[#305dff] text-white shadow-[0_8px_20px_rgba(59,93,255,0.35)]'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    ))
                  : null}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <FiLogOut className="size-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6fb]">
      {!kioskLocked && drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {!kioskLocked && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-[#dfe5f2] bg-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:shadow-none ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          aria-label="Primary navigation"
        >
          {sidebarContent}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!kioskLocked && (
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#dfe5f2] bg-white px-4 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation menu"
          >
            <FiMenu className="size-5" />
          </button>

          <span className="shrink-0 text-base font-semibold text-slate-800 sm:hidden">HexaCRM</span>

          <GlobalSearch />

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 flex-col text-right sm:flex sm:pr-1">
              <span className="truncate text-sm font-semibold leading-tight text-slate-900">
                {user?.fullName ?? 'Admin User'}
              </span>
              <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {(user?.role ?? 'admin').replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            {/* Notifications — re-enable when wired up
            <button
              type="button"
              className="relative shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <FiBell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500" />
            </button>
            */}
            {/* Settings shortcut — re-enable when needed
            <button
              type="button"
              className="hidden shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
              aria-label="Settings"
            >
              <FiSettings className="size-5" />
            </button>
            */}
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#3f51ff] to-[#305dff] text-xs font-semibold text-white"
              title={user?.fullName ?? user?.email ?? 'User'}
              aria-label={user?.fullName ? `Account: ${user.fullName}` : 'Account'}
            >
              <span aria-hidden>{(user?.fullName ?? user?.email ?? 'U').charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>
        )}
        <main
          className={`min-h-0 flex-1 overflow-auto bg-[#f4f6fb] ${
            kioskLocked ? 'p-4 sm:p-6' : 'px-4 py-3 sm:px-6 sm:py-5 lg:py-6'
          }`}
        >
          {redirectToDashboard ? (
            <Navigate to="/dashboard" replace />
          ) : attendanceRouteForbidden ? (
            <Navigate to={attendanceFallbackPath} replace />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
