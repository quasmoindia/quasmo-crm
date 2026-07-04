import { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useApproveRegularization, useRegularizations, useRejectRegularization } from '../../api/attendance';
import type { RegularizationRequest, RegularizationStatus } from '../../types/attendance';

const STATUS_STYLES: Record<RegularizationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const TABS: { id: string; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

function employeeName(req: RegularizationRequest): string {
  return typeof req.employeeId === 'object' ? req.employeeId.fullName : 'Unknown employee';
}

function employeeCode(req: RegularizationRequest): string {
  return typeof req.employeeId === 'object' ? req.employeeId.employeeCode : '';
}

function timeLabel(iso?: string): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
}

export function AttendanceRegularizations() {
  const [status, setStatus] = useState('pending');
  const { data, isLoading } = useRegularizations({ status });
  const approve = useApproveRegularization();
  const reject = useRejectRegularization();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const requests = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Attendance corrections</h1>
        <p className="mt-1 text-sm text-slate-500">
          Employee-requested fixes to missed or incorrect punches. Approving applies the change immediately.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === tab.id ? 'bg-[#305dff] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests here.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {employeeName(req)} <span className="font-normal text-slate-500">· {employeeCode(req)}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {req.workDate} · Requested in: {timeLabel(req.requestedInAt)} · Requested out: {timeLabel(req.requestedOutAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{req.reason}</p>
                    {req.reviewNote && <p className="mt-1 text-xs text-slate-400">HR note: {req.reviewNote}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[req.status]}`}>
                    {req.status}
                  </span>
                </div>

                {req.status === 'pending' && (
                  <div className="mt-3">
                    {reviewingId === req._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional note for the employee"
                          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
                        />
                        <Button
                          className="px-3 py-2 text-sm"
                          loading={approve.isPending}
                          onClick={() =>
                            approve.mutate(
                              { id: req._id, reviewNote: note || undefined },
                              { onSuccess: () => setReviewingId(null) }
                            )
                          }
                        >
                          <FiCheck className="size-4" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="px-3 py-2 text-sm text-rose-600"
                          loading={reject.isPending}
                          onClick={() =>
                            reject.mutate(
                              { id: req._id, reviewNote: note || undefined },
                              { onSuccess: () => setReviewingId(null) }
                            )
                          }
                        >
                          <FiX className="size-4" /> Reject
                        </Button>
                        <Button variant="outline" className="px-3 py-2 text-sm" onClick={() => setReviewingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => {
                          setReviewingId(req._id);
                          setNote('');
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
