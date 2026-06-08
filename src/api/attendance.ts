import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  AdjustmentType,
  AttendanceDashboard,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceSettingsWithSites,
  AttendancePunchContext,
  PunchDirectory,
  CreateEmployeePayload,
  Employee,
  GeofencePreview,
  Holiday,
  Leave,
  LeaveType,
  LinkableUser,
  Pagination,
  PayrollAdjustment,
  PayrollEmployeeDetail,
  PayrollReport,
  RosterToday,
  Shift,
  WorkSite,
} from '../types/attendance';

const BASE = '/attendance';
const PUNCH_TOKEN_KEY = 'attendancePunchToken';

export function getPunchToken(): string | null {
  return localStorage.getItem(PUNCH_TOKEN_KEY);
}

export function setPunchToken(token: string) {
  localStorage.setItem(PUNCH_TOKEN_KEY, token);
}

export function clearPunchToken() {
  localStorage.removeItem(PUNCH_TOKEN_KEY);
}

async function punchFetch<T>(
  path: string,
  options: { method?: string; body?: FormData | string; headers?: Record<string, string> } = {}
): Promise<T> {
  const token = getPunchToken();
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/${BASE.replace(/^\//, '')}/${path.replace(/^\//, '')}`;
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Request failed');
  return data as T;
}

/** Authenticated multipart POST using the CRM token (for admin roster punch / employee photo). */
async function crmMultipart<T>(path: string, form: FormData): Promise<T> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/${BASE.replace(/^\//, '')}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Request failed');
  return data as T;
}

// ─── CRM hooks ───────────────────────────────────────────────────────────────

export function useAttendanceDashboard(enabled = true) {
  return useQuery({
    queryKey: ['attendance', 'dashboard'],
    queryFn: () => get<AttendanceDashboard>(`${BASE}/dashboard/today`),
    enabled,
  });
}

export function useEmployeesList(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.status) queryParams.status = params.status;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  return useQuery({
    queryKey: ['attendance', 'employees', params],
    queryFn: () => get<{ data: Employee[]; pagination: Pagination }>(`${BASE}/employees`, { params: queryParams }),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'employee', id],
    queryFn: () => get<Employee>(`${BASE}/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => post<Employee>(`${BASE}/employees`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateEmployeePayload> }) =>
      patch<Employee>(`${BASE}/employees/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'employees'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'employee'] });
    },
  });
}

export function useImportEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<Record<string, string>>) =>
      post<{ created: number; errors: string[] }>(`${BASE}/employees/import`, { rows }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'employees'] }),
  });
}

export function useSitesList() {
  return useQuery({
    queryKey: ['attendance', 'sites'],
    queryFn: () => get<{ data: WorkSite[] }>(`${BASE}/sites`),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<WorkSite>) => post<WorkSite>(`${BASE}/sites`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'sites'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'settings'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'punch-context'] });
    },
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WorkSite> }) =>
      patch<WorkSite>(`${BASE}/sites/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'sites'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'settings'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'punch-context'] });
    },
  });
}

export function useShiftsList() {
  return useQuery({
    queryKey: ['attendance', 'shifts'],
    queryFn: () => get<{ data: Shift[] }>(`${BASE}/shifts`),
  });
}

export function useLinkableUsers() {
  return useQuery({
    queryKey: ['attendance', 'linkable-users'],
    queryFn: () => get<{ data: LinkableUser[] }>(`${BASE}/linkable-users`),
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Shift>) => post<Shift>(`${BASE}/shifts`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'shifts'] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Shift> }) =>
      patch<Shift>(`${BASE}/shifts/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'shifts'] }),
  });
}

