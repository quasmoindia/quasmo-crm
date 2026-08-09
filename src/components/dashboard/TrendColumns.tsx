import { SERIES_HUE, formatInrCompact, formatInrFull } from './tokens';

/**
 * Single-series column chart for a monthly measure.
 *
 * One series, so no legend — the panel title names it. Only the peak column is
 * direct-labelled; a number over every bar is noise when the shape is the point. The
 * `sr-only` table is the non-visual path, and each column is focusable so the tooltip is
 * reachable from the keyboard as well as the mouse.
 *
 * Built from DOM elements rather than SVG so it scales fluidly and the hit targets are
 * real focusable boxes rather than thin paths.
 */

export interface TrendPoint {
  key: string;
  /** Short axis label, e.g. "Aug". */
  label: string;
  /** Full label for the tooltip and table, e.g. "August 2026". */
  fullLabel: string;
  value: number;
  /** Secondary figure shown in the tooltip, e.g. number of claims. */
  meta?: string;
}

export function TrendColumns({
  data,
  loading,
  emptyLabel = 'No data for this period yet',
}: {
  data: TrendPoint[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className="flex h-44 items-end gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-slate-100"
            style={{ height: `${40 + ((i * 37) % 55)}%` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const peakKey = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]).key;

  return (
    /*
     * `relative` is load-bearing, not cosmetic.
     *
     * The sr-only table below is position:absolute with auto offsets, so it resolves to its
     * static position — far down inside the scrolling <main>. Without a positioned ancestor
     * its containing block is the initial containing block, which extends
     * documentElement.scrollHeight and makes the whole window scroll behind the fixed-height
     * app shell, exposing a band of empty page under it. Anchoring it here keeps it inside
     * the scroll container.
     */
    <figure className="relative m-0">
      <div className="relative">
        {/* Recessive reference lines. Not labelled — the tooltip carries exact values. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44">
          {[0, 0.5, 1].map((f) => (
            <div
              key={f}
              className="absolute inset-x-0 border-t border-dashed border-slate-100"
              style={{ top: `${f * 100}%` }}
            />
          ))}
        </div>

        <div className="relative flex h-44 items-end gap-1.5">
          {data.map((point) => {
            const pct = (point.value / max) * 100;
            const isPeak = point.key === peakKey && point.value > 0;
            return (
              <div
                key={point.key}
                tabIndex={0}
                className="group relative flex h-full flex-1 cursor-default items-end rounded-t focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                aria-label={`${point.fullLabel}: ${formatInrFull(point.value)}`}
              >
                {isPeak ? (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-10 text-center text-[10px] font-semibold tabular-nums text-slate-500"
                    style={{ bottom: `calc(${pct}% + 6px)` }}
                  >
                    {formatInrCompact(point.value)}
                  </span>
                ) : null}

                <div
                  className="w-full rounded-t-[4px] transition-[filter] duration-150 group-hover:brightness-110 group-focus-visible:brightness-110 motion-safe:animate-[grow_420ms_ease-out]"
                  style={{
                    height: `${Math.max(pct, point.value > 0 ? 2 : 0)}%`,
                    backgroundColor: SERIES_HUE,
                  }}
                />

                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[11rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-left opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="block text-[11px] font-medium text-slate-300">
                    {point.fullLabel}
                  </span>
                  <span className="block text-sm font-semibold tabular-nums text-white">
                    {formatInrFull(point.value)}
                  </span>
                  {point.meta ? (
                    <span className="block text-[11px] text-slate-400">{point.meta}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-slate-200 pt-2">
        {data.map((point) => (
          <span
            key={point.key}
            className="flex-1 text-center text-[11px] font-medium tabular-nums text-slate-500"
          >
            {point.label}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Monthly total by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.fullLabel}</th>
              <td>{formatInrFull(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
