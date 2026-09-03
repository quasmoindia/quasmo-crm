import { useQuery } from '@tanstack/react-query';
import { get } from '../utils/api';

export interface SearchHit {
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchGroup {
  moduleId: string;
  label: string;
  results: SearchHit[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

/** Below this the server returns nothing, so there is no point asking. */
export const MIN_SEARCH_LENGTH = 2;

export function useGlobalSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: () => get<SearchResponse>('/search', { params: { q } }),
    enabled: q.length >= MIN_SEARCH_LENGTH,
    // Results are a navigation aid, not live data — a short cache keeps repeated
    // keystrokes from re-querying every module.
    staleTime: 30_000,
    retry: false,
  });
}
