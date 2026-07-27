import type { DayType } from '../../types/attendance';

/**
 * Single source of truth for how each day type is labelled and coloured.
 *
 * Shared by the payroll detail list and the attendance calendar so the same day can
 * never render two different ways. `code` is the compact form used in calendar cells;
 * `cell` is a stronger fill for those cells, since a calendar reads as blocks of colour
 * rather than as inline badges.
 */
export const DAY_TYPE_META: Record<DayType, { label: string; code: string; cls: string; cell: string }> = {
  worked: {
    label: 'Present',
    code: 'P',
    cls: 'bg-emerald-100 text-emerald-800',
    cell: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  worked_open: {
    label: 'Present (no punch-out)',
    code: 'P!',
    cls: 'bg-amber-100 text-amber-800',
    cell: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  paid_holiday: {
    label: 'Paid holiday',
    code: 'H',
    cls: 'bg-violet-100 text-violet-800',
    cell: 'bg-violet-100 text-violet-900 border-violet-200',
  },
  unpaid_holiday: {
    label: 'Holiday (unpaid)',
    code: 'H',
    cls: 'bg-slate-100 text-slate-600',
    cell: 'bg-violet-50 text-violet-800 border-violet-100',
  },
  paid_leave: {
    label: 'Paid leave',
    code: 'L',
    cls: 'bg-sky-100 text-sky-800',
    cell: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  unpaid_leave: {
    label: 'Unpaid leave',
    code: 'L',
    cls: 'bg-slate-200 text-slate-700',
    cell: 'bg-sky-50 text-sky-800 border-sky-100',
  },
  week_off: {
    label: 'Weekly off (paid)',
    code: 'W/O',
    cls: 'bg-indigo-100 text-indigo-800',
    cell: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  },
  week_off_unpaid: {
    label: 'Weekly off',
    code: 'W/O',
    cls: 'bg-slate-100 text-slate-600',
    cell: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  absent: {
    label: 'Absent',
    code: 'A',
    cls: 'bg-rose-100 text-rose-700',
    cell: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

/** Legend entries for the calendar, collapsing paid/unpaid pairs into one swatch. */
export const DAY_TYPE_LEGEND: { type: DayType; label: string }[] = [
  { type: 'worked', label: 'Present' },
  { type: 'worked_open', label: 'No punch-out' },
  { type: 'absent', label: 'Absent' },
  { type: 'week_off_unpaid', label: 'Week off' },
  { type: 'paid_holiday', label: 'Holiday' },
  { type: 'paid_leave', label: 'Leave' },
];

/** '8h 45m' from a minute count. */
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
