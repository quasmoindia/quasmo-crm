import { useMemo, useState } from 'react';
import { FiPlus, FiSun } from 'react-icons/fi';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { SearchableSelect } from '../../components/SearchableSelect';
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useSitesList,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { Holiday } from '../../types/attendance';

function scopeLabel(h: Holiday) {
  const site = typeof h.workSiteId === 'object' && h.workSiteId ? h.workSiteId.name : null;
  const parts: string[] = [];
  if (site) parts.push(site);
  if (h.department?.trim()) parts.push(h.department.trim());
  return parts.length ? parts.join(' · ') : 'All employees';
}

function formatDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function monthLabel(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function AttendanceHolidays({ embedded = false }: { embedded?: boolean }) {
  const { canManageEmployees } = useAttendancePermissions();
  const now = new Date();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [showForm, setShowForm] = useState(false);

  const queryParams = viewMode === 'month' ? { month } : { year };
  const { data, isLoading } = useHolidays(queryParams);
  const deleteHoliday = useDeleteHoliday();
  const rows = data?.data ?? [];

  const stats = useMemo(() => {
    const paid = rows.filter((h) => h.paid).length;
    return { count: rows.length, paid };
  }, [rows]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Holidays</h1>
            <p className="text-sm text-slate-500">
              Declare company, site, or department holidays. Paid holidays credit payroll like weekly off.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Declare company, site, or department holidays. Paid holidays credit payroll like weekly off.
          </p>
        )}
        {canManageEmployees && (
          <Button onClick={() => setShowForm(true)}>
            <FiPlus className="size-4" /> Add holiday
          </Button>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <FiSun className="size-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Holidays</p>
            <p className="text-xl font-bold text-slate-800">{stats.count}</p>
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Paid / unpaid</p>
          <p className="text-xl font-bold text-slate-800">
            {stats.paid} paid · {stats.count - stats.paid} unpaid
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['month', 'year'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              viewMode === mode
                ? 'bg-[#0D9488] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {mode === 'month' ? 'Month view' : 'Year view'}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        {viewMode === 'month' ? (
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
              Previous
            </Button>
            <p className="text-center text-base font-bold text-slate-800">{monthLabel(month)}</p>
            <Button type="button" variant="outline" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
              Next
            </Button>
          </div>
        ) : (
          <Input label="Year" type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
        )}
      </Card>

      <Card>
        <DataTable<Holiday>
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (h) => (
                <div>
                  <p className="font-medium text-slate-800">{formatDate(h.date)}</p>
                </div>
              ),
            },
            { key: 'name', label: 'Name', render: (h) => <span className="font-medium text-slate-800">{h.name}</span> },
            {
              key: 'paid',
              label: 'Pay',
              render: (h) =>
                h.paid ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Unpaid</span>
                ),
            },
            { key: 'scope', label: 'Applies to', render: scopeLabel },
            { key: 'note', label: 'Note', render: (h) => h.note || '—' },
          ]}
          data={rows}
          rowKey={(h) => h._id}
          isLoading={isLoading}
          emptyMessage="No holidays in this period."
          renderActions={(h) =>
            canManageEmployees ? (
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={() => deleteHoliday.mutate(h._id)}
              >
                Delete
              </button>
            ) : null
          }
        />
      </Card>

      {showForm && <HolidayForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function HolidayForm({ onClose }: { onClose: () => void }) {
  const { data: sites } = useSitesList();
  const createHoliday = useCreateHoliday();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [paid, setPaid] = useState(true);
  const [workSiteId, setWorkSiteId] = useState('');
  const [department, setDepartment] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const siteOptions = (sites?.data ?? []).map((s) => ({
    value: s._id,
    label: s.name,
  }));

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Holiday name is required');
      return;
    }
    try {
      await createHoliday.mutateAsync({
        date,
        name: name.trim(),
        paid,
        workSiteId: workSiteId || null,
        department: department.trim() || null,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holiday');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h3 className="text-xl font-bold text-slate-900">Add holiday</h3>
        <p className="mt-1 text-sm text-slate-500">Company-wide or scoped to a site or department.</p>

        <div className="mt-5 space-y-4">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" />

          <div className="flex gap-2">
            {(['paid', 'unpaid'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPaid(option === 'paid')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  (option === 'paid') === paid
                    ? 'bg-[#0D9488] text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {option === 'paid' ? 'Paid' : 'Unpaid'}
              </button>
            ))}
          </div>

          <SearchableSelect
            label="Work site (optional)"
            value={workSiteId}
            onChange={setWorkSiteId}
            options={siteOptions}
            placeholder="All sites"
            searchPlaceholder="Search sites..."
            emptyText="No sites found"
          />
          <Input label="Department (optional)" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Production" />
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={submit} loading={createHoliday.isPending} className="flex-1">
            Save holiday
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
