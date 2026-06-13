import { useMemo } from 'react';
import { useCurrentUser } from '../api/auth';
import {
  canAccessAttendanceNavItem,
  getAttendanceNavAccess,
  getVisibleAttendanceNavItems,
  type AttendanceNavPermission,
} from '../config/attendanceNav';

const HR_ROLES = new Set(['admin', 'attendance_hr']);
const MANAGER_ROLES = new Set(['admin', 'attendance_hr', 'attendance_manager']);

export function useAttendancePermissions() {
  const { data } = useCurrentUser();
  const role = data?.user?.role;
  const navAccess = useMemo(() => getAttendanceNavAccess(role), [role]);
  const sidebarNavItems = useMemo(() => getVisibleAttendanceNavItems(role), [role]);

  return {
    role,
    navAccess,
    sidebarNavItems,
    canAccessNav: (permission: AttendanceNavPermission) =>
      canAccessAttendanceNavItem(permission, navAccess),
    isAdmin: role === 'admin',
    canManageEmployees: !!role && HR_ROLES.has(role),
    canManageSitesShifts: !!role && HR_ROLES.has(role),
    canCorrectRecords: !!role && MANAGER_ROLES.has(role),
    canExport: !!role && MANAGER_ROLES.has(role),
    isManager: role === 'attendance_manager',
    isHr: role === 'attendance_hr' || role === 'admin',
  };
}
