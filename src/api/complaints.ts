import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  Complaint,
  ComplaintsListResponse,
  CreateComplaintPayload,
  UpdateComplaintPayload,
  ComplaintStatus,
  ComplaintPriority,
} from '../types/complaint';

const COMPLAINTS_BASE = '/complaints';

export interface UploadComplaintImagesResult {
  uploaded: number;
  failed: number;
  urls: string[];
  errors: string[];
}

export const complaintsQueryKey = ['complaints'];

function complaintsListKey(filters: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return [...complaintsQueryKey, 'list', filters] as const;
}

export function listComplaintsApi(params: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.priority) search.set('priority', params.priority);
  if (params.assignedTo) search.set('assignedTo', params.assignedTo);
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return get<ComplaintsListResponse>(
    query ? `${COMPLAINTS_BASE}?${query}` : COMPLAINTS_BASE
  );
}

export function listComplaintAssignableUsersApi() {
  return get<{ data: { _id: string; fullName: string; email?: string }[] }>(`${COMPLAINTS_BASE}/users`);
}

export function getComplaintApi(id: string) {
  return get<Complaint>(`${COMPLAINTS_BASE}/${id}`);
}

export function addComplaintCommentApi(id: string, text: string) {
  return post<Complaint>(`${COMPLAINTS_BASE}/${id}/comments`, { text });
}

export function createComplaintApi(payload: CreateComplaintPayload) {
  return post<Complaint>(COMPLAINTS_BASE, payload);
}

export function updateComplaintApi(id: string, payload: UpdateComplaintPayload) {
  return patch<Complaint>(`${COMPLAINTS_BASE}/${id}`, payload);
}

export function deleteComplaintApi(id: string) {
  return del<unknown>(`${COMPLAINTS_BASE}/${id}`);
}

export async function uploadComplaintImagesApi(
  id: string,
  files: File[]
): Promise<UploadComplaintImagesResult> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${COMPLAINTS_BASE.replace(/^\//, '')}/${id}/images`;
  const url = `${base}/${path}`;
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as UploadComplaintImagesResult;
}

export function useComplaintsList(params: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: complaintsListKey(params),
    queryFn: () => listComplaintsApi(params),
  });
}

export function useComplaintAssignableUsers() {
  return useQuery({
    queryKey: [...complaintsQueryKey, 'users'],
    queryFn: listComplaintAssignableUsersApi,
  });
}

export function useComplaint(id: string | null) {
  return useQuery({
    queryKey: [...complaintsQueryKey, 'detail', id],
    queryFn: () => getComplaintApi(id!),
    enabled: !!id,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createComplaintApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateComplaintPayload }) =>
      updateComplaintApi(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
      queryClient.invalidateQueries({ queryKey: [...complaintsQueryKey, 'detail', id] });
    },
  });
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComplaintApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
    },
  });
}

export function useUploadComplaintImages(complaintId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadComplaintImagesApi(complaintId!, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
      if (complaintId)
        queryClient.invalidateQueries({ queryKey: [...complaintsQueryKey, 'detail', complaintId] });
    },
  });
}

export function useAddComplaintComment(complaintId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addComplaintCommentApi(complaintId!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
      if (complaintId)
        queryClient.invalidateQueries({ queryKey: [...complaintsQueryKey, 'detail', complaintId] });
    },
  });
}
