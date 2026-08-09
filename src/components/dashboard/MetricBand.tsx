import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { SERIES_HUE } from './tokens';

/**
 * One continuous readout panel instead of six floating cards.
 *
 * Six separate cards in a four-column grid left two orphan slots and stretched the last row
 * into tall, near-empty boxes — roughly 250px of page spent on two numbers. Hairline-divided
 * cells in a single panel carry the same figures in about a third of the height, and read as
 * one instrument rather than six unrelated widgets.
 *
 * The divider grid uses the offset-border technique: cells draw top and left rules, the inner
 * grid is pulled back by 1px, and the rounded parent clips the outer edges. That keeps the
 * rules correct at every breakpoint, including where the grid wraps.
 */

export interface Metric {
  key: string;
  label: string;
  value: string | number;
  /** Short qualifier under the figure. Keep it to a few words. */
  sub?: React.ReactNode;
  icon: IconType;
  to?: string;
  loading?: boolean;
  /** Ratio 0–1. Renders a thin meter under the figure — for "x of y" style metrics. */
  meter?: number;
}

function Cell({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {metric.label}
        </span>
        <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden />
      </div>

      {metric.loading ? (
        <div className="mt-2.5 h-7 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
          {metric.value}
        </p>
      )}

      {metric.meter !== undefined && !metric.loading ? (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, metric.meter * 100))}%`,
              backgroundColor: SERIES_HUE,
            }}
          />
        </div>
      ) : null}

      {metric.sub ? (
        <p className="mt-1.5 text-[11px] leading-tight text-slate-500">{metric.sub}</p>
      ) : null}
    </>
  );

  const base = 'border-l border-t border-slate-200 p-3.5 sm:p-4';

  if (!metric.to) return <div className={base}>{inner}</div>;

  return (
    <Link
      to={metric.to}
      className={`${base} block transition-colors hover:bg-slate-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600`}
    >
      {inner}
    </Link>
  );
}

export function MetricBand({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="-ml-px -mt-px grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <Cell key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
}
