import { useSearchParams } from 'react-router-dom';

/**
 * The `?q=` term a global-search result navigated here with.
 *
 * List pages seed their own search box from this, so following a search result lands on the
 * module already filtered to what was being looked for, rather than on an unfiltered list the
 * user has to search a second time.
 */
export function useSearchTermFromUrl(): string {
  const [params] = useSearchParams();
  return (params.get('q') ?? '').trim();
}
