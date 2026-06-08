import { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useSitesList,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { Holiday } from '../../types/attendance';

function scopeLabel(h: Holiday) {
  const site =
    typeof h.workSiteId === 'object' && h.workSiteId ? h.workSiteId.name : null;
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

export function AttendanceHolidays() {
  const { canManageEmployees } = useAttendancePermissions();
  const now = new Date();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [year, setYear] = useState(String(now.getFullYear()));
  const [showForm, setShowForm] = useState(false);

  const queryParams = viewMode === 'month' ? { month } : { year };
  const { data, isLoading } = useHolidays(queryParams);
  const deleteHoliday = useDeleteHoliday();

  const paidCount = useMemo(
    () => (data?.data ?? []).filter((h) => h.paid).length,
    [data?.data]
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Holidays</h1>
          <p className="text-sm text-slate-500">
            Declare company, site, or department holidays. Paid holidays credit payroll like weekly off;
            unpaid holidays are excused from absence without pay.
          </p>
        </div>
        {canManageEmployees && (
          <Button onClick={() => setShowForm(true)}>Add holiday</Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm font-medium text-slate-700">
            View by
            <select
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'month' | 'year')}
            >
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>
          {viewMode === 'month' ? (
            <Input
              label="Month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          ) : (
            <Input
              label="Year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          )}
          <div className="pb-1 text-sm text-slate-500">
            {(data?.data ?? []).length} holiday{(data?.data ?? []).length === 1 ? '' : 's'}
            {paidCount > 0 ? ` · ${paidCount} paid` : ''}
          </div>
        </div>
      </Card>

      <Card>
        <DataTable<Holiday>
          columns={[
            { key: 'date', label: 'Date', render: (h) => formatDate(h.date) },
            { key: 'name', label: 'Name', render: (h) => h.name },
            {
              key: 'paid',
              label: 'Pay',
              render: (h) =>
                h.paid ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Paid</span>
                ) : (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Unpaid</span>
                ),
            },
            { key: 'scope', label: 'Applies to', render: scopeLabel },
            { key: 'note', label: 'Note', render: (h) => h.note || '—' },
          ]}
          data={data?.data ?? []}
          rowKey={(h) => h._id}
          isLoading={isLoading}
          emptyMessage="No holidays in this period."
          renderActions={(h) =>
            canManageEmployees ? (
              <button
                type="button"
                className="text-sm text-rose-600 hover:underline"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <h3 className="font-semibold text-slate-900">Add holiday</h3>
        <p className="mt-1 text-xs text-slate-500">
          Leave work site and department blank to apply to all employees.
        </p>
        <div className="mt-4 space-y-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="rounded border-slate-300"
            />
            Paid holiday (counts for payroll)
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Work site (optional)
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={workSiteId}
              onChange={(e) => setWorkSiteId(e.target.value)}
            >
              <option value="">All sites</option>
              {(sites?.data ?? []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Department (optional)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Production"
          />
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={submit} loading={createHoliday.isPending}>
            Save
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