export function useRecordsList(params?: {
  workDate?: string;
  employeeId?: string;
  department?: string;
  status?: string;
  outsideGeofence?: boolean;
  page?: number;
  limit?: number;
}) {
  const queryParams: Record<string, string> = {};
  if (params?.workDate) queryParams.workDate = params.workDate;
  if (params?.employeeId) queryParams.employeeId = params.employeeId;
  if (params?.department) queryParams.department = params.department;
  if (params?.status) queryParams.status = params.status;
  if (params?.outsideGeofence) queryParams.outsideGeofence = 'true';
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  return useQuery({
    queryKey: ['attendance', 'records', params],
    queryFn: () => get<{ data: AttendanceRecord[]; pagination: Pagination }>(`${BASE}/records`, { params: queryParams }),
  });
}

export function useRecord(id: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'record', id],
    queryFn: () =>
      get<{ record: AttendanceRecord; corrections: unknown[] }>(`${BASE}/records/${id}`),
    enabled: !!id,
  });
}

export function useCorrectRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field, newValue, reason }: { id: string; field: string; newValue: unknown; reason: string }) =>
      patch<AttendanceRecord>(`${BASE}/records/${id}/correct`, { field, newValue, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'records'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'record'] });
    },
  });
}

export function useCorrectSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sessionIndex,
      inAt,
      outAt,
      reason,
    }: {
      id: string;
      sessionIndex: number;
      inAt?: string;
      outAt?: string;
      reason: string;
    }) => patch<AttendanceRecord>(`${BASE}/records/${id}/session`, { sessionIndex, inAt, outAt, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'records'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'record'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'roster'] });
    },
  });
}

export function usePayrollReport(params?: { dateFrom?: string; dateTo?: string; department?: string }) {
  const queryParams: Record<string, string> = {};
  if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params?.dateTo) queryParams.dateTo = params.dateTo;
  if (params?.department) queryParams.department = params.department;
  return useQuery({
    queryKey: ['attendance', 'payroll', params],
    queryFn: () => get<PayrollReport>(`${BASE}/reports/payroll`, { params: queryParams }),
  });
}

export function usePayrollEmployeeDetail(
  employeeId: string | null,
  params: { dateFrom: string; dateTo: string }
) {
  return useQuery({
    queryKey: ['attendance', 'payroll-detail', employeeId, params],
    queryFn: () =>
      get<PayrollEmployeeDetail>(`${BASE}/reports/payroll/employee/${employeeId}`, {
        params: { dateFrom: params.dateFrom, dateTo: params.dateTo },
      }),
    enabled: !!employeeId,
  });
}

export function usePayrollAdjustments(params: { month?: string; employeeId?: string }, enabled = true) {
  const queryParams: Record<string, string> = {};
  if (params.month) queryParams.month = params.month;
  if (params.employeeId) queryParams.employeeId = params.employeeId;
  return useQuery({
    queryKey: ['attendance', 'adjustments', params],
    queryFn: () => get<{ data: PayrollAdjustment[] }>(`${BASE}/payroll/adjustments`, { params: queryParams }),
    enabled,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { employeeId: string; month: string; type: AdjustmentType; amount: number; note?: string }) =>
      post<PayrollAdjustment>(`${BASE}/payroll/adjustments`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'adjustments'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export function useDeleteAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${BASE}/payroll/adjustments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'adjustments'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export function useLeaves(params: { from?: string; to?: string; employeeId?: string }) {
  const queryParams: Record<string, string> = {};
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  if (params.employeeId) queryParams.employeeId = params.employeeId;
  return useQuery({
    queryKey: ['attendance', 'leaves', params],
    queryFn: () => get<{ data: Leave[] }>(`${BASE}/leaves`, { params: queryParams }),
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      employeeId: string;
      fromDate: string;
      toDate?: string;
      type: LeaveType;
      paid?: boolean;
      note?: string;
    }) => post<Leave>(`${BASE}/leaves`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leaves'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${BASE}/leaves/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leaves'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export function useHolidays(params: { year?: string; month?: string; from?: string; to?: string }) {
  const queryParams: Record<string, string> = {};
  if (params.year) queryParams.year = params.year;
  if (params.month) queryParams.month = params.month;
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  return useQuery({
    queryKey: ['attendance', 'holidays', params],
    queryFn: () => get<{ data: Holiday[] }>(`${BASE}/holidays`, { params: queryParams }),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      date: string;
      name: string;
      paid?: boolean;
      workSiteId?: string | null;
      department?: string | null;
      note?: string;
    }) => post<Holiday>(`${BASE}/holidays`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${BASE}/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'payroll'] });
    },
  });
}

