import { Link } from 'react-router-dom';
import { FiClock, FiUserCheck, FiUserX, FiAlertTriangle } from 'react-icons/fi';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { useAttendanceDashboard } from '../../api/attendance';
import type { AttendanceRecord, Employee } from '../../types/attendance';

function empName(r: AttendanceRecord) {
  const e = r.employeeId;
  if (typeof e === 'object' && e) return `${(e as Employee).fullName} (${(e as Employee).employeeCode})`;
  return '—';
}

export function AttendanceDashboard() {
  const { data, isLoading } = useAttendanceDashboard();
  const stats = data?.stats;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Attendance — Today</h1>
      {data?.workDate && (
        <p className="mb-4 text-sm text-slate-500">Work date: {data.workDate}</p>
      )}
      {(data?.holidaysToday?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <p className="font-medium">Today&apos;s holidays</p>
          <ul className="mt-1 list-inside list-disc text-violet-800">
            {data!.holidaysToday!.map((h) => (
              <li key={h._id}>
                {h.name}
                {h.paid ? ' (paid)' : ' (unpaid)'}
              </li>
            ))}
          </ul>
          {(stats?.onHoliday ?? 0) > 0 && (
            <p className="mt-2 text-xs text-violet-700">
              {stats!.onHoliday} employee{stats!.onHoliday === 1 ? '' : 's'} excused from absence (no punch).
            </p>
          )}
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present" value={stats?.present ?? 0} icon={FiUserCheck} tone="green" />
        <StatCard label="Absent" value={stats?.absent ?? 0} icon={FiUserX} tone="rose" />
        <StatCard label="Late" value={stats?.late ?? 0} icon={FiClock} tone="orange" />
        <StatCard label="Flagged" value={stats?.flagged ?? 0} icon={FiAlertTriangle} tone="amber" />
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Today&apos;s punch log</h2>
          <Link to="/dashboard/attendance/records" className="text-sm text-[#305dff] hover:underline">
            View all records
          </Link>
        </div>
        <DataTable<AttendanceRecord>
          columns={[
            { key: 'employee', label: 'Employee', render: empName },
            { key: 'in', label: 'Punch in', render: (r) => r.punchIn ? new Date(r.punchIn.at).toLocaleTimeString() : '—' },
            { key: 'out', label: 'Punch out', render: (r) => r.punchOut ? new Date(r.punchOut.at).toLocaleTimeString() : '—' },
            { key: 'late', label: 'Late (min)', render: (r) => r.lateMinutes ?? 0 },
            { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
          ]}
          data={data?.records ?? []}
          rowKey={(r) => r._id}
          isLoading={isLoading}
          emptyMessage="No punches recorded today."
        />
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof FiClock;
  tone: 'green' | 'rose' | 'orange' | 'amber';
}) {
  const tones = {
    green: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    orange: 'text-orange-600 bg-orange-50',
    amber: 'text-amber-700 bg-amber-50',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
