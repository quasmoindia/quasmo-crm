import { useMemo, useState } from 'react';
import { FiCalendar, FiPlus } from 'react-icons/fi';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { SearchableSelect } from '../../components/SearchableSelect';
import {
  useCreateLeave,
  useDeleteLeave,
  useEmployeesList,
  useLeaves,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { Leave, LeaveType } from '../../types/attendance';

const TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual',
  sick: 'Sick',
  earned: 'Earned / Paid',
  unpaid: 'Unpaid (LWP)',
};

const TYPE_STYLES: Record<LeaveType, string> = {
  casual: 'bg-blue-50 text-blue-700',
  sick: 'bg-rose-50 text-rose-700',
  earned: 'bg-emerald-50 text-emerald-700',
  unpaid: 'bg-slate-100 text-slate-600',
};

function empLabel(l: Leave) {
  const e = l.employeeId;
  if (typeof e === 'object' && e) return `${e.fullName} (${e.employeeCode})`;
  return '—';
}

function dateRange(l: Leave) {
  const f = new Date(l.fromDate).toLocaleDateString();
  if (l.fromDate === l.toDate) return f;
  return `${f} → ${new Date(l.toDate).toLocaleDateString()}`;
}

function dayCount(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

type RangePreset = 'month' | 'year' | 'custom';

export function AttendanceLeaves({ embedded = false }: { embedded?: boolean }) {
  const { canManageEmployees } = useAttendancePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const monthStart = `${today.slice(0, 7)}-01`;
  const [preset, setPreset] = useState<RangePreset>('year');
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, error } = useLeaves({ from, to });
  const deleteLeave = useDeleteLeave();
  const rows = data?.data ?? [];

  const stats = useMemo(() => {
    const totalDays = rows.reduce((sum, leave) => sum + dayCount(leave.fromDate, leave.toDate), 0);
    const paidDays = rows.filter((leave) => leave.paid).reduce((sum, leave) => sum + dayCount(leave.fromDate, leave.toDate), 0);
    const employees = new Set(rows.map((leave) => (typeof leave.employeeId === 'object' ? leave.employeeId._id : leave.employeeId))).size;
    return { count: rows.length, totalDays, paidDays, employees };
  }, [rows]);

  function applyPreset(next: RangePreset) {
    setPreset(next);
    if (next === 'month') {
      setFrom(monthStart);
      setTo(today);
    } else if (next === 'year') {
      setFrom(yearStart);
      setTo(today);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Leaves</h1>
            <p className="text-sm text-slate-500">
              Paid leave is credited as a present day in payroll; unpaid leave is loss of pay.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Paid leave is credited as a present day in payroll; unpaid leave is loss of pay.
          </p>
        )}
        {canManageEmployees && (
          <Button onClick={() => setShowForm(true)}>
            <FiPlus className="size-4" /> Apply leave
          </Button>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <FiCalendar className="size-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Records</p>
            <p className="text-xl font-bold text-slate-800">{stats.count}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div>
            <p className="text-xs text-slate-500">Leave days</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalDays}</p>
            <p className="text-xs text-slate-400">{stats.paidDays} paid</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div>
            <p className="text-xs text-slate-500">Employees</p>
            <p className="text-xl font-bold text-slate-800">{stats.employees}</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['month', 'year', 'custom'] as RangePreset[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => applyPreset(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              preset === item
                ? 'bg-[#0D9488] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {item === 'month' ? 'This month' : item === 'year' ? 'This year' : 'Custom range'}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <Card className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Card>
      )}

      {isError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error instanceof Error ? error.message : 'Failed to load leaves'}
        </p>
      )}

      <Card>
        <DataTable<Leave>
          columns={[
            { key: 'employee', label: 'Employee', render: empLabel },
            { key: 'dates', label: 'Dates', render: dateRange },
            { key: 'days', label: 'Days', render: (l) => dayCount(l.fromDate, l.toDate) },
            {
              key: 'type',
              label: 'Type',
              render: (l) => (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLES[l.type]}`}>
                  {TYPE_LABELS[l.type]}
                </span>
              ),
            },
            {
              key: 'paid',
              label: 'Paid',
              render: (l) =>
                l.paid ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Unpaid</span>
                ),
            },
            { key: 'note', label: 'Note', render: (l) => l.note || '—' },
          ]}
          data={rows}
          rowKey={(l) => l._id}
          isLoading={isLoading}
          emptyMessage="No leaves in this period."
          renderActions={(l) =>
            canManageEmployees ? (
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={() => deleteLeave.mutate(l._id)}
              >
                Remove
              </button>
            ) : null
          }
        />
      </Card>

      {showForm && <LeaveForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function LeaveForm({ onClose }: { onClose: () => void }) {
  const { data: employees } = useEmployeesList({ status: 'active', limit: 200 });
  const createLeave = useCreateLeave();
  const today = new Date().toISOString().slice(0, 10);
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const paid = type !== 'unpaid';
  const days = toDate >= fromDate ? dayCount(fromDate, toDate) : 0;

  const employeeOptions = (employees?.data ?? []).map((emp) => ({
    value: emp._id,
    label: emp.fullName,
    meta: [emp.employeeCode, emp.department].filter(Boolean).join(' · '),
  }));

  const submit = async () => {
    setError(null);
    if (!employeeId) {
      setError('Select an employee');
      return;
    }
    if (toDate < fromDate) {
      setError('End date must be on or after start date');
      return;
    }
    try {
      await createLeave.mutateAsync({ employeeId, type, fromDate, toDate, paid, note: note.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply leave');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h3 className="text-xl font-bold text-slate-900">Apply leave</h3>
        <p className="mt-1 text-sm text-slate-500">Record approved leave for payroll and attendance.</p>

        <div className="mt-5 space-y-5">
          <SearchableSelect
            label="Employee *"
            value={employeeId}
            onChange={setEmployeeId}
            options={employeeOptions}
            placeholder="Select employee"
            searchPlaceholder="Search name or code..."
            emptyText="No employees found"
          />

          <label className="block text-sm font-medium text-slate-700">
            Leave type
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
            >
              <option value="casual">Casual (paid)</option>
              <option value="sick">Sick (paid)</option>
              <option value="earned">Earned / Paid</option>
              <option value="unpaid">Unpaid (LWP)</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 font-semibold ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {paid ? 'Paid' : 'Unpaid'}
            </span>
            {days > 0 ? <span className="text-slate-500">{days} day{days === 1 ? '' : 's'}</span> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={submit} loading={createLeave.isPending} className="flex-1">
            Apply leave
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
