import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import type {
  Complaint,
  ComplaintsListResponse,
  CreateComplaintPayload,
  UpdateComplaintPayload,
  ComplaintStatus,
  ComplaintPriority,
} from '../types/complaint';

const COMPLAINTS_BASE = '/complaints';

export const complaintsQueryKey = ['complaints'];

function complaintsListKey(filters: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
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
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.priority) search.set('priority', params.priority);
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

export function getComplaintApi(id: string) {
  return get<Complaint>(`${COMPLAINTS_BASE}/${id}`);
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

export function useComplaintsList(params: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
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
