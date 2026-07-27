import type { IconType } from 'react-icons';
import {
  FiCalendar,
  FiDollarSign,
  FiGrid,
  FiSettings,
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

/**
 * Five task-based destinations, down from ten data-based ones.
 *
 * Each entry lists the routes it absorbed in `activePaths` so those URLs keep the right
 * sidebar item highlighted while their redirects run. The removed items are not gone —
 * Quick punch and the punch log are tabs on Today, attendance counts are inline on
 * People, ID cards is a toolbar action there, and correction approvals surface in
 * Today's "Needs attention" inbox next to the records they concern.
 */
export const ATTENDANCE_NAV_ITEMS: AttendanceNavItem[] = [
  {
    path: '/dashboard/attendance',
    label: 'Today',
    end: true,
    icon: FiGrid,
    permission: 'core',
    activePaths: [
      '/dashboard/attendance',
      '/dashboard/attendance/records',
      '/dashboard/attendance/roster',
      '/dashboard/attendance/regularizations',
    ],
  },
  {
    path: '/dashboard/attendance/calendar',
    label: 'Calendar',
    end: false,
    icon: FiCalendar,
    permission: 'core',
  },
  {
    path: '/dashboard/attendance/employees',
    label: 'People',
    end: false,
    icon: FiUsers,
    permission: 'core',
    activePaths: [
      '/dashboard/attendance/employees',
      '/dashboard/attendance/summary',
      '/dashboard/attendance/id-cards',
    ],
  },
  { path: '/dashboard/attendance/time-off', label: 'Time off', end: false, icon: FiCalendar, permission: 'timeOff', activePaths: ['/dashboard/attendance/time-off', '/dashboard/attendance/leaves', '/dashboard/attendance/holidays'] },
  { path: '/dashboard/attendance/payroll', label: 'Payroll', end: false, icon: FiDollarSign, permission: 'payrollHub', activePaths: ['/dashboard/attendance/payroll', '/dashboard/attendance/reports'] },
  {
    path: '/dashboard/attendance/settings',
    label: 'Settings',
    end: false,
    icon: FiSettings,
    permission: 'settings',
    activePaths: ['/dashboard/attendance/settings', '/dashboard/attendance/kiosk-devices'],
  },
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
