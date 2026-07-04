import type { IconType } from 'react-icons';
import {
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiGrid,
  FiSettings,
  FiTablet,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { canUseDefaultSelfPunch } from './attendanceAccess';

/** Permission tier for each attendance sidebar tab */
export type AttendanceNavPermission =
  | 'core'
  | 'roster'
  | 'sitesShifts'
  | 'kioskDevices'
  | 'regularizations'
  | 'idCards'
  | 'timeOff'
  | 'payrollHub'
  | 'settings'
  | 'selfPunch';

export interface AttendanceNavItem {
  path: string;
  label: string;
  end: boolean;
  icon: IconType;
  permission: AttendanceNavPermission;
  /** Extra paths that should highlight this sidebar item (for merged sections). */
  activePaths?: string[];
}

export const ATTENDANCE_NAV_ITEMS: AttendanceNavItem[] = [
  {
    path: '/dashboard/attendance',
    label: 'Overview',
    end: true,
    icon: FiGrid,
    permission: 'core',
    activePaths: ['/dashboard/attendance', '/dashboard/attendance/records'],
  },
  { path: '/dashboard/attendance/roster', label: 'Quick punch', end: false, icon: FiUserCheck, permission: 'roster' },
  { path: '/dashboard/attendance/employees', label: 'Employees', end: false, icon: FiUsers, permission: 'core' },
  { path: '/dashboard/attendance/kiosk-devices', label: 'Kiosk devices', end: false, icon: FiTablet, permission: 'kioskDevices' },
  { path: '/dashboard/attendance/regularizations', label: 'Corrections', end: false, icon: FiEdit3, permission: 'regularizations' },
  { path: '/dashboard/attendance/id-cards', label: 'ID cards', end: false, icon: FiCreditCard, permission: 'idCards' },
  { path: '/dashboard/attendance/time-off', label: 'Time off', end: false, icon: FiCalendar, permission: 'timeOff', activePaths: ['/dashboard/attendance/time-off', '/dashboard/attendance/leaves', '/dashboard/attendance/holidays'] },
  { path: '/dashboard/attendance/payroll', label: 'Payroll', end: false, icon: FiDollarSign, permission: 'payrollHub', activePaths: ['/dashboard/attendance/payroll', '/dashboard/attendance/reports'] },
  { path: '/dashboard/attendance/settings', label: 'Settings', end: false, icon: FiSettings, permission: 'settings' },
];

/** Employee self-punch — shown for non-HR roles (any CRM role except admin / HR / manager). */
export const ATTENDANCE_SELF_PUNCH_NAV: AttendanceNavItem = {
  path: '/dashboard/attendance/my-punch',
  label: 'Punch',
  end: true,
  icon: FiUserCheck,
  permission: 'selfPunch',
};

export type AttendanceNavAccess = {
  canViewCore: boolean;
  canViewRoster: boolean;
  canViewSitesShifts: boolean;
  canViewKioskDevices: boolean;
  canViewRegularizations: boolean;
  canViewIdCards: boolean;
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
    canViewKioskDevices: hr,
    canViewRegularizations: hr || manager,
    canViewIdCards: hr,
    canViewReports: hr || manager,
    canViewPayroll: hr,
    canViewLeaves: hr || manager,
    canViewHolidays: hr || manager,
    canViewSettings: hr,
  };
}

export function canAccessAttendanceNavItem(
  permission: AttendanceNavPermission,
  access: AttendanceNavAccess,
  role?: string
): boolean {
  switch (permission) {
    case 'core':
      return access.canViewCore;
    case 'roster':
      return access.canViewRoster;
    case 'sitesShifts':
      return access.canViewSitesShifts;
    case 'kioskDevices':
      return access.canViewKioskDevices;
    case 'regularizations':
      return access.canViewRegularizations;
    case 'idCards':
      return access.canViewIdCards;
    case 'timeOff':
      return access.canViewLeaves || access.canViewHolidays;
    case 'payrollHub':
      return access.canViewPayroll || access.canViewReports;
    case 'settings':
      return access.canViewSettings;
    case 'selfPunch':
      return canUseDefaultSelfPunch(role);
    default:
      return false;
  }
}

export function getVisibleAttendanceNavItems(role?: string): AttendanceNavItem[] {
  const access = getAttendanceNavAccess(role);
  const items = ATTENDANCE_NAV_ITEMS.filter((item) => canAccessAttendanceNavItem(item.permission, access, role));
  if (canUseDefaultSelfPunch(role)) {
    items.unshift(ATTENDANCE_SELF_PUNCH_NAV);
  }
  return items;
}

/** Resolve required permission for a pathname under /dashboard/attendance */
export function getAttendancePermissionForPath(pathname: string): AttendanceNavPermission {
  if (pathname.includes('/my-punch')) return 'selfPunch';
  if (pathname.includes('/roster')) return 'roster';
  if (pathname.includes('/sites')) return 'sitesShifts';
  if (pathname.includes('/shifts')) return 'sitesShifts';
  if (pathname.includes('/kiosk-devices')) return 'kioskDevices';
  if (pathname.includes('/regularizations')) return 'regularizations';
  if (pathname.includes('/id-cards')) return 'idCards';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/time-off') || pathname.includes('/leaves') || pathname.includes('/holidays')) {
    return 'timeOff';
  }
  if (pathname.includes('/payroll') || pathname.includes('/reports')) return 'payrollHub';
  if (pathname.includes('/records')) return 'core';
  return 'core';
}

export function canAccessAttendancePath(pathname: string, role?: string): boolean {
  if (!pathname.startsWith('/dashboard/attendance')) return true;
  const permission = getAttendancePermissionForPath(pathname);
  if (permission === 'selfPunch') return canUseDefaultSelfPunch(role);
  const access = getAttendanceNavAccess(role);
  return canAccessAttendanceNavItem(permission, access, role);
}
