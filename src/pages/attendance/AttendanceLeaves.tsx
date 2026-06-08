import { useState } from 'react';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
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

export function AttendanceLeaves() {
  const { canManageEmployees } = useAttendancePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, error } = useLeaves({ from, to });
  const deleteLeave = useDeleteLeave();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leaves</h1>
          <p className="text-sm text-slate-500">
            Paid leave is credited as a present day in payroll; unpaid leave is loss of pay.
          </p>
        </div>
        {canManageEmployees && <Button onClick={() => setShowForm(true)}>Apply leave</Button>}
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 max-w-md">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing approved leaves that overlap this date range. Widen the range if you don&apos;t see a recent application.
        </p>
      </Card>

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
            { key: 'type', label: 'Type', render: (l) => TYPE_LABELS[l.type] },
            {
              key: 'paid',
              label: 'Paid',
              render: (l) =>
                l.paid ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Paid</span>
                ) : (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Unpaid</span>
                ),
            },
            { key: 'note', label: 'Note', render: (l) => l.note || '—' },
          ]}
          data={data?.data ?? []}
          rowKey={(l) => l._id}
          isLoading={isLoading}
          emptyMessage="No leaves in this period."
          renderActions={(l) =>
            canManageEmployees ? (
              <button
                type="button"
                className="text-sm text-rose-600 hover:underline"
                onClick={() => deleteLeave.mutate(l._id)}
              >
                Delete
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
      await createLeave.mutateAsync({ employeeId, type, fromDate, toDate, note: note.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply leave');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <h3 className="font-semibold text-slate-900">Apply leave</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Employee
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {(employees?.data ?? []).map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Leave type
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
            >
              <option value="casual">Casual (paid)</option>
              <option value="sick">Sick (paid)</option>
              <option value="earned">Earned / Paid</option>
              <option value="unpaid">Unpaid (LWP)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          <p className="text-xs text-slate-500">
            This leave is{' '}
            <span className={paid ? 'font-medium text-emerald-700' : 'font-medium text-slate-700'}>
              {paid ? 'paid (counts for payroll)' : 'unpaid (loss of pay)'}
            </span>
            .
          </p>
          {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={submit} loading={createLeave.isPending}>Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
