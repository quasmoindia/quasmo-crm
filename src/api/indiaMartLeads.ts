import { useMutation, useQuery } from '@tanstack/react-query';
import { get } from '../utils/api';
import type { IndiaMartFetchResult, IndiaMartStatus } from '../types/indiaMartLead';

const BASE = '/indiamart-leads';
export const indiaMartQueryKey = ['indiamart-leads'];

export function fetchIndiaMartLeadsApi(params?: { start_date?: string; end_date?: string }) {
  const queryParams: Record<string, string> = {};
  if (params?.start_date) queryParams.start_date = params.start_date;
  if (params?.end_date) queryParams.end_date = params.end_date;
  return get<IndiaMartFetchResult>(BASE, { params: queryParams });
}

export function useIndiaMartStatus() {
  return useQuery({
    queryKey: [...indiaMartQueryKey, 'status'],
    queryFn: () => get<IndiaMartStatus>(`${BASE}/status`),
    staleTime: 60_000,
  });
}

/** Manual fetch only — avoids React Query auto-refetch hitting IndiaMART rate limits. */
export function useFetchIndiaMartLeads() {
  return useMutation({
    mutationFn: (params?: { start_date?: string; end_date?: string }) => fetchIndiaMartLeadsApi(params),
    retry: false,
  });
}
