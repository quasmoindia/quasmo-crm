import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { CalendarDayAggregate } from '../../types/attendance';
import { monthLabel, shiftMonth, todayIso } from './monthUtils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first index (0=Mon .. 6=Sun) for a 'YYYY-MM-DD'. */
function mondayFirstIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/**
 * Attendance rate to a fill. Five steps rather than a continuous gradient: a smooth
 * ramp reads as decorative, whereas discrete bands make "that day was bad" jump out.
 */
function rateFill(day: CalendarDayAggregate): string {
  if (day.expected === 0) {
    if (day.holiday > 0) return 'bg-violet-50 border-violet-200 text-violet-800';
    return 'bg-slate-50 border-slate-200 text-slate-400';
  }
  const rate = day.attendanceRate ?? 0;
  if (rate >= 0.95) return 'bg-emerald-200 border-emerald-300 text-emerald-900';
  if (rate >= 0.85) return 'bg-emerald-100 border-emerald-200 text-emerald-900';
  if (rate >= 0.7) return 'bg-amber-100 border-amber-300 text-amber-900';
  if (rate >= 0.5) return 'bg-orange-100 border-orange-300 text-orange-900';
  return 'bg-rose-100 border-rose-300 text-rose-900';
}

export function AttendanceHeatmapCalendar({
  month,
  days,
  selectedDate,
  onMonthChange,
  onSelectDate,
  isLoading,
}: {
  month: string;
  days: CalendarDayAggregate[];
  selectedDate: string | null;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}) {
  const todayStr = todayIso();
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
        <h2 className="text-base font-semibold text-slate-800">{monthLabel(month)}</h2>
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
        <p className="py-12 text-center text-sm text-slate-500">Loading calendar…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((d) => {
            const dayNum = Number(d.date.slice(8, 10));
            const isSelected = d.date === selectedDate;
            const isFuture = d.date > todayStr;
            const title = d.holidayName
              ? `${d.holidayName} · ${d.holiday} on holiday`
              : `${d.present} present · ${d.absent} absent${d.late ? ` · ${d.late} late` : ''}${d.flagged ? ` · ${d.flagged} flagged` : ''}`;

            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelectDate(d.date)}
                title={title}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border p-1 transition-shadow hover:shadow-md ${rateFill(d)} ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                } ${isFuture ? 'opacity-40' : ''} ${d.date === todayStr ? 'font-bold underline decoration-2 underline-offset-2' : ''}`}
              >
                <span className="text-sm leading-none">{dayNum}</span>
                {d.expected > 0 ? (
                  <>
                    <span className="mt-1 text-[11px] font-semibold leading-none tabular-nums">
                      {d.present}/{d.expected}
                    </span>
                    <span className="mt-0.5 flex gap-1 text-[9px] leading-none opacity-80">
                      {d.absent > 0 && <span>{d.absent}A</span>}
                      {d.late > 0 && <span>{d.late}L</span>}
                      {d.flagged > 0 && <span>{d.flagged}⚑</span>}
                    </span>
                  </>
                ) : (
                  <span className="mt-1 text-[9px] font-medium leading-tight opacity-80">
                    {d.holiday > 0 ? 'Holiday' : d.weekOff > 0 ? 'Week off' : '—'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <span className="font-medium text-slate-500">Attendance rate</span>
        <Swatch cls="bg-rose-100 border-rose-300" label="under 50%" />
        <Swatch cls="bg-orange-100 border-orange-300" label="50–70%" />
        <Swatch cls="bg-amber-100 border-amber-300" label="70–85%" />
        <Swatch cls="bg-emerald-100 border-emerald-200" label="85–95%" />
        <Swatch cls="bg-emerald-200 border-emerald-300" label="95%+" />
        <Swatch cls="bg-violet-50 border-violet-200" label="Holiday" />
        <Swatch cls="bg-slate-50 border-slate-200" label="Week off" />
      </div>
    </div>
  );
}

function Swatch({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded border ${cls}`} />
      <span>{label}</span>
    </span>
  );
}
