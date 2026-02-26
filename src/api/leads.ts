import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  Lead,
  LeadsListResponse,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadStatus,
} from '../types/lead';

const LEADS_BASE = '/leads';

export interface BulkUploadResult {
  created: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export const leadsQueryKey = ['leads'];

function leadsListKey(params: { status?: LeadStatus; assignedTo?: string; search?: string; page?: number; limit?: number }) {
  return [...leadsQueryKey, 'list', params] as const;
}

export function listLeadsApi(params: {
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.assignedTo) search.set('assignedTo', params.assignedTo);
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return get<LeadsListResponse>(query ? `${LEADS_BASE}?${query}` : LEADS_BASE);
}

export function getLeadApi(id: string) {
  return get<Lead>(`${LEADS_BASE}/${id}`);
}

export function listAssignableUsersApi() {
  return get<{ data: { _id: string; fullName: string; email?: string }[] }>(`${LEADS_BASE}/users`);
}

export function createLeadApi(payload: CreateLeadPayload) {
  return post<Lead>(LEADS_BASE, payload);
}

export function updateLeadApi(id: string, payload: UpdateLeadPayload) {
  return patch<Lead>(`${LEADS_BASE}/${id}`, payload);
}

export function deleteLeadApi(id: string) {
  return del<unknown>(`${LEADS_BASE}/${id}`);
}

export async function bulkUploadLeadsApi(file: File): Promise<BulkUploadResult> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = LEADS_BASE.replace(/^\//, '') + '/bulk-upload';
  const url = `${base}/${path}`;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as BulkUploadResult;
}

export async function exportLeadsApi(
  format: 'csv' | 'xlsx',
  params: { status?: LeadStatus; assignedTo?: string; search?: string }
): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const search = new URLSearchParams();
  search.set('format', format);
  if (params.status) search.set('status', params.status);
  if (params.assignedTo) search.set('assignedTo', params.assignedTo);
  if (params.search?.trim()) search.set('search', params.search.trim());
  const path = LEADS_BASE.replace(/^\//, '') + '/export?' + search.toString();
  const url = `${base}/${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? 'Export failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? `leads_export.${format}`;
  return { blob, filename };
}

export function useLeadsList(params: {
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: leadsListKey(params),
    queryFn: () => listLeadsApi(params),
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: [...leadsQueryKey, id],
    queryFn: () => getLeadApi(id!),
    enabled: !!id,
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: [...leadsQueryKey, 'users'],
    queryFn: listAssignableUsersApi,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLeadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      updateLeadApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey }),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLeadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey }),
  });
}

export function useBulkUploadLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUploadLeadsApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey }),
  });
}
