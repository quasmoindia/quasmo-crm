import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import type { Tender, CreateTenderPayload, TendersListResponse } from '../types/tender';

const TENDERS_BASE = '/tenders';
export const tendersQueryKey = ['tenders'];

export function listTendersApi(params?: { search?: string; department?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.department) queryParams.department = params.department;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  return get<TendersListResponse>(TENDERS_BASE, { params: queryParams });
}

export function useTendersList(params?: { search?: string; department?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...tendersQueryKey, params],
    queryFn: () => listTendersApi(params),
  });
}

export function useCreateTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenderPayload) => post<Tender>(TENDERS_BASE, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tendersQueryKey }),
  });
}

export function useUpdateTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateTenderPayload> }) =>
      patch<Tender>(`${TENDERS_BASE}/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tendersQueryKey }),
  });
}

export function useDeleteTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${TENDERS_BASE}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tendersQueryKey }),
  });
}
