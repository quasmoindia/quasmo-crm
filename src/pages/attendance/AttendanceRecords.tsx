import { useState } from 'react';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { useCorrectRecord, useCorrectSession, useRecordsList } from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceRecord, Employee, PunchEvent } from '../../types/attendance';

function empLabel(r: AttendanceRecord) {
  const e = r.employeeId;
  if (typeof e === 'object' && e) return `${(e as Employee).fullName} (${(e as Employee).employeeCode})`;
  return '—';
}

function hoursLabel(minutes: number) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeOnly(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

/** ISO → value for <input type="datetime-local"> in local time */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function AttendanceRecords() {
  const { canCorrectRecords } = useAttendancePermissions();
  const [page, setPage] = useState(1);
  const [workDate, setWorkDate] = useState('');
  const [correctTarget, setCorrectTarget] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [newStatus, setNewStatus] = useState('complete');
  const [sessionsTarget, setSessionsTarget] = useState<AttendanceRecord | null>(null);
  const { data, isLoading } = useRecordsList({ workDate: workDate || undefined, page, limit: 20 });
  const correctMutation = useCorrectRecord();

  const submitCorrection = async () => {
    if (!correctTarget || !reason.trim()) return;
    await correctMutation.mutateAsync({
      id: correctTarget._id,
      field: 'status',
      newValue: newStatus,
      reason: reason.trim(),
    });
    setCorrectTarget(null);
    setReason('');
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Punch log</h1>
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input label="Work date" type="date" value={workDate} onChange={(e) => { setWorkDate(e.target.value); setPage(1); }} />
        </div>
        <DataTable<AttendanceRecord>
          columns={[
            { key: 'date', label: 'Date', render: (r) => r.workDate },
            { key: 'employee', label: 'Employee', render: empLabel },
            { key: 'in', label: 'First in', render: (r) => timeOnly(r.punchIn?.at) },
            { key: 'out', label: 'Last out', render: (r) => timeOnly(r.punchOut?.at) },
            { key: 'sessions', label: 'Sessions', render: (r) => r.sessions?.length ?? 0 },
            { key: 'worked', label: 'Worked', render: (r) => hoursLabel(r.workedMinutes) },
            {
              key: 'geo',
              label: 'Geofence',
              render: (r) =>
                (r.sessions ?? []).some((s) => s.in?.outsideGeofence || s.out?.outsideGeofence) ? (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Outside</span>
                ) : (
                  'OK'
                ),
            },
            { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
          ]}
          data={data?.data ?? []}
          rowKey={(r) => r._id}
          pagination={data?.pagination ? {
            page: data.pagination.page,
            totalPages: data.pagination.pages,
            total: data.pagination.total,
            limit: data.pagination.limit,
            onPageChange: setPage,
          } : undefined}
          isLoading={isLoading}
          emptyMessage="No records found."
          renderActions={(r) => (
            <div className="flex gap-3">
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setSessionsTarget(r)}>
                Sessions
              </button>
              {canCorrectRecords ? (
                <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setCorrectTarget(r)}>
                  Status
                </button>
              ) : null}
            </div>
          )}
        />
      </Card>

      {sessionsTarget && (
        <SessionsModal
          record={sessionsTarget}
          canEdit={canCorrectRecords}
          onClose={() => setSessionsTarget(null)}
        />
      )}

      {correctTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="font-semibold text-slate-900">Correct status</h3>
            <p className="mt-1 text-sm text-slate-600">{empLabel(correctTarget)} · {correctTarget.workDate}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                New status
                <select className="mt-1 w-full rounded-lg border px-3 py-2" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="complete">Complete</option>
                  <option value="flagged">Flagged</option>
                </select>
              </label>
              <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={submitCorrection} loading={correctMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setCorrectTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsModal({
  record,
  canEdit,
  onClose,
}: {
  record: AttendanceRecord;
  canEdit: boolean;
  onClose: () => void;
}) {
  const correctSession = useCorrectSession();
  const sessions = record.sessions ?? [];
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');
  const [reason, setReason] = useState('');

  const startEdit = (index: number) => {
    const s = sessions[index];
    setEditIndex(index);
    setInAt(toLocalInput(s.in?.at));
    setOutAt(toLocalInput(s.out?.at));
    setReason('');
  };

  const save = async () => {
    if (editIndex == null || !reason.trim()) return;
    await correctSession.mutateAsync({
      id: record._id,
      sessionIndex: editIndex,
      inAt: inAt ? fromLocalInput(inAt) : undefined,
      outAt: outAt ? fromLocalInput(outAt) : undefined,
      reason: reason.trim(),
    });
    setEditIndex(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="font-semibold text-slate-900">Sessions · {record.workDate}</h3>
        <p className="mt-1 text-sm text-slate-600">Total worked: {hoursLabel(record.workedMinutes)}</p>

        <div className="mt-4 space-y-2">
          {sessions.length === 0 && <p className="text-sm text-slate-500">No sessions.</p>}
          {sessions.map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-slate-700">
                  Session #{i + 1} · {timeOnly(s.in?.at)} → {s.out ? timeOnly(s.out.at) : <span className="text-amber-600">open</span>}
                </span>
                {canEdit && (
                  <button type="button" className="text-xs text-[#305dff] hover:underline" onClick={() => startEdit(i)}>
                    Edit
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <PunchView label="In" event={s.in} />
                <PunchView label="Out" event={s.out} />
              </div>
            </div>
          ))}
        </div>

        {editIndex != null && (
          <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">Fix session #{editIndex + 1}</p>
            <Input label="Punch in" type="datetime-local" value={inAt} onChange={(e) => setInAt(e.target.value)} />
            <Input label="Punch out" type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} />
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <div className="flex gap-2">
              <Button onClick={save} loading={correctSession.isPending} disabled={!reason.trim()}>Save</Button>
              <Button variant="outline" onClick={() => setEditIndex(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function PunchView({ label, event }: { label: string; event?: PunchEvent }) {
  if (!event) {
    return (
      <div className="rounded-lg bg-slate-50 p-2.5">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-xs text-slate-400">No punch recorded</p>
      </div>
    );
  }
  const hasCoords = Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
  const coords = hasCoords ? `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}` : '—';
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}` : null;
  return (
    <div className={`rounded-lg p-2.5 ${event.outsideGeofence ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {event.outsideGeofence && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Outside</span>
        )}
      </div>
      <div className="mt-1.5 flex gap-2.5">
        {event.selfieUrl ? (
          <a href={event.selfieUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={event.selfieUrl} alt={`${label} selfie`} className="h-16 w-16 rounded-lg object-cover" />
          </a>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[10px] text-slate-400">
            No selfie
          </div>
        )}
        <div className="min-w-0 text-xs text-slate-600">
          <p className="font-medium text-slate-700">{new Date(event.at).toLocaleString()}</p>
          <p className="mt-0.5">
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-[#305dff] hover:underline">
                {coords}
              </a>
            ) : (
              coords
            )}
          </p>
          <p className="mt-0.5 text-slate-400">±{Math.round(event.accuracy)}m · {event.deviceType}</p>
        </div>
      </div>
    </div>
  );
}
