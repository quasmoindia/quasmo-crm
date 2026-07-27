import { FiEdit3 } from 'react-icons/fi';
import type { AttendanceDayDetail } from '../../types/attendance';
import { AttendanceSessionList } from './AttendanceSessionList';
import { DAY_TYPE_META, formatMinutes } from './dayTypeMeta';

function fmtDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Header line shared by the calendar panel and the day overlay: type, hours, flags. */
export function AttendanceDayMeta({ day }: { day: AttendanceDayDetail }) {
  const meta = DAY_TYPE_META[day.type];
  return (
    <>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
      {day.note && <span className="text-xs text-slate-600">{day.note}</span>}
      {day.workedMinutes > 0 && (
        <span className="text-xs text-slate-600">{formatMinutes(day.workedMinutes)} worked</span>
      )}
      {day.lateMinutes > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {day.lateMinutes}m late
        </span>
      )}
      {day.workSite && <span className="text-xs text-slate-500">· {day.workSite}</span>}
    </>
  );
}

export function AttendanceDayDetailPanel({
  day,
  onFix,
}: {
  day: AttendanceDayDetail | null;
  onFix?: (date: string) => void;
}) {
  if (!day) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Select a day to see its punch sessions.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="text-sm font-semibold text-slate-900">{fmtDateLong(day.date)}</h4>
        <AttendanceDayMeta day={day} />
        {onFix && (
          <button
            type="button"
            onClick={() => onFix(day.date)}
            className="ml-auto flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
          >
            <FiEdit3 className="size-3.5" aria-hidden /> Fix this day
          </button>
        )}
      </div>

      <AttendanceSessionList sessions={day.sessions} />
    </div>
  );
}
