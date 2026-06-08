import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiCalendar,
  FiDollarSign,
  FiGrid,
  FiList,
  FiSun,
  FiSettings,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';

/** Permission tier for each attendance sidebar tab */
export type AttendanceNavPermission =
  | 'core'
  | 'roster'
  | 'sitesShifts'
  | 'reports'
  | 'payroll'
  | 'leaves'
  | 'holidays'
  | 'settings';

export interface AttendanceNavItem {
  path: string;
  label: string;
  end: boolean;
  icon: IconType;
  permission: AttendanceNavPermission;
}

export const ATTENDANCE_NAV_ITEMS: AttendanceNavItem[] = [
  { path: '/dashboard/attendance', label: 'Dashboard', end: true, icon: FiGrid, permission: 'core' },
  { path: '/dashboard/attendance/roster', label: 'Quick punch', end: false, icon: FiUserCheck, permission: 'roster' },
  { path: '/dashboard/attendance/employees', label: 'Employees', end: false, icon: FiUsers, permission: 'core' },
  { path: '/dashboard/attendance/records', label: 'Punch log', end: false, icon: FiList, permission: 'core' },
  { path: '/dashboard/attendance/leaves', label: 'Leaves', end: false, icon: FiCalendar, permission: 'leaves' },
  { path: '/dashboard/attendance/holidays', label: 'Holidays', end: false, icon: FiSun, permission: 'holidays' },
  { path: '/dashboard/attendance/reports', label: 'Reports', end: false, icon: FiBarChart2, permission: 'reports' },
  { path: '/dashboard/attendance/payroll', label: 'Payroll', end: false, icon: FiDollarSign, permission: 'payroll' },
  { path: '/dashboard/attendance/settings', label: 'Settings', end: false, icon: FiSettings, permission: 'settings' },
];

export type AttendanceNavAccess = {
  canViewCore: boolean;
  canViewRoster: boolean;
  canViewSitesShifts: boolean;
  canViewReports: boolean;
  canViewPayroll: boolean;
  canViewLeaves: boolean;
  canViewHolidays: boolean;
  canViewSettings: boolean;
};

export function getAttendanceNavAccess(role?: string): AttendanceNavAccess {
  const hr = role === 'admin' || role === 'attendance_hr';
  const manager = role === 'attendance_manager';
  const hasAttendanceModule = hr || manager;

  return {
    canViewCore: hasAttendanceModule,
    canViewRoster: hr,
    canViewSitesShifts: hr,
    canViewReports: hr || manager,
    canViewPayroll: hr,
    canViewLeaves: hr || manager,
    canViewHolidays: hr || manager,
    canViewSettings: hr,
  };
}

export function canAccessAttendanceNavItem(
  permission: AttendanceNavPermission,
  access: AttendanceNavAccess
): boolean {
  switch (permission) {
    case 'core':
      return access.canViewCore;
    case 'roster':
      return access.canViewRoster;
    case 'sitesShifts':
      return access.canViewSitesShifts;
    case 'reports':
      return access.canViewReports;
    case 'payroll':
      return access.canViewPayroll;
    case 'leaves':
      return access.canViewLeaves;
    case 'holidays':
      return access.canViewHolidays;
    case 'settings':
      return access.canViewSettings;
    default:
      return false;
  }
}

export function getVisibleAttendanceNavItems(role?: string): AttendanceNavItem[] {
  const access = getAttendanceNavAccess(role);
  return ATTENDANCE_NAV_ITEMS.filter((item) => canAccessAttendanceNavItem(item.permission, access));
}

/** Resolve required permission for a pathname under /dashboard/attendance */
export function getAttendancePermissionForPath(pathname: string): AttendanceNavPermission {
  if (pathname.includes('/roster')) return 'roster';
  if (pathname.includes('/sites')) return 'sitesShifts';
  if (pathname.includes('/shifts')) return 'sitesShifts';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/payroll')) return 'payroll';
  if (pathname.includes('/leaves')) return 'leaves';
  if (pathname.includes('/holidays')) return 'holidays';
  if (pathname.includes('/reports')) return 'reports';
  return 'core';
}

export function canAccessAttendancePath(pathname: string, role?: string): boolean {
  if (!pathname.startsWith('/dashboard/attendance')) return true;
  const access = getAttendanceNavAccess(role);
  const permission = getAttendancePermissionForPath(pathname);
  return canAccessAttendanceNavItem(permission, access);
}
