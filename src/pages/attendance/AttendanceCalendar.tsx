import { useMemo, useState } from 'react';
import { FiAlertTriangle, FiClock, FiDownload, FiMapPin, FiSearch } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AttendanceHeatmapCalendar } from '../../components/attendance/AttendanceHeatmapCalendar';
import { EmployeeDayDrawer } from '../../components/attendance/EmployeeDayDrawer';
import { DAY_TYPE_META, formatMinutes } from '../../components/attendance/dayTypeMeta';
import { currentMonth, monthRange } from '../../components/attendance/monthUtils';
import {
  exportAttendanceDayApi,
  useAttendanceCalendar,
  useAttendanceDay,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceDayEmployee } from '../../types/attendance';

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'flagged' | 'off';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
  { id: 'late', label: 'Late' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'off', label: 'Off / leave' },
];

function matchesStatus(row: AttendanceDayEmployee, filter: StatusFilter): boolean {
  switch (filter) {
    case 'present':
      return row.type === 'worked' || row.type === 'worked_open';
    case 'absent':
      return row.type === 'absent';
    case 'late':
      return row.lateMinutes > 0;
    case 'flagged':
      return row.recordStatus === 'flagged';
    case 'off':
      return ['week_off', 'week_off_unpaid', 'paid_holiday', 'unpaid_holiday', 'paid_leave', 'unpaid_leave'].includes(
        row.type
      );
    default:
      return true;
  }
}

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';
}

function fmtDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AttendanceCalendar() {
  const { canExport } = useAttendancePermissions();

  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  // Opening a row overlays the day panel rather than navigating, so the calendar,
  // the chosen date and the active filters all survive.
  const [openEmployee, setOpenEmployee] = useState<AttendanceDayEmployee | null>(null);

  const range = useMemo(() => monthRange(month), [month]);
  const calendar = useAttendanceCalendar(range);
  const day = useAttendanceDay(selectedDate);

  const departments = useMemo(() => {
    const set = new Set((day.data?.employees ?? []).map((e) => e.department).filter(Boolean));
    return Array.from(set).sort();
  }, [day.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (day.data?.employees ?? []).filter((r) => {
      if (!matchesStatus(r, statusFilter)) return false;
      if (department && r.department !== department) return false;
      if (term && !`${r.fullName} ${r.employeeCode}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [day.data, statusFilter, department, search]);

  const handleExport = async () => {
    if (!selectedDate) return;
    setExporting(true);
    try {
      const blob = await exportAttendanceDayApi(selectedDate, department || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const counts = day.data?.counts;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Attendance across the whole team, day by day. Click any date to see who was in.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          {calendar.isError ? (
            <p className="py-8 text-center text-red-600">{(calendar.error as Error).message}</p>
          ) : (
            <>
              <AttendanceHeatmapCalendar
                month={month}
                days={calendar.data?.days ?? []}
                selectedDate={selectedDate}
                onMonthChange={(m) => {
                  setMonth(m);
                  setSelectedDate(null);
                }}
                onSelectDate={setSelectedDate}
                isLoading={calendar.isLoading}
              />
              {calendar.data && (
                <p className="mt-3 text-xs text-slate-500">
                  {calendar.data.employeeCount} active employee
                  {calendar.data.employeeCount === 1 ? '' : 's'} in scope.
                </p>
              )}
            </>
          )}
        </Card>

        <Card>
          {!selectedDate ? (
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Pick a date on the calendar to see every employee&apos;s attendance for that day.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{fmtDateLong(selectedDate)}</h2>
                {canExport && (
                  <Button variant="outline" onClick={handleExport} disabled={exporting}>
                    <FiDownload className="size-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
                  </Button>
                )}
              </div>

              {counts && (
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  <Pill label="Present" value={counts.presentDays} cls="bg-emerald-100 text-emerald-800" />
                  <Pill label="Absent" value={counts.absentDays} cls="bg-rose-100 text-rose-800" />
                  <Pill label="Late" value={counts.lateCount} cls="bg-amber-100 text-amber-800" />
                  <Pill label="Flagged" value={counts.flaggedCount} cls="bg-orange-100 text-orange-800" />
                  <Pill label="Week off" value={counts.weekOffDays} cls="bg-indigo-100 text-indigo-800" />
                  <Pill label="Holiday" value={counts.holidayDays} cls="bg-violet-100 text-violet-800" />
                  <Pill
                    label="Leave"
                    value={counts.paidLeaveDays + counts.unpaidLeaveDays}
                    cls="bg-sky-100 text-sky-800"
                  />
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <FiSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or code…"
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm"
                  />
                </div>
                {departments.length > 0 && (
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {day.isLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
              ) : day.isError ? (
                <p className="py-8 text-center text-red-600">{(day.error as Error).message}</p>
              ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No employees match these filters.</p>
              ) : (
                <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {rows.map((r) => {
                    const meta = DAY_TYPE_META[r.type];
                    return (
                      <li key={r.employeeId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                        <button
                          type="button"
                          onClick={() => setOpenEmployee(r)}
                          className="min-w-0 flex-1 text-left"
                          title="Open attendance and regularize"
                        >
                          <span className="block truncate font-medium text-slate-900 hover:text-indigo-700">
                            {r.fullName}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {r.employeeCode}
                            {r.department ? ` · ${r.department}` : ''}
                          </span>
                        </button>

                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                          {meta.label}
                        </span>

                        <span className="shrink-0 tabular-nums text-xs text-slate-600">
                          {fmtTime(r.firstIn)} – {fmtTime(r.lastOut)}
                        </span>

                        <span className="shrink-0 text-xs text-slate-500">
                          {r.workedMinutes > 0 ? formatMinutes(r.workedMinutes) : '—'}
                        </span>

                        <span className="flex shrink-0 gap-1">
                          {r.lateMinutes > 0 && (
                            <span
                              title={`${r.lateMinutes} minutes late`}
                              className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                            >
                              <FiClock className="mr-0.5 inline size-2.5" aria-hidden />
                              {r.lateMinutes}m
                            </span>
                          )}
                          {r.recordStatus === 'flagged' && (
                            <span
                              title="Flagged for review"
                              className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800"
                            >
                              <FiAlertTriangle className="inline size-2.5" aria-hidden />
                            </span>
                          )}
                          {r.outsideGeofence && (
                            <span
                              title="Punched outside the work site"
                              className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800"
                            >
                              <FiMapPin className="inline size-2.5" aria-hidden />
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-2 text-xs text-slate-400">
                Showing {rows.length} of {day.data?.employees.length ?? 0}. Click a name to see their
                punches and regularize without leaving this page.
              </p>
            </>
          )}
        </Card>
      </div>

      {openEmployee && selectedDate && (
        <EmployeeDayDrawer
          employeeId={openEmployee.employeeId}
          employeeName={openEmployee.fullName}
          employeeCode={openEmployee.employeeCode}
          date={selectedDate}
          onClose={() => setOpenEmployee(null)}
        />
      )}
    </div>
  );
}

function Pill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium ${cls}`}>
      {label} {value}
    </span>
  );
}
