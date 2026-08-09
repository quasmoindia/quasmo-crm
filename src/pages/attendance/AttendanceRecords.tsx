import { useState } from 'react';
import { FiEdit2, FiList, FiTrash2, FiUserX } from 'react-icons/fi';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { SearchableSelect } from '../../components/SearchableSelect';
import { TableRowActions } from '../../components/TableRowActions';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { formatWorkedDuration, attendanceRecordWorkedLabel } from '../../components/attendance/dayTypeMeta';
import {
  useAddSession,
  useCorrectRecord,
  useCorrectSession,
  useDeleteRecord,
  useDeleteSession,
  useEmployeesList,
  useMarkAbsent,
  useRecord,
  useRecordsList,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceRecord, Employee, PunchEvent } from '../../types/attendance';

function empLabel(r: AttendanceRecord) {
  const e = r.employeeId;
  if (typeof e === 'object' && e) return `${(e as Employee).fullName} (${(e as Employee).employeeCode})`;
  return '—';
}

function empId(r: AttendanceRecord): string {
  const e = r.employeeId;
  return typeof e === 'object' && e ? (e as Employee)._id : e;
}

function timeOnly(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function recordWorkedLabel(r: AttendanceRecord) {
  return attendanceRecordWorkedLabel(r);
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

export function AttendanceRecords({ embedded = false }: { embedded?: boolean }) {
  const { canCorrectRecords, canManageCorrections } = useAttendancePermissions();
  const [page, setPage] = useState(1);
  const [workDate, setWorkDate] = useState('');
  const [correctTarget, setCorrectTarget] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [newStatus, setNewStatus] = useState('complete');
  const [sessionsTarget, setSessionsTarget] = useState<AttendanceRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<AttendanceRecord | null>(null);
  const [deleteRecordReason, setDeleteRecordReason] = useState('');
  const [markAbsentOpen, setMarkAbsentOpen] = useState(false);
  const [absentEmployeeId, setAbsentEmployeeId] = useState('');
  const [absentDate, setAbsentDate] = useState('');
  const [absentReason, setAbsentReason] = useState('');

  const { data, isLoading } = useRecordsList({ workDate: workDate || undefined, page, limit: 20 });
  const correctMutation = useCorrectRecord();
  const deleteRecordMutation = useDeleteRecord();
  const markAbsentMutation = useMarkAbsent();
  const { data: employeesData, isLoading: employeesLoading } = useEmployeesList({ status: 'active', limit: 200 });

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

  const openMarkAbsent = () => {
    setAbsentEmployeeId('');
    setAbsentDate(workDate || new Date().toISOString().slice(0, 10));
    setAbsentReason('');
    setMarkAbsentOpen(true);
  };

  const submitMarkAbsent = () => {
    if (!absentEmployeeId || !absentDate || !absentReason.trim()) return;
    markAbsentMutation.mutate(
      { employeeId: absentEmployeeId, workDate: absentDate, reason: absentReason.trim() },
      { onSuccess: () => setMarkAbsentOpen(false) }
    );
  };

  const submitDeleteRecord = () => {
    if (!deleteRecordTarget || !deleteRecordReason.trim()) return;
    deleteRecordMutation.mutate(
      { id: deleteRecordTarget._id, reason: deleteRecordReason.trim() },
      {
        onSuccess: () => {
          setDeleteRecordTarget(null);
          setDeleteRecordReason('');
        },
      }
    );
  };

  const employeeOptions = (employeesData?.data ?? []).map((e) => ({
    value: e._id,
    label: `${e.fullName} (${e.employeeCode})`,
    meta: e.department,
  }));

  return (
    <div>
      {!embedded ? <h1 className="mb-6 text-2xl font-bold text-slate-800">Punch log</h1> : null}
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <Input label="Work date" type="date" value={workDate} onChange={(e) => { setWorkDate(e.target.value); setPage(1); }} />
          {canManageCorrections ? (
            <Button variant="outline" onClick={openMarkAbsent}>
              <FiUserX className="size-4" /> Mark absent
            </Button>
          ) : null}
        </div>
        <DataTable<AttendanceRecord>
          columns={[
            { key: 'date', label: 'Date', render: (r) => r.workDate },
            { key: 'employee', label: 'Employee', render: empLabel },
            { key: 'in', label: 'First in', render: (r) => timeOnly(r.punchIn?.at) },
            { key: 'out', label: 'Last out', render: (r) => timeOnly(r.punchOut?.at) },
            { key: 'sessions', label: 'Sessions', render: (r) => r.sessions?.length ?? 0 },
            { key: 'worked', label: 'Worked', render: (r) => recordWorkedLabel(r) },
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
            <TableRowActions
              items={[
                { key: 'sessions', label: 'Sessions', icon: FiList, onClick: () => setSessionsTarget(r) },
                {
                  key: 'status',
                  label: 'Correct status',
                  icon: FiEdit2,
                  hidden: !canCorrectRecords,
                  onClick: () => setCorrectTarget(r),
                },
                {
                  key: 'delete',
                  label: 'Delete record',
                  icon: FiTrash2,
                  variant: 'danger',
                  hidden: !canManageCorrections,
                  onClick: () => setDeleteRecordTarget(r),
                },
              ]}
            />
          )}
        />
      </Card>

      {sessionsTarget && (
        <SessionsModal
          record={sessionsTarget}
          canEdit={canCorrectRecords}
          canManageCorrections={canManageCorrections}
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
                  <option value="absent">Absent</option>
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

      {markAbsentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="font-semibold text-slate-900">Mark absent</h3>
            <p className="mt-1 text-sm text-slate-600">
              Clears any punches for that day and marks the employee absent — use this when attendance was
              applied for someone who never showed up.
            </p>
            <div className="mt-4 space-y-3">
              <SearchableSelect
                label="Employee"
                value={absentEmployeeId}
                onChange={setAbsentEmployeeId}
                options={employeeOptions}
                loading={employeesLoading}
                placeholder="Select employee"
                required
              />
              <Input label="Date" type="date" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} required />
              <Input label="Reason" value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} required />
            </div>
            {markAbsentMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{(markAbsentMutation.error as Error).message}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={submitMarkAbsent}
                loading={markAbsentMutation.isPending}
                disabled={!absentEmployeeId || !absentDate || !absentReason.trim()}
              >
                Mark absent
              </Button>
              <Button variant="outline" onClick={() => setMarkAbsentOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {deleteRecordTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteRecordTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete attendance record</h3>
            <p className="mt-2 text-sm text-slate-600">
              Permanently deletes {empLabel(deleteRecordTarget)}'s record for {deleteRecordTarget.workDate},
              including all its punch sessions. This cannot be undone.
            </p>
            <div className="mt-3">
              <Input
                label="Reason"
                value={deleteRecordReason}
                onChange={(e) => setDeleteRecordReason(e.target.value)}
                required
              />
            </div>
            {deleteRecordMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{(deleteRecordMutation.error as Error).message}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteRecordTarget(null)} disabled={deleteRecordMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteRecordMutation.isPending}
                disabled={!deleteRecordReason.trim()}
                onClick={submitDeleteRecord}
              >
                Delete
              </Button>
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
  canManageCorrections,
  onClose,
}: {
  record: AttendanceRecord;
  canEdit: boolean;
  canManageCorrections: boolean;
  onClose: () => void;
}) {
  const correctSession = useCorrectSession();
  const deleteSession = useDeleteSession();
  const addSession = useAddSession();
  const { data: historyData } = useRecord(record._id);
  const sessions = record.sessions ?? [];
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');
  const [reason, setReason] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [addingSession, setAddingSession] = useState(false);
  const [newInAt, setNewInAt] = useState('');
  const [newOutAt, setNewOutAt] = useState('');
  const [newReason, setNewReason] = useState('');

  const startEdit = (index: number) => {
    const s = sessions[index];
    setEditIndex(index);
    setDeleteIndex(null);
    setInAt(toLocalInput(s.in?.at));
    setOutAt(toLocalInput(s.out?.at));
    setReason('');
  };

  const save = async () => {
    if (editIndex == null || !reason.trim()) return;
    await correctSession.mutateAsync({
      id: record._id,
      sessionIndex: editIndex,
      in: inAt ? { at: fromLocalInput(inAt) } : undefined,
      out: outAt ? { at: fromLocalInput(outAt) } : undefined,
      reason: reason.trim(),
    });
    setEditIndex(null);
    onClose();
  };

  const startDelete = (index: number) => {
    setDeleteIndex(index);
    setEditIndex(null);
    setDeleteReason('');
  };

  const confirmDelete = () => {
    if (deleteIndex == null || !deleteReason.trim()) return;
    deleteSession.mutate(
      { id: record._id, sessionIndex: deleteIndex, reason: deleteReason.trim() },
      { onSuccess: () => onClose() }
    );
  };

  const submitAddSession = () => {
    if (!newInAt || !newReason.trim()) return;
    addSession.mutate(
      {
        employeeId: empId(record),
        workDate: record.workDate,
        inAt: fromLocalInput(newInAt),
        outAt: newOutAt ? fromLocalInput(newOutAt) : undefined,
        reason: newReason.trim(),
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="font-semibold text-slate-900">Sessions · {record.workDate}</h3>
        <p className="mt-1 text-sm text-slate-600">Total worked: {recordWorkedLabel(record)}</p>

        <div className="mt-4 space-y-2">
          {sessions.length === 0 && <p className="text-sm text-slate-500">No sessions.</p>}
          {sessions.map((s, i) => {
            const sessionSeconds =
              s.in?.at && s.out?.at
                ? Math.max(0, Math.round((new Date(s.out.at).getTime() - new Date(s.in.at).getTime()) / 1000))
                : 0;
            return (
            <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-slate-700">
                  Session #{i + 1} · {timeOnly(s.in?.at)} → {s.out ? timeOnly(s.out.at) : <span className="text-amber-600">open</span>}
                  {s.out ? <span className="ml-2 text-slate-500">({formatWorkedDuration(sessionSeconds)})</span> : null}
                </span>
                <div className="flex gap-3">
                  {canEdit && (
                    <button type="button" className="text-xs text-[#305dff] hover:underline" onClick={() => startEdit(i)}>
                      Edit
                    </button>
                  )}
                  {canManageCorrections && (
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => startDelete(i)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <PunchView label="In" event={s.in} />
                <PunchView label="Out" event={s.out} />
              </div>
            </div>
            );
          })}
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

        {deleteIndex != null && (
          <div className="mt-4 space-y-3 rounded-lg bg-red-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              Delete session #{deleteIndex + 1} — e.g. a punch made for the wrong employee.
            </p>
            <Input label="Reason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} required />
            {deleteSession.isError && (
              <p className="text-sm text-red-600">{(deleteSession.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <Button variant="danger" loading={deleteSession.isPending} disabled={!deleteReason.trim()} onClick={confirmDelete}>
                Delete session
              </Button>
              <Button variant="outline" onClick={() => setDeleteIndex(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {canManageCorrections && (
          <div className="mt-4">
            {addingSession ? (
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">Add a session</p>
                <Input label="Punch in" type="datetime-local" value={newInAt} onChange={(e) => setNewInAt(e.target.value)} required />
                <Input label="Punch out (optional)" type="datetime-local" value={newOutAt} onChange={(e) => setNewOutAt(e.target.value)} />
                <Input label="Reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} required />
                {addSession.isError && (
                  <p className="text-sm text-red-600">{(addSession.error as Error).message}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={submitAddSession} loading={addSession.isPending} disabled={!newInAt || !newReason.trim()}>
                    Add session
                  </Button>
                  <Button variant="outline" onClick={() => setAddingSession(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setAddingSession(true)}>Add session</Button>
            )}
          </div>
        )}

        {historyData?.corrections && historyData.corrections.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">History</p>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {historyData.corrections.map((c) => (
                <div key={c._id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  <p className="font-medium text-slate-700">
                    {c.field} · {new Date(c.correctedAt).toLocaleString()}
                  </p>
                  <p className="mt-0.5">{c.reason}</p>
                  <p className="mt-0.5 text-slate-400">by {c.correctedBy?.fullName ?? '—'}</p>
                </div>
              ))}
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
