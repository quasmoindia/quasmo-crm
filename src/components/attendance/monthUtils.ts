/** Helpers for the 'YYYY-MM' month strings the attendance views navigate by. */

/** Current month as 'YYYY-MM'. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Shift a 'YYYY-MM' by n months. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** First and last date of a 'YYYY-MM', as 'YYYY-MM-DD'. */
export function monthRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    dateFrom: `${month}-01`,
    dateTo: `${month}-${String(last).padStart(2, '0')}`,
  };
}

/** 'YYYY-MM' -> readable month heading, e.g. 'July 2026'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Today as 'YYYY-MM-DD' in local time. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
