import { SERIES_HUE, formatInrCompact, formatInrFull } from './tokens';

/**
 * Ranked magnitude across nominal categories — where the money actually goes.
 *
 * Every bar takes the same hue. Categories here are nominal (swapping their order changes
 * nothing), so colour has no identity work to do, and colouring bars by their own value would
 * spend the identity channel re-encoding what bar length already shows.
 *
 * Sorted descending and capped, with the tail folded into a single "Other" row rather than
 * given more colours.
 */

export interface CategoryDatum {
  key: string;
  label: string;
  value: number;
  count: number;
}

export function CategoryBars({
  data,
  limit = 6,
  loading,
  emptyLabel = 'Nothing recorded yet',
}: {
  data: CategoryDatum[];
  limit?: number;
  loading?: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-8 animate-pulse rounded bg-slate-50" />
        ))}
      </ul>
    );
  }

  if (data.length === 0) {
    return <p className="py-6 text-sm text-slate-500">{emptyLabel}</p>;
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);

  const rows = [...head];
  if (tail.length > 0) {
    rows.push({
      key: '__other',
      label: `Other (${tail.length})`,
      value: tail.reduce((n, d) => n + d.value, 0),
      count: tail.reduce((n, d) => n + d.count, 0),
    });
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = sorted.reduce((n, d) => n + d.value, 0);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
        return (
          <li key={row.key} title={`${row.label}: ${formatInrFull(row.value)} across ${row.count}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-slate-700">{row.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-900">
                {formatInrCompact(row.value)}
                <span className="ml-1.5 text-[11px] text-slate-400">{pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(row.value / max) * 100}%`, backgroundColor: SERIES_HUE }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
