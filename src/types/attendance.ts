export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceRecordStatus = 'open' | 'complete' | 'flagged';
export type PunchDeviceType = 'phone' | 'kiosk' | 'crm';

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  isDefault: boolean;
  crossesMidnight?: boolean;
  isActive: boolean;
}

export interface WorkSite {
  _id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export type PayType = 'hourly' | 'daily' | 'monthly';
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'other';

export interface Employee {
  _id: string;
  employeeCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  department?: string;
  designation?: string;
  shiftId?: Shift | string;
  defaultWorkSiteId?: WorkSite | string;
  status: EmployeeStatus;
  userId?: { _id: string; fullName: string; email: string } | string;
  referencePhotoUrl?: string;
  payType?: PayType;
  payRate?: number;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  maritalStatus?: MaritalStatus;
  address?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  uanNumber?: string;
  esicNumber?: string;
  aadhaarFrontDocUrl?: string;
  aadhaarBackDocUrl?: string;
  panDocUrl?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PunchEvent {
  at: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfieUrl: string;
  outsideGeofence: boolean;
  deviceType: PunchDeviceType;
}

export interface AttendanceSession {
  in: PunchEvent;
  out?: PunchEvent;
}

export interface AttendanceRecord {
  _id: string;
  employeeId: Employee | string;
  workDate: string;
  shiftId?: Shift | string;
  workSiteId?: WorkSite | string;
  sessions?: AttendanceSession[];
  punchIn?: PunchEvent;
  punchOut?: PunchEvent;
  status: AttendanceRecordStatus;
  lateMinutes: number;
  workedMinutes: number;
  createdAt: string;
}

export interface AttendanceCorrection {
  _id: string;
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  correctedBy: { _id: string; fullName: string; email: string };
  correctedAt: string;
}

export interface RosterEntryToday {
  recordId?: string;
  open: boolean;
  sessionsCount: number;
  workedMinutes: number;
  firstInAt?: string | null;
  lastOutAt?: string | null;
  status?: AttendanceRecordStatus;
  outsideGeofence: boolean;
}

export interface RosterEntry {
  _id: string;
  fullName: string;
  employeeCode: string;
  department?: string | null;
  referencePhotoUrl?: string | null;
  shift?: PunchShiftSummary | null;
  today: RosterEntryToday;
}

export interface RosterToday {
  workDate: string;
  data: RosterEntry[];
}

export interface SelfPunchContext {
  linked: boolean;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
    referencePhotoUrl?: string;
  };
  workDate?: string;
  record?: AttendanceRecord | null;
}

export interface AttendanceSettings {
  _id: string;
  maxGpsAccuracyMeters: number;
  otpExpiryMinutes: number;
  allowOutsideGeofence: boolean;
  standardHoursPerDay: number;
  overtimeEnabled: boolean;
  overtimeMultiplier: number;
  pfEnabled: boolean;
  pfEmployeePercent: number;
  pfWageCeiling: number;
  esiEnabled: boolean;
  esiEmployeePercent: number;
  esiGrossCeiling: number;
  ptEnabled: boolean;
  ptAmount: number;
  weeklyOffDays: number[];
  paidWeeklyOff: boolean;
}

export interface AttendanceDashboardHoliday {
  _id: string;
  name: string;
  paid: boolean;
  department?: string | null;
  workSiteId?: string | null;
}

export interface AttendanceDashboard {
  workDate: string;
  stats: {
    totalActive: number;
    present: number;
    absent: number;
    late: number;
    flagged: number;
    openSessions: number;
    onHoliday?: number;
    holidaysToday?: number;
  };
  holidaysToday?: AttendanceDashboardHoliday[];
  records: AttendanceRecord[];
}

export interface GeofencePreview {
  insideGeofence: boolean;
  distanceMeters: number;
  radiusMeters: number;
  accuracyMeters: number;
  warning?: string;
  workSiteId?: string;
  workSiteName?: string;
  allowOutsideGeofence?: boolean;
  maxGpsAccuracyMeters?: number;
}

export interface PunchResult {
  record: AttendanceRecord;
  preview: GeofencePreview;
}

export interface PunchShiftSummary {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  isDefault?: boolean;
}

export interface AttendancePunchContext {
  maxGpsAccuracyMeters: number;
  allowOutsideGeofence: boolean;
  otpExpiryMinutes: number;
  workSites: WorkSite[];
  shifts?: PunchShiftSummary[];
}

export interface PunchDirectoryEntry {
  _id: string;
  fullName: string;
  employeeCode: string;
  department?: string | null;
  referencePhotoUrl?: string | null;
  shift?: PunchShiftSummary | null;
}

export interface PunchDirectory {
  data: PunchDirectoryEntry[];
}

export interface AttendanceSettingsWithSites extends AttendanceSettings {
  workSites?: WorkSite[];
}

export interface CreateEmployeePayload {
  fullName: string;
  phone?: string;
  email?: string;
  department?: string;
  designation?: string;
  shiftId?: string;
  defaultWorkSiteId?: string;
  status?: EmployeeStatus;
  userId?: string;
  referencePhotoUrl?: string;
  payType?: PayType;
  payRate?: number;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  maritalStatus?: MaritalStatus;
  address?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  uanNumber?: string;
  esicNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
}

export interface LinkableUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  linkedEmployee?: { id: string; fullName: string; employeeCode: string } | null;
}

