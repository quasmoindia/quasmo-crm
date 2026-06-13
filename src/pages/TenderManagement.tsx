import { useState } from 'react';
import { FiFileText, FiMapPin, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useTendersList, useCreateTender, useUpdateTender, useDeleteTender } from '../api/tenders';
import { useCurrentUser } from '../api/auth';
import type { Tender, CreateTenderPayload } from '../types/tender';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export function TenderManagement() {
  const { data: authData } = useCurrentUser();
  const isAdmin = authData?.user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tender | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tender | null>(null);

  const { data, isLoading } = useTendersList({
    search: searchQuery || undefined,
    department: departmentQuery || undefined,
    page,
    limit: 15,
  });
  const createMutation = useCreateTender();
  const updateMutation = useUpdateTender();
  const deleteMutation = useDeleteTender();

  const hasActiveFilters = Boolean(searchQuery || departmentQuery);
  const total = data?.pagination?.total ?? 0;

  const applyFilters = () => {
    setSearchQuery(searchInput.trim());
    setDepartmentQuery(departmentInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setDepartmentInput('');
    setDepartmentQuery('');
    setPage(1);
  };

  const columns = [
    {
      key: 'tenderNo',
      label: 'Tender No.',
      render: (t: Tender) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
          <FiFileText className="size-3.5 shrink-0 text-[#305dff]" aria-hidden />
          {t.tenderNo}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (t: Tender) =>
        t.location ? (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <FiMapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden />
            {t.location}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (t: Tender) =>
        t.department ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {t.department}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'priceQuoted',
            label: 'Price Quoted',
            render: (t: Tender) => (
              <span className="font-mono font-semibold text-emerald-700">
                {t.priceQuoted != null ? formatMoney(t.priceQuoted) : '—'}
              </span>
            ),
          },
        ]
      : []),
    { key: 'created', label: 'Added On', render: (t: Tender) => <span className="text-slate-600">{formatDate(t.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tender Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Track tender numbers, locations, departments, and quoted prices.'
              : 'Track tender numbers, locations, and departments.'}
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
          <FiPlus className="size-4" /> Add Tender
        </Button>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="tender-search" className="mb-1 block text-sm font-medium text-slate-700">
              Search
            </label>
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="tender-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFilters();
                  }
                }}
                placeholder="Tender no., location, department…"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
              />
            </div>
          </div>

          <Input
            label="Department"
            value={departmentInput}
            onChange={(e) => setDepartmentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
              }
            }}
            placeholder="e.g. Sales, Engineering"
          />

          <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:pb-0.5">
            <Button type="button" className="flex-1 lg:flex-none" onClick={applyFilters}>
              Apply
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="outline" className="flex-1 lg:flex-none" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-500">Active filters:</span>
            {searchQuery && (
              <FilterChip label={`Search: ${searchQuery}`} onRemove={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }} />
            )}
            {departmentQuery && (
              <FilterChip
                label={`Dept: ${departmentQuery}`}
                onRemove={() => { setDepartmentInput(''); setDepartmentQuery(''); setPage(1); }}
              />
            )}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <p className="text-sm text-slate-600">
            {isLoading ? (
              'Loading tenders…'
            ) : (
              <>
                <span className="font-semibold text-slate-800">{total}</span>
                {' '}
                tender{total === 1 ? '' : 's'}
                {hasActiveFilters ? ' matching filters' : ' total'}
              </>
            )}
          </p>
        </div>

        {!isLoading && total === 0 && !hasActiveFilters ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#305dff]/10 text-[#305dff]">
              <FiFileText className="size-7" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-slate-800">No tenders recorded</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Create a tender to track quotes, locations, and departments in one place.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <FiPlus className="size-4" /> Add first tender
            </Button>
          </div>
        ) : (
          <div className="px-2 sm:px-4">
            <DataTable<Tender>
              columns={columns}
              data={data?.data ?? []}
              rowKey={(t) => t._id}
              pagination={
                data?.pagination
                  ? {
                      page: data.pagination.page,
                      totalPages: data.pagination.totalPages,
                      total: data.pagination.total,
                      limit: data.pagination.limit,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              isLoading={isLoading}
              emptyMessage="No tenders match your filters. Try clearing filters or broadening your search."
              renderActions={(tender) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#305dff]/30 hover:bg-[#305dff]/5 hover:text-[#305dff]"
                    onClick={() => setEditTarget(tender)}
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                      onClick={() => setDeleteTarget(tender)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            />
          </div>
        )}
      </Card>

      {createOpen && (
        <TenderFormModal
          title="Add tender"
          showPricing
          isSaving={createMutation.isPending}
          onClose={() => setCreateOpen(false)}
          onSave={async (payload) => {
            await createMutation.mutateAsync(payload as CreateTenderPayload);
            setCreateOpen(false);
          }}
        />
      )}

      {editTarget && (
        <TenderFormModal
          title="Edit tender"
          initial={editTarget}
          showPricing={isAdmin}
          isSaving={updateMutation.isPending}
          onClose={() => setEditTarget(null)}
          onSave={async (payload) => {
            await updateMutation.mutateAsync({ id: editTarget._id, payload });
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete tender</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete tender <span className="font-semibold text-slate-800">{deleteTarget.tenderNo}</span>? This cannot
              be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                loading={deleteMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-[#305dff]/10 px-2.5 py-1 text-xs font-medium text-[#305dff] transition hover:bg-[#305dff]/15"
    >
      {label}
      <FiX className="size-3" aria-hidden />
    </button>
  );
}

function TenderFormModal({
  title,
  initial,
  showPricing,
  isSaving,
  onClose,
  onSave,
}: {
  title: string;
  initial?: Tender;
  showPricing: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<CreateTenderPayload> & { tenderNo: string }) => Promise<void>;
}) {
  const [tenderNo, setTenderNo] = useState(initial?.tenderNo ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [priceQuoted, setPriceQuoted] = useState(initial?.priceQuoted != null ? String(initial.priceQuoted) : '');
  const [error, setError] = useState<string | null>(null);
  const isCreate = initial == null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <FiX className="size-5" />
          </button>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!tenderNo.trim()) {
              setError('Tender number is required');
              return;
            }
            const payload: Partial<CreateTenderPayload> & { tenderNo: string } = {
              tenderNo: tenderNo.trim(),
              location: location.trim() || undefined,
              department: department.trim() || undefined,
            };
            if (showPricing || isCreate) {
              const numPrice = parseFloat(priceQuoted);
              if (isNaN(numPrice) || numPrice < 0) {
                setError('Enter a valid price quoted');
                return;
              }
              payload.priceQuoted = numPrice;
            }
            try {
              await onSave(payload);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <Input
            label="Tender No. *"
            value={tenderNo}
            onChange={(e) => setTenderNo(e.target.value)}
            disabled={isSaving}
            placeholder="e.g. TND-2026-001"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              placeholder="City or site"
            />
            <Input
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Sales"
            />
          </div>

          {(showPricing || isCreate) && (
            <Input
              label="Price Quoted (₹) *"
              type="number"
              min="0"
              step="0.01"
              value={priceQuoted}
              onChange={(e) => setPriceQuoted(e.target.value)}
              disabled={isSaving}
              placeholder="0.00"
            />
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              Save tender
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
