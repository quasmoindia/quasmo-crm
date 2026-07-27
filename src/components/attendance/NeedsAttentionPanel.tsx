import { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiChevronDown, FiChevronUp, FiClock, FiEdit3, FiX } from 'react-icons/fi';
import { Card } from '../Card';
import {
  useApproveRegularization,
  useRecordsList,
  useRegularizations,
  useRejectRegularization,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import { EmployeeDayDrawer } from './EmployeeDayDrawer';
import type { AttendanceRecord, Employee, RegularizationRequest } from '../../types/attendance';

/**
 * The module's inbox: everything that needs a human decision, in one list, each with a
 * one-click action.
 *
 * This exists to kill the old split where "Corrections" in the sidebar meant the
 * employee request queue, while HR's own ability to fix a punch lived several clicks
 * away inside the records list. Both now surface here, next to the problem.
 */

function CountChip({ cls, label, count }: { cls: string; label: string; count: number }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {count} {label}
      {count === 1 ? '' : 's'}
    </span>
  );
}

function employeeOf(r: AttendanceRecord): { id: string; name: string } {
  const e = r.employeeId;
  if (typeof e === 'object' && e) {
    return { id: (e as Employee)._id, name: (e as Employee).fullName };
  }
  return { id: String(e ?? ''), name: 'Unknown employee' };
}

function requestEmployee(req: RegularizationRequest): { id: string; name: string } {
  const e = req.employeeId;
  if (typeof e === 'object' && e) return { id: e._id, name: e.fullName };
  return { id: String(e), name: 'Unknown employee' };
}

function fmtDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Per-bucket fetch cap. Counts come from pagination totals, not this. */
const FETCH_LIMIT = 25;

export function NeedsAttentionPanel() {
  const { canCorrectRecords, canManageCorrections } = useAttendancePermissions();
  const [fixTarget, setFixTarget] = useState<{ id: string; name: string; date: string } | null>(null);
  // Collapsed by default: this sits above the page's tabs, and an unbounded list here
  // pushed them off-screen entirely.
  const [expanded, setExpanded] = useState(false);

  const { data: openRecords } = useRecordsList({ status: 'open', limit: FETCH_LIMIT });
  const { data: flaggedRecords } = useRecordsList({ status: 'flagged', limit: FETCH_LIMIT });
  const { data: pending } = useRegularizations({ status: 'pending' });

  const approve = useApproveRegularization();
  const reject = useRejectRegularization();

  const open = openRecords?.data ?? [];
  const flagged = flaggedRecords?.data ?? [];
  const requests = pending?.data ?? [];

  // True totals come from pagination — the lists themselves are capped, so summing them
  // would under-report whenever a bucket is full.
  const openTotal = openRecords?.pagination?.total ?? open.length;
  const flaggedTotal = flaggedRecords?.pagination?.total ?? flagged.length;
  const requestTotal = requests.length;
  const total = openTotal + flaggedTotal + requestTotal;
  const shown = open.length + flagged.length + requests.length;

  if (total === 0) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FiAlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
        <h2 className="font-semibold text-slate-900">Needs attention</h2>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
          {total}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {requestTotal > 0 && (
            <CountChip cls="bg-sky-100 text-sky-800" label="pending request" count={requestTotal} />
          )}
          {openTotal > 0 && (
            <CountChip cls="bg-amber-100 text-amber-800" label="missing punch-out" count={openTotal} />
          )}
          {flaggedTotal > 0 && (
            <CountChip cls="bg-rose-100 text-rose-800" label="flagged" count={flaggedTotal} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-amber-50"
          aria-expanded={expanded}
        >
          {expanded ? 'Hide' : 'Review'}
          {expanded ? <FiChevronUp className="size-4" /> : <FiChevronDown className="size-4" />}
        </button>
      </div>

      {expanded && (
        <>
          <ul className="mt-3 max-h-80 divide-y divide-amber-200/70 overflow-y-auto rounded-lg border border-amber-200/70 bg-white/60 px-3">
        {requests.map((req) => {
          const emp = requestEmployee(req);
          return (
            <li key={req._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-sm">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                Request
              </span>
              <span className="font-medium text-slate-900">{emp.name}</span>
              <span className="text-slate-500">{fmtDate(req.workDate)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500" title={req.reason}>
                {req.reason}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => approve.mutate({ id: req._id })}
                  disabled={approve.isPending}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiCheck className="size-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => reject.mutate({ id: req._id })}
                  disabled={reject.isPending}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FiX className="size-3.5" /> Reject
                </button>
              </div>
            </li>
          );
        })}

        {open.map((r) => {
          const emp = employeeOf(r);
          return (
            <li key={`open-${r._id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-sm">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                No punch-out
              </span>
              <span className="font-medium text-slate-900">{emp.name}</span>
              <span className="text-slate-500">{fmtDate(r.workDate)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                <FiClock className="mr-1 inline size-3" aria-hidden />
                Punched in, never punched out
              </span>
              {canCorrectRecords && (
                <button
                  type="button"
                  onClick={() => setFixTarget({ id: emp.id, name: emp.name, date: r.workDate })}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
                >
                  <FiEdit3 className="size-3.5" /> Fix
                </button>
              )}
            </li>
          );
        })}

        {flagged.map((r) => {
          const emp = employeeOf(r);
          return (
            <li key={`flagged-${r._id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-sm">
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                Flagged
              </span>
              <span className="font-medium text-slate-900">{emp.name}</span>
              <span className="text-slate-500">{fmtDate(r.workDate)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                Needs review
              </span>
              {canCorrectRecords && (
                <button
                  type="button"
                  onClick={() => setFixTarget({ id: emp.id, name: emp.name, date: r.workDate })}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
                >
                  <FiEdit3 className="size-3.5" /> Fix
                </button>
              )}
            </li>
          );
        })}
          </ul>

          {shown < total && (
            <p className="mt-2 text-xs text-slate-500">
              Showing the {shown} most recent of {total}. Clear these and the rest will appear.
            </p>
          )}

          {!canManageCorrections && requests.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Some actions need HR or admin permissions.
            </p>
          )}
        </>
      )}

      {fixTarget && (
        <EmployeeDayDrawer
          employeeId={fixTarget.id}
          employeeName={fixTarget.name}
          date={fixTarget.date}
          initialTab="regularize"
          onClose={() => setFixTarget(null)}
        />
      )}
    </Card>
  );
}
