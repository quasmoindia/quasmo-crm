import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../utils/api';
import { leadsQueryKey } from './leads';
import type {
  IndiaMartCheckDuplicatesResult,
  IndiaMartFetchResult,
  IndiaMartImportResult,
  IndiaMartLead,
  IndiaMartStatus,
} from '../types/indiaMartLead';

const BASE = '/indiamart-leads';
export const indiaMartQueryKey = ['indiamart-leads'];

export function fetchIndiaMartLeadsApi(params?: { start_date?: string; end_date?: string }) {
  const queryParams: Record<string, string> = {};
  if (params?.start_date) queryParams.start_date = params.start_date;
  if (params?.end_date) queryParams.end_date = params.end_date;
  return get<IndiaMartFetchResult>(BASE, { params: queryParams });
}

export function checkIndiaMartDuplicatesApi(items: IndiaMartLead[]) {
  return post<IndiaMartCheckDuplicatesResult>(`${BASE}/check-duplicates`, { items });
}

export function importIndiaMartLeadsApi(
  items: IndiaMartLead[],
  options?: { skipDuplicates?: boolean }
) {
  return post<IndiaMartImportResult>(`${BASE}/import`, {
    items,
    skipDuplicates: options?.skipDuplicates !== false,
  });
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

export function useCheckIndiaMartDuplicates() {
  return useMutation({
    mutationFn: (items: IndiaMartLead[]) => checkIndiaMartDuplicatesApi(items),
  });
}

export function useImportIndiaMartLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      items,
      skipDuplicates,
    }: {
      items: IndiaMartLead[];
      skipDuplicates?: boolean;
    }) => importIndiaMartLeadsApi(items, { skipDuplicates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsQueryKey });
    },
  });
}
