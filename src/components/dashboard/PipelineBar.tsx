import { Link } from 'react-router-dom';
import { PIPELINE_RAMP, PIPELINE_TERMINAL } from './tokens';

/**
 * Part-to-whole across an ordered set of stages.
 *
 * This replaces a row of four equal-looking number boxes. Four boxes make you read and
 * compare digits; one proportioned bar shows the shape of the pipeline in a glance, and
 * still carries the exact counts underneath for anyone who needs them.
 *
 * Colour is ordinal, not categorical — later stage, darker step — so the bar reads
 * left-to-right as progress. A stage marked `terminal` (lost, cancelled) sits outside the
 * ramp in grey, because it is an exit rather than a later stage.
 */

export interface PipelineStage {
  key: string;
  label: string;
  count: number;
  /** Dropped out rather than progressed. Rendered grey, always placed last. */
  terminal?: boolean;
}

export function PipelineBar({
  stages,
  total,
  loading,
  emptyLabel = 'Nothing here yet',
  linkTo,
}: {
  stages: PipelineStage[];
  total: number;
  loading?: boolean;
  emptyLabel?: string;
  linkTo?: (stage: PipelineStage) => string;
}) {
  if (loading) {
    return (
      <div>
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stages.map((s) => (
            <div key={s.key} className="h-10 animate-pulse rounded-lg bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  if (total === 0) {
    return <p className="py-2 text-sm text-slate-500">{emptyLabel}</p>;
  }

  const progression = stages.filter((s) => !s.terminal);
  const colourFor = (stage: PipelineStage) => {
    if (stage.terminal) return PIPELINE_TERMINAL;
    const i = progression.indexOf(stage);
    return PIPELINE_RAMP[Math.min(i, PIPELINE_RAMP.length - 1)];
  };

  const visible = stages.filter((s) => s.count > 0);

  return (
    <div>
      {/* 2px surface gaps keep adjacent steps of one hue readable as separate segments. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {visible.map((stage) => (
          <div
            key={stage.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(stage.count / total) * 100}%`,
              backgroundColor: colourFor(stage),
            }}
            title={`${stage.label}: ${stage.count}`}
          />
        ))}
      </div>

      {/* Two columns at every width — these panels now sit three-across, where four
          columns of legend would truncate every label. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {stages.map((stage) => {
          const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
          const content = (
            <>
              <dt className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: colourFor(stage) }}
                  aria-hidden
                />
                <span className="truncate">{stage.label}</span>
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5 pl-3.5">
                <span className="text-base font-semibold tabular-nums text-slate-900">
                  {stage.count}
                </span>
                <span className="text-[11px] tabular-nums text-slate-400">{pct}%</span>
              </dd>
            </>
          );

          if (!linkTo) return <div key={stage.key}>{content}</div>;

          return (
            <Link
              key={stage.key}
              to={linkTo(stage)}
              className="rounded-lg p-1 -m-1 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
            >
              {content}
            </Link>
          );
        })}
      </dl>
    </div>
  );
}
