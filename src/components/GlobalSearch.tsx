import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiLoader } from 'react-icons/fi';
import { useGlobalSearch, MIN_SEARCH_LENGTH, type SearchHit } from '../api/search';

/**
 * Header search across every module the signed-in user can reach.
 *
 * The server decides what is searchable and what is visible — this component never filters,
 * so it cannot widen access by accident. Results are grouped by module and land the user on
 * that module already filtered to the term they searched for.
 */

/** Where a result of each module type lives. */
const MODULE_ROUTES: Record<string, string> = {
  complaints: '/dashboard/complaints',
  leads: '/dashboard/leads',
  customers: '/dashboard/customers',
  products: '/dashboard/products',
  orders: '/dashboard/orders',
  invoices: '/dashboard/invoices',
  attendance: '/dashboard/attendance/employees',
};

/** Products are the one module with a real detail route, so link straight to the record. */
function routeFor(moduleId: string, hit: SearchHit, term: string): string | null {
  const base = MODULE_ROUTES[moduleId];
  if (!base) return null;
  if (moduleId === 'products') return `${base}/${hit.id}`;
  return `${base}?q=${encodeURIComponent(term)}`;
}

const DEBOUNCE_MS = 250;

export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wait for a pause in typing before querying every module.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term]);

  const { data, isFetching } = useGlobalSearch(debounced);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const groups = useMemo(() => data?.groups ?? [], [data]);
  const hasResults = groups.some((g) => g.results.length > 0);
  const searching = term.trim().length >= MIN_SEARCH_LENGTH;

  function go(moduleId: string, hit: SearchHit) {
    const to = routeFor(moduleId, hit, debounced);
    if (!to) return;
    setOpen(false);
    setTerm('');
    navigate(to);
  }

  return (
    <div
      ref={containerRef}
      className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl lg:max-w-2xl"
    >
      <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        {isFetching ? (
          <FiLoader className="size-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <FiSearch className="size-4 shrink-0 text-slate-400" />
        )}
        <input
          type="search"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search complaints, leads, customers, orders..."
          className="min-w-0 flex-1 bg-transparent py-1 text-sm leading-normal text-slate-700 placeholder:text-slate-400 focus:outline-none"
          aria-label="Search"
        />
      </div>

      {open && searching ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {!hasResults ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              {isFetching ? 'Searching…' : `No matches for "${debounced}".`}
            </p>
          ) : (
            groups
              .filter((g) => g.results.length > 0)
              .map((group) => (
                <div key={group.moduleId} className="py-1">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </p>
                  {group.results.map((hit) => (
                    <button
                      key={`${group.moduleId}-${hit.id}`}
                      type="button"
                      onClick={() => go(group.moduleId, hit)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="truncate text-sm font-medium text-slate-800">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="truncate text-xs capitalize text-slate-500">{hit.subtitle}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
          )}
        </div>
      ) : null}
    </div>
  );
}
