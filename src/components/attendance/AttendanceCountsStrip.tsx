import type { AttendanceCounts } from '../../types/attendance';
import { formatMinutes } from './dayTypeMeta';

/** Headline present/absent/off tallies, styled like the payroll detail stat row. */
export function AttendanceCountsStrip({ counts }: { counts: AttendanceCounts }) {
  const leaveDays = counts.paidLeaveDays + counts.unpaidLeaveDays;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat
        label="Present"
        value={`${counts.presentDays}d`}
        tone="text-emerald-700"
        hint={counts.incompleteDays > 0 ? `${counts.incompleteDays} without punch-out` : undefined}
      />
      <Stat label="Absent" value={`${counts.absentDays}d`} tone="text-rose-700" />
      <Stat label="Week off" value={`${counts.weekOffDays}d`} tone="text-indigo-700" />
      <Stat label="Holidays" value={`${counts.holidayDays}d`} tone="text-violet-700" />
      <Stat
        label="Leave"
        value={`${leaveDays}d`}
        tone="text-sky-700"
        hint={leaveDays > 0 ? `${counts.paidLeaveDays} paid · ${counts.unpaidLeaveDays} unpaid` : undefined}
      />
      <Stat label="Hours worked" value={formatMinutes(counts.workedMinutes)} tone="text-slate-800" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
