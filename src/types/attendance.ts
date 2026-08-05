export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceRecordStatus = 'open' | 'complete' | 'flagged' | 'absent';
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
  lunchBreakEnabled?: boolean;
  lunchBreakStart?: string;
  lunchBreakEnd?: string;
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
  // Lunch break
  lunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  weeklyOffDays: number[];
  paidWeeklyOff: boolean;
  faceRecognitionEnabled?: boolean;
  faceMatchThreshold?: number;
  faceMarginThreshold?: number;
  faceAntiSpoofMode?: 'off' | 'record' | 'block';
  faceAntiSpoofThreshold?: number;
  faceLivenessThreshold?: number;
  /** Employer identity printed as the payslip letterhead. */
  employerName?: string;
  employerAddressLine1?: string;
  employerAddressLine2?: string;
  employerPfCode?: string;
  employerEsiCode?: string;
  employerLogoUrl?: string;
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
  /** Employee is assigned to a different site than this kiosk. Warned, not blocked. */
  siteMismatch?: boolean;
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

export interface KioskTodayStatus {
  open: boolean;
  workedMinutes: number;
  firstInAt?: string | null;
  lastOutAt?: string | null;
}

export interface KioskDirectoryEntry extends PunchDirectoryEntry {
  today: KioskTodayStatus;
}

export type KioskDeviceMode = 'simple' | 'face';

export interface KioskDirectory {
  workDate: string;
  siteFiltered: boolean;
  /** Which kiosk experience this paired device runs. */
  deviceMode?: KioskDeviceMode;
  data: KioskDirectoryEntry[];
}

export interface KioskDevice {
  _id: string;
  name: string;
  mode?: KioskDeviceMode;
  workSiteId: WorkSite | string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RegularizationStatus = 'pending' | 'approved' | 'rejected';

export interface RegularizationRequest {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode: string; department?: string; referencePhotoUrl?: string } | string;
  workDate: string;
  requestedInAt?: string;
  requestedOutAt?: string;
  reason: string;
  status: RegularizationStatus;
  reviewedBy?: { _id: string; fullName: string; email: string } | string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface KioskDeviceCreateResult {
  device: KioskDevice;
  rawToken: string;
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
  totalDays?: number;
  daysPresent: number;
  fullDays?: number;
  halfDays?: number;
  lateDays?: number;
  absentDays?: number;
  incompleteDays?: number;
  paidLeaveDays: number;
  unpaidLeaveDays?: number;
  weeklyOffDays: number;
  holidayDays: number;
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

/**
 * How a single day is classified. Mirrors DayType in the backend's
 * attendanceSummaryService — keep the two in step. Adding a case here without
 * handling it in DAY_TYPE_META is a compile error, which is the point.
 */
export type DayType =
  | 'worked'
  | 'worked_open'
  | 'half_day'
  | 'late'
  | 'paid_holiday'
  | 'unpaid_holiday'
  | 'paid_leave'
  | 'unpaid_leave'
  | 'week_off'
  | 'week_off_unpaid'
  | 'absent';

export interface AttendanceCounts {
  presentDays: number;
  incompleteDays: number;
  absentDays: number;
  weekOffDays: number;
  holidayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  totalDays: number;
  workedMinutes: number;
}

export interface AttendanceSummaryRow extends AttendanceCounts {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
}

export interface AttendanceSummaryResponse {
  dateFrom: string;
  dateTo: string;
  rows: AttendanceSummaryRow[];
  totals: AttendanceCounts;
}

export interface AttendancePunchDetail {
  at: string;
  /** Present when a kiosk identified this person by face rather than by tap. */
  faceMatch?: { similarity: number; margin: number; real?: number; live?: number };
  siteMismatch?: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfieUrl: string;
  outsideGeofence: boolean;
  deviceType: 'phone' | 'kiosk' | 'crm';
}

export interface AttendanceSessionDetail {
  in: AttendancePunchDetail;
  out: AttendancePunchDetail | null;
  durationMinutes: number | null;
}

export interface AttendanceDayDetail {
  date: string;
  day: string;
  type: DayType;
  workedMinutes: number;
  note?: string;
  recordId: string | null;
  recordStatus: string | null;
  lateMinutes: number;
  workSite: string | null;
  sessions: AttendanceSessionDetail[];
}

export interface EmployeeAttendanceSummary {
  employee: { _id: string; fullName: string; employeeCode: string; department: string };
  dateFrom: string;
  dateTo: string;
  counts: AttendanceCounts;
  days: AttendanceDayDetail[];
}

export interface FaceGalleryEntry {
  employeeId: string;
  fullName: string;
  employeeCode: string;
  department: string;
  referencePhotoUrl: string;
  descriptors: number[][];
}

export interface FaceGalleryResponse {
  embeddingLength: number;
  enrolled: number;
  totalInScope: number;
  entries: FaceGalleryEntry[];
}

export interface FaceEnrollmentRow {
  employeeId: string;
  fullName: string;
  employeeCode: string;
  department: string;
  referencePhotoUrl: string;
  sampleCount: number;
  sources: ('photo' | 'live')[];
}

export interface FaceEnrollmentResponse {
  maxSamples: number;
  data: FaceEnrollmentRow[];
}

/** One calendar cell: company-wide totals for a single date. */
export interface CalendarDayAggregate {
  date: string;
  day: string;
  present: number;
  incomplete: number;
  absent: number;
  weekOff: number;
  holiday: number;
  leave: number;
  late: number;
  flagged: number;
  expected: number;
  attendanceRate: number | null;
  holidayName: string | null;
}

export interface AttendanceCalendarResponse {
  dateFrom: string;
  dateTo: string;
  employeeCount: number;
  days: CalendarDayAggregate[];
}

export interface AttendanceDayEmployee {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  type: DayType;
  note: string | null;
  workedMinutes: number;
  lateMinutes: number;
  recordStatus: string | null;
  firstIn: string | null;
  lastOut: string | null;
  outsideGeofence: boolean;
}

export interface AttendanceDayResponse {
  date: string;
  counts: AttendanceCounts & { lateCount: number; flaggedCount: number };
  employees: AttendanceDayEmployee[];
}

export interface PayrollDayDetail {
  date: string;
  day: string;
  type: DayType;
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
    incompleteDays?: number;
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
