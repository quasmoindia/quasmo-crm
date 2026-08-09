import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { STATUS, type StatusTone } from './tokens';

/**
 * The dashboard's lead: everything that is waiting on a person, ranked by how badly.
 *
 * The rule that makes it useful — an item only exists while its count is above zero.
 * A row of permanent counters trains people to stop reading it; a list that empties
 * gives "nothing here" real meaning. When every count is zero the strip collapses to a
 * single all-clear line rather than disappearing, so the reader can tell the difference
 * between "nothing to do" and "not loaded yet".
 */

export interface TriageItem {
  id: string;
  /** Count of things needing a decision. Zero hides the item. */
  count: number;
  /** Singular noun phrase. */
  label: string;
  /**
   * Plural form. Required whenever the head noun is not the last word — appending "s" to
   * "product low on stock" yields "product low on stocks".
   */
  labelPlural?: string;
  /** What to do about it, in a few words. */
  detail: string;
  tone: StatusTone;
  icon: IconType;
  to: string;
}

function plural(item: TriageItem): string {
  if (item.count === 1) return item.label;
  return item.labelPlural ?? `${item.label}s`;
}

const TONE_ORDER: Record<StatusTone, number> = { critical: 0, serious: 1, warning: 2, good: 3 };

export function TriageStrip({ items, loading }: { items: TriageItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 flex gap-3">
          <div className="h-16 flex-1 animate-pulse rounded-xl bg-slate-50" />
          <div className="h-16 flex-1 animate-pulse rounded-xl bg-slate-50" />
          <div className="h-16 flex-1 animate-pulse rounded-xl bg-slate-50" />
        </div>
      </div>
    );
  }

  const active = items
    .filter((item) => item.count > 0)
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || b.count - a.count);

  if (active.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: STATUS.good.bg, borderColor: STATUS.good.border }}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white"
          style={{ color: STATUS.good.fg }}
        >
          <FiCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Nothing needs you right now</p>
          <p className="text-sm text-slate-600">
            No open complaints, stock warnings or pending approvals.
          </p>
        </div>
      </div>
    );
  }

  const total = active.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-labelledby="triage-heading">
      <div className="mb-2.5 flex items-baseline gap-2">
        <h2 id="triage-heading" className="text-sm font-semibold text-slate-900">
          Needs you
        </h2>
        <span className="text-sm tabular-nums text-slate-500">
          {total} item{total === 1 ? '' : 's'} across {active.length} area
          {active.length === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {active.map((item) => {
          const tone = STATUS[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className="group flex h-full items-start gap-3 rounded-2xl border p-3.5 transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                style={{ backgroundColor: tone.bg, borderColor: tone.border }}
              >
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white"
                  style={{ color: tone.fg }}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold leading-none tabular-nums text-slate-900">
                      {item.count}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{plural(item)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    {item.detail}
                    <FiArrowRight
                      className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
