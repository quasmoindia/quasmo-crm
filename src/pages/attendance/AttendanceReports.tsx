import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { DataTable } from '../../components/DataTable';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { downloadReportExport, useReportSummary } from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceRecord, Employee, Leave, LeaveType } from '../../types/attendance';

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual',
  sick: 'Sick',
  earned: 'Earned / Paid',
  unpaid: 'Unpaid (LWP)',
};

function empFromRecord(r: AttendanceRecord) {
  const e = r.employeeId;
  if (typeof e === 'object' && e) return `${(e as Employee).fullName} (${(e as Employee).employeeCode})`;
  return '—';
}

function empFromLeave(l: Leave) {
  const e = l.employeeId;
  if (typeof e === 'object' && e) return `${e.fullName} (${e.employeeCode})`;
  return '—';
}

function hoursLabel(minutes: number) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeOnly(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function leaveDateRange(l: Leave) {
  const f = new Date(`${l.fromDate}T12:00:00`).toLocaleDateString();
  if (l.fromDate === l.toDate) return f;
  return `${f} → ${new Date(`${l.toDate}T12:00:00`).toLocaleDateString()}`;
}

function leaveDays(l: Leave) {
  const a = new Date(`${l.fromDate}T12:00:00`);
  const b = new Date(`${l.toDate}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function AttendanceReports({ embedded = false }: { embedded?: boolean }) {
  const { canExport } = useAttendancePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [department, setDepartment] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isError, error } = useReportSummary({
    dateFrom,
    dateTo,
    department: department || undefined,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadReportExport({ dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const s = data?.summary;
  const records = data?.records ?? [];
  const leaves = data?.leaves ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
            <p className="text-sm text-slate-500">
              Attendance punches and applied leaves for the selected period.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Attendance punches and applied leaves for the selected period.
          </p>
        )}
        {canExport && (
          <Button onClick={handleExport} loading={exporting}>
            <FiDownload className="size-4" /> Export CSV
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
        </div>
      </Card>

      {isError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error instanceof Error ? error.message : 'Failed to load report'}
        </p>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryTile label="Punch records" value={s?.totalRecords ?? 0} />
            <SummaryTile label="Complete" value={s?.complete ?? 0} />
            <SummaryTile label="Open" value={s?.open ?? 0} />
            <SummaryTile label="Flagged" value={s?.flagged ?? 0} />
            <SummaryTile label="Late arrivals" value={s?.lateCount ?? 0} />
            <SummaryTile label="Worked (hrs)" value={Math.round((s?.totalWorkedMinutes ?? 0) / 60)} />
            <SummaryTile label="Leaves applied" value={s?.leaveApplications ?? 0} accent />
          </div>

          <Card className="mb-6">
            <h2 className="mb-4 font-semibold text-slate-800">Attendance punch log</h2>
            <DataTable<AttendanceRecord>
              columns={[
                { key: 'date', label: 'Date', render: (r) => r.workDate },
                { key: 'employee', label: 'Employee', render: empFromRecord },
                { key: 'in', label: 'First in', render: (r) => timeOnly(r.punchIn?.at) },
                { key: 'out', label: 'Last out', render: (r) => timeOnly(r.punchOut?.at) },
                { key: 'worked', label: 'Worked', render: (r) => hoursLabel(r.workedMinutes) },
                { key: 'late', label: 'Late (min)', render: (r) => r.lateMinutes ?? 0 },
                {
                  key: 'geo',
                  label: 'Geofence',
                  render: (r) =>
                    r.punchIn?.outsideGeofence || r.punchOut?.outsideGeofence ? (
                      <span className="text-amber-700">Outside</span>
                    ) : (
                      <span className="text-emerald-700">OK</span>
                    ),
                },
                { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
              ]}
              data={records}
              rowKey={(r) => r._id}
              emptyMessage="No punch records in this period."
            />
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold text-slate-800">Applied leaves</h2>
            <p className="mb-4 text-sm text-slate-500">
              Leave applications overlapping {data?.dateFrom} to {data?.dateTo}.
            </p>
            <DataTable<Leave>
              columns={[
                { key: 'employee', label: 'Employee', render: empFromLeave },
                { key: 'dates', label: 'Dates', render: leaveDateRange },
                { key: 'days', label: 'Days', render: leaveDays },
                { key: 'type', label: 'Type', render: (l) => LEAVE_TYPE_LABELS[l.type] },
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
              data={leaves}
              rowKey={(l) => l._id}
              emptyMessage="No leaves applied in this period."
            />
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-[#305dff]' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