export interface PayrollRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  payType: PayType;
  payRate: number;
  daysPresent: number;
  totalMinutes: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularAmount: number;
  overtimeAmount: number;
  paidLeaveDays: number;
  paidLeaveAmount: number;
  weeklyOffDays: number;
  weeklyOffAmount: number;
  holidayDays: number;
  holidayAmount: number;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  bonus: number;
  advance: number;
  otherDeduction: number;
  totalDeductions: number;
  netPay: number;
  amount: number;
}

export interface PayrollReport {
  dateFrom: string;
  dateTo: string;
  payComponent?: PayComponent;
  rows: PayrollRow[];
  totals: {
    employees: number;
    totalMinutes: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    regularAmount: number;
    overtimeAmount: number;
    paidLeaveAmount: number;
    weeklyOffAmount: number;
    holidayAmount: number;
    gross: number;
    pf: number;
    esi: number;
    pt: number;
    bonus: number;
    advance: number;
    otherDeduction: number;
    totalDeductions: number;
    netPay: number;
    totalAmount: number;
  };
  policy: {
    standardHoursPerDay: number;
    overtimeMultiplier: number;
    overtimeEnabled: boolean;
  };
}

export type AdjustmentType = 'bonus' | 'advance' | 'deduction';
export type PayComponent = 'all' | 'regular' | 'overtime';
export type AdjustmentAppliesTo = 'all' | 'regular' | 'overtime';

export interface PayrollAdjustment {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode: string } | string;
  month: string;
  type: AdjustmentType;
  amount: number;
  appliesTo?: AdjustmentAppliesTo;
  note?: string;
  createdAt: string;
}

export interface PayrollDayDetail {
  date: string;
  day: string;
  type: 'worked' | 'paid_holiday' | 'unpaid_holiday' | 'paid_leave' | 'unpaid_leave' | 'week_off' | 'week_off_unpaid' | 'absent';
  workedMinutes: number;
  regularMinutes: number;
  otMinutes: number;
  hourlyRate: number;
  amount: number;
  regularPart?: number;
  overtimePart?: number;
  note?: string;
}

export interface PayrollEmployeeDetail {
  employee: { _id: string; fullName: string; employeeCode: string; department?: string; payType: PayType; payRate: number };
  dateFrom: string;
  dateTo: string;
  payComponent?: PayComponent;
  policy: {
    standardHoursPerDay: number;
    overtimeEnabled: boolean;
    overtimeMultiplier: number;
    pfEnabled: boolean;
    pfEmployeePercent: number;
    pfWageCeiling: number;
    esiEnabled: boolean;
    esiEmployeePercent: number;
    esiGrossCeiling: number;
    ptEnabled: boolean;
    daysInFromMonth: number;
  };
  days: PayrollDayDetail[];
  summary: {
    workedDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    weekOffDays: number;
    holidayDays: number;
    absentDays: number;
    regularMinutes: number;
    overtimeMinutes: number;
    regularAmount: number;
    overtimeAmount: number;
    paidLeaveAmount: number;
    weeklyOffAmount: number;
    holidayAmount: number;
    basicWages: number;
    gross: number;
    grossFull?: number;
    pf: number;
    esi: number;
    pt: number;
    bonus: number;
    advance: number;
    otherDeduction: number;
    totalDeductions: number;
    netPay: number;
  };
  adjustments: { _id: string; type: AdjustmentType; amount: number; note?: string; month: string; appliesTo?: AdjustmentAppliesTo }[];
}

export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';
export type LeaveStatus = 'approved' | 'cancelled';

export interface Leave {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode: string; department?: string } | string;
  fromDate: string;
  toDate: string;
  type: LeaveType;
  paid: boolean;
  status: LeaveStatus;
  note?: string;
  createdAt: string;
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  paid: boolean;
  workSiteId?: { _id: string; name: string; code?: string } | string | null;
  department?: string | null;
  note?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