export async function downloadPayrollExport(params: { dateFrom?: string; dateTo?: string; department?: string }) {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.department) qs.set('department', params.department);
  const q = qs.toString();
  const url = `${base}/${BASE.replace(/^\//, '')}/reports/payroll/export${q ? `?${q}` : ''}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Payroll export failed');
  return res.blob();
}

export function useReportSummary(params?: { dateFrom?: string; dateTo?: string; department?: string }) {
  const queryParams: Record<string, string> = {};
  if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params?.dateTo) queryParams.dateTo = params.dateTo;
  if (params?.department) queryParams.department = params.department;
  return useQuery({
    queryKey: ['attendance', 'reports', params],
    queryFn: () =>
      get<{
        dateFrom: string;
        dateTo: string;
        summary: Record<string, number>;
        records: AttendanceRecord[];
        leaves: Leave[];
      }>(`${BASE}/reports/summary`, { params: queryParams }),
  });
}

// ─── Admin roster quick-punch ────────────────────────────────────────────────

export function useRosterToday(params?: { search?: string }) {
  const queryParams: Record<string, string> = {};
  if (params?.search) queryParams.search = params.search;
  return useQuery({
    queryKey: ['attendance', 'roster', params],
    queryFn: () => get<RosterToday>(`${BASE}/roster/today`, { params: queryParams }),
    refetchInterval: 30_000,
  });
}

export async function crmPunchPreviewApi(payload: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}) {
  return post<GeofencePreview>(`${BASE}/punch/crm/preview`, payload);
}

export async function crmPunchInApi(payload: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfie: Blob;
  clientTimestamp?: string;
}) {
  const form = buildPunchForm(payload);
  return crmMultipart<{ record: AttendanceRecord; preview: GeofencePreview }>('punch/crm/in', form);
}

export async function crmPunchOutApi(payload: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfie: Blob;
  clientTimestamp?: string;
}) {
  const form = buildPunchForm(payload);
  return crmMultipart<{ record: AttendanceRecord; preview: GeofencePreview }>('punch/crm/out', form);
}

function buildPunchForm(payload: {
  employeeId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfie: Blob;
  clientTimestamp?: string;
}) {
  const form = new FormData();
  form.append('latitude', String(payload.latitude));
  form.append('longitude', String(payload.longitude));
  form.append('accuracy', String(payload.accuracy));
  form.append('selfie', payload.selfie, 'selfie.jpg');
  if (payload.employeeId) form.append('employeeId', payload.employeeId);
  form.append('clientTimestamp', payload.clientTimestamp ?? new Date().toISOString());
  return form;
}

export function useUploadEmployeePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, photo }: { id: string; photo: Blob }) => {
      const form = new FormData();
      form.append('photo', photo, 'photo.jpg');
      return crmMultipart<{ referencePhotoUrl: string; employee: Employee }>(`employees/${id}/photo`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'employees'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'employee'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'roster'] });
    },
  });
}

export function useUploadEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      type,
      file,
    }: {
      id: string;
      type: 'aadhaar_front' | 'aadhaar_back' | 'pan';
      file: Blob & { name?: string };
    }) => {
      const form = new FormData();
      form.append('type', type);
      form.append('document', file, (file as File).name || `${type}-document`);
      return crmMultipart<{ type: string; url: string; employee: Employee }>(`employees/${id}/document`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'employees'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'employee'] });
    },
  });
}

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ['attendance', 'settings'],
    queryFn: () => get<AttendanceSettingsWithSites>(`${BASE}/settings`),
  });
}

export function usePunchContext(enabled = true) {
  return useQuery({
    queryKey: ['attendance', 'punch-context'],
    queryFn: () => get<AttendancePunchContext>(`${BASE}/punch/context`),
    enabled,
    staleTime: 60_000,
  });
}

export async function fetchPunchContextApi() {
  return get<AttendancePunchContext>(`${BASE}/punch/context`);
}

export function usePunchDirectory(
  params?: { search?: string; shiftId?: string },
  enabled = true
) {
  const queryParams: Record<string, string> = {};
  if (params?.search?.trim()) queryParams.search = params.search.trim();
  if (params?.shiftId) queryParams.shiftId = params.shiftId;
  return useQuery({
    queryKey: ['attendance', 'punch-directory', params ?? {}],
    queryFn: () => get<PunchDirectory>(`${BASE}/punch/directory`, { params: queryParams }),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateAttendanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AttendanceSettings>) => patch<AttendanceSettings>(`${BASE}/settings`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'settings'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'punch-context'] });
    },
  });
}

// ─── Punch API (public / employee token) ─────────────────────────────────────

export async function requestEmployeeOtpApi(payload: { employeeCode?: string; phone?: string }) {
  return post<{ message: string; employeeId: string; employeeCode: string }>(`${BASE}/auth/request-otp`, payload);
}

export async function verifyEmployeeOtpApi(payload: { employeeCode?: string; phone?: string; otp: string }) {
  return post<{ token: string; employee: { id: string; fullName: string; employeeCode: string } }>(
    `${BASE}/auth/verify-otp`,
    payload
  );
}

export async function punchPreviewApi(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  employeeId?: string;
}) {
  return punchFetch<GeofencePreview>('punch/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function punchInApi(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  selfie: Blob;
  employeeId?: string;
  clientTimestamp?: string;
}) {
  const form = new FormData();
  form.append('latitude', String(payload.latitude));
  form.append('longitude', String(payload.longitude));
  form.append('accuracy', String(payload.accuracy));
  form.append('selfie', payload.selfie, 'selfie.jpg');
  if (payload.employeeId) form.append('employeeId', payload.employeeId);
  if (payload.clientTimestamp) form.append('clientTimestamp', payload.clientTimestamp);
  return punchFetch<{ record: AttendanceRecord; preview: GeofencePreview }>('punch/in', { method: 'POST', body: form });
}

export async function punchOutApi(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  selfie: Blob;
  employeeId?: string;
  clientTimestamp?: string;
}) {
  const form = new FormData();
  form.append('latitude', String(payload.latitude));
  form.append('longitude', String(payload.longitude));
  form.append('accuracy', String(payload.accuracy));
  form.append('selfie', payload.selfie, 'selfie.jpg');
  if (payload.employeeId) form.append('employeeId', payload.employeeId);
  if (payload.clientTimestamp) form.append('clientTimestamp', payload.clientTimestamp);
  return punchFetch<{ record: AttendanceRecord; preview: GeofencePreview }>('punch/out', { method: 'POST', body: form });
}

export async function myTodayApi() {
  return punchFetch<{ workDate: string; record: AttendanceRecord | null }>('punch/my-today');
}

export function exportReportUrl(params: { dateFrom?: string; dateTo?: string }) {
  const base = API_BASE_URL.replace(/\/$/, '');
  const token = localStorage.getItem('token');
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  const q = qs.toString();
  return `${base}/${BASE.replace(/^\//, '')}/reports/export${q ? `?${q}` : ''}${token ? '' : ''}`;
}

export async function downloadReportExport(params: { dateFrom?: string; dateTo?: string }) {
  const token = localStorage.getItem('token');
  const url = exportReportUrl(params);
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
