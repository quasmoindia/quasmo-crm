import { canAccessModule } from './roles';

/** Roles with HR attendance admin screens (overview, roster, payroll admin, etc.). */
export const ATTENDANCE_HR_ROLES = new Set(['admin', 'attendance_hr', 'attendance_manager']);

export function isAttendanceHrRole(role?: string): boolean {
  return !!role && ATTENDANCE_HR_ROLES.has(role);
}

/** HR/manager attendance admin — requires the attendance module plus an HR role. */
export function hasAttendanceAdminAccess(role?: string, roleModules?: string[]): boolean {
  return isAttendanceHrRole(role) && canAccessModule(role, 'attendance', roleModules);
}

/** Default employee self-punch — any role except HR admin roles. Employee link still required to punch. */
export function canUseDefaultSelfPunch(role?: string): boolean {
  return !!role && !isAttendanceHrRole(role);
}

export const SELF_PUNCH_PATH = '/dashboard/attendance/my-punch';

export function isSelfPunchPath(pathname: string): boolean {
  return pathname === SELF_PUNCH_PATH || pathname.startsWith(`${SELF_PUNCH_PATH}/`);
}

/** Sidebar / tab title — HR branding only for admin and attendance HR roles. */
export function getAttendanceModuleTitle(role?: string): string {
  return role === 'admin' || role === 'attendance_hr' ? 'HR & Attendance' : 'Attendance';
}
