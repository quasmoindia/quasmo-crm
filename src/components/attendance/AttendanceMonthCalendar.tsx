import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { AttendanceDayDetail } from '../../types/attendance';
import { DAY_TYPE_META, DAY_TYPE_LEGEND } from './dayTypeMeta';
import { monthLabel, shiftMonth, todayIso } from './monthUtils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first index (0=Mon .. 6=Sun) for a 'YYYY-MM-DD'. */
function mondayFirstIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export function AttendanceMonthCalendar({
  month,
  days,
  selectedDate,
  onMonthChange,
  onSelectDate,
  isLoading,
}: {
  month: string;
  days: AttendanceDayDetail[];
  selectedDate: string | null;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}) {
  const todayStr = todayIso();

  // Blank cells so the 1st lands under its weekday column.
  const leadingBlanks = days.length > 0 ? mondayFirstIndex(days[0].date) : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          aria-label="Previous month"
        >
          <FiChevronLeft className="size-4" />
        </button>
        <h3 className="text-base font-semibold text-slate-800">{monthLabel(month)}</h3>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          aria-label="Next month"
        >
          <FiChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {w}
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading attendance…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((d) => {
            const meta = DAY_TYPE_META[d.type];
            const isSelected = d.date === selectedDate;
            const dayNum = Number(d.date.slice(8, 10));
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelectDate(d.date)}
                title={`${d.day} ${dayNum} · ${meta.label}${d.note ? ` · ${d.note}` : ''}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border p-1 transition-shadow hover:shadow-md ${meta.cell} ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                } ${d.date === todayStr ? 'font-bold underline decoration-2 underline-offset-2' : ''}`}
              >
                <span className="text-sm leading-none">{dayNum}</span>
                <span className="mt-1 text-[10px] font-semibold leading-none opacity-80">{meta.code}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {DAY_TYPE_LEGEND.map(({ type, label }) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`size-3 rounded border ${DAY_TYPE_META[type].cell}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
