import { useMemo, useState } from 'react';
import { FiAlertTriangle, FiClock, FiMapPin, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { Button } from '../Button';
import {
  useAddSession,
  useCorrectSession,
  useDeleteSession,
  useEmployeeAttendanceSummary,
  useRecord,
  useRecordsList,
  useSitesList,
  type PunchPatch,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import { AttendanceDayMeta } from './AttendanceDayDetailPanel';
import { AttendanceSessionList } from './AttendanceSessionList';
import type { AttendanceRecord, AttendanceSession } from '../../types/attendance';

/**
 * Everything about one employee on one day, in an overlay — so the calendar, the
 * needs-attention inbox and the employee page can all drill in without losing their
 * place.
 *
 * Two tabs rather than two components: "Attendance" is what happened (sessions,
 * selfies, location), "Regularize" is how to change it. Same overlay everywhere, so
 * there is one thing for a new user to learn.
 */

type DayTab = 'attendance' | 'regularize';

/** '2026-07-24' + Date -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | undefined, fallbackDate: string): string {
  const d = iso ? new Date(iso) : new Date(`${fallbackDate}T09:00`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO string, or undefined when blank. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

interface PunchForm {
  at: string;
  latitude: string;
  longitude: string;
  accuracy: string;
  outsideGeofence: boolean;
}

function punchToForm(
  punch: AttendanceSession['in'] | AttendanceSession['out'] | undefined,
  fallbackDate: string
): PunchForm {
  return {
    at: punch ? toLocalInput(punch.at, fallbackDate) : '',
    latitude: punch ? String(punch.latitude ?? '') : '',
    longitude: punch ? String(punch.longitude ?? '') : '',
    accuracy: punch ? String(punch.accuracy ?? '') : '',
    outsideGeofence: !!punch?.outsideGeofence,
  };
}

/** Only the fields the user actually changed, so untouched values are never overwritten. */
function diffPunch(form: PunchForm, original: PunchForm): PunchPatch | undefined {
  const patch: PunchPatch = {};
  if (form.at !== original.at) {
    const iso = toIso(form.at);
    if (iso) patch.at = iso;
  }
  if (form.latitude !== original.latitude && form.latitude !== '') patch.latitude = Number(form.latitude);
  if (form.longitude !== original.longitude && form.longitude !== '') patch.longitude = Number(form.longitude);
  if (form.accuracy !== original.accuracy && form.accuracy !== '') patch.accuracy = Number(form.accuracy);
  if (form.outsideGeofence !== original.outsideGeofence) patch.outsideGeofence = form.outsideGeofence;
  return Object.keys(patch).length > 0 ? patch : undefined;
}

function fmtDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function EmployeeDayDrawer({
  employeeId,
  employeeName,
  employeeCode,
  date,
  initialTab = 'attendance',
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  date: string;
  initialTab?: DayTab;
  onClose: () => void;
}) {
  const { canCorrectRecords, canManageCorrections } = useAttendancePermissions();
  const [tab, setTab] = useState<DayTab>(initialTab);

  // Read side: the classified day plus its sessions and selfies.
  const dayRange = useMemo(() => ({ dateFrom: date, dateTo: date }), [date]);
  const { data: summary, isLoading: summaryLoading } = useEmployeeAttendanceSummary(employeeId, dayRange);
  const dayDetail = summary?.days?.[0];

  // Write side: the raw record, which the correction endpoints key off.
  const { data: list, isLoading: listLoading } = useRecordsList({ employeeId, workDate: date, limit: 1 });
  const recordId = list?.data?.[0]?._id;
  const { data: detail, isLoading: detailLoading } = useRecord(recordId);
  const { data: sites } = useSitesList();

  const record: AttendanceRecord | undefined = detail?.record ?? list?.data?.[0];
  const sessions = useMemo(() => record?.sessions ?? [], [record]);

  const [forms, setForms] = useState<{ in: PunchForm; out: PunchForm }[]>([]);
  const [originals, setOriginals] = useState<{ in: PunchForm; out: PunchForm }[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newIn, setNewIn] = useState('');
  const [newOut, setNewOut] = useState('');

  const correctSession = useCorrectSession();
  const addSession = useAddSession();
  const deleteSession = useDeleteSession();

  // Seed the form from whatever sessions the server last returned. Done during render
  // rather than in an effect — React's documented way to reset state when the source
  // changes, and it avoids the extra paint an effect would cause.
  const [syncedFrom, setSyncedFrom] = useState<typeof sessions | null>(null);
  if (sessions !== syncedFrom) {
    const next = sessions.map((s) => ({
      in: punchToForm(s.in, date),
      out: punchToForm(s.out, date),
    }));
    setSyncedFrom(sessions);
    setForms(next);
    setOriginals(next);
  }

  const busy = correctSession.isPending || addSession.isPending || deleteSession.isPending;
  const loading = listLoading || detailLoading;

  const setPunch = (index: number, side: 'in' | 'out', patch: Partial<PunchForm>) => {
    setForms((prev) => prev.map((f, i) => (i === index ? { ...f, [side]: { ...f[side], ...patch } } : f)));
  };

  const applySiteLocation = (index: number, side: 'in' | 'out') => {
    const site =
      sites?.data?.find((s) => s._id === (record?.workSiteId as { _id?: string })?._id) ?? sites?.data?.[0];
    if (!site) return;
    setPunch(index, side, {
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      outsideGeofence: false,
    });
  };

  const save = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('A reason is required — it is recorded in the audit log.');
      return;
    }
    if (!recordId) {
      setError('No attendance record exists for this day. Use "Add session" instead.');
      return;
    }

    const edits = forms
      .map((form, index) => ({
        index,
        in: diffPunch(form.in, originals[index]?.in ?? form.in),
        out: diffPunch(form.out, originals[index]?.out ?? form.out),
      }))
      .filter((e) => e.in || e.out);

    if (edits.length === 0) {
      setError('Nothing changed.');
      return;
    }

    try {
      for (const edit of edits) {
        await correctSession.mutateAsync({
          id: recordId,
          sessionIndex: edit.index,
          in: edit.in,
          out: edit.out,
          reason: reason.trim(),
        });
      }
      setReason('');
      // Stay open on the Attendance tab so the corrected result is visible immediately.
      setTab('attendance');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitAdd = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('A reason is required — it is recorded in the audit log.');
      return;
    }
    const inIso = toIso(newIn);
    if (!inIso) {
      setError('A punch-in time is required.');
      return;
    }
    try {
      await addSession.mutateAsync({
        employeeId,
        workDate: date,
        inAt: inIso,
        outAt: toIso(newOut),
        reason: reason.trim(),
      });
      setAddOpen(false);
      setNewIn('');
      setNewOut('');
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeSession = async (index: number) => {
    setError(null);
    if (!reason.trim()) {
      setError('Enter a reason before deleting a session.');
      return;
    }
    if (!recordId) return;
    try {
      await deleteSession.mutateAsync({ id: recordId, sessionIndex: index, reason: reason.trim() });
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const tabs: { id: DayTab; label: string }[] = [
    { id: 'attendance', label: 'Attendance' },
    ...(canCorrectRecords ? [{ id: 'regularize' as const, label: 'Regularize' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-slate-200 px-5 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{employeeName}</h2>
              <p className="text-sm text-slate-500">
                {employeeCode ? `${employeeCode} · ` : ''}
                {fmtDateLong(date)}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
              <FiX className="size-5" />
            </button>
          </div>

          {dayDetail && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <AttendanceDayMeta day={dayDetail} />
            </div>
          )}

          <div className="mt-3 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'attendance' ? (
            summaryLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : (
              <>
                <AttendanceSessionList
                  sessions={dayDetail?.sessions ?? []}
                  emptyMessage="No punches recorded on this day."
                />
                {detail?.corrections && detail.corrections.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Correction history</h3>
                    <ul className="space-y-2">
                      {detail.corrections.map((c) => (
                        <li key={c._id} className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                          <span className="font-medium text-slate-800">
                            {new Date(c.correctedAt).toLocaleString()} · {c.correctedBy?.fullName ?? 'Unknown'}
                          </span>
                          <span className="ml-1 font-mono text-[11px] text-slate-500">{c.field}</span>
                          <p className="mt-0.5 italic">“{c.reason}”</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          ) : loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              {sessions.length === 0 && (
                <p className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No punches recorded for this day. Add a session below to create the record.
                </p>
              )}

              {forms.map((form, index) => (
                <div key={index} className="mb-4 rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Session {index + 1}</h3>
                    {canManageCorrections && (
                      <button
                        type="button"
                        onClick={() => removeSession(index)}
                        disabled={busy}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 disabled:opacity-50"
                      >
                        <FiTrash2 className="size-3.5" /> Delete session
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <PunchFields
                      label="Punch in"
                      form={form.in}
                      missing={false}
                      disabled={!canCorrectRecords || busy}
                      onChange={(p) => setPunch(index, 'in', p)}
                      onUseSite={() => applySiteLocation(index, 'in')}
                    />
                    <PunchFields
                      label="Punch out"
                      form={form.out}
                      missing={!sessions[index]?.out}
                      disabled={!canCorrectRecords || busy}
                      onChange={(p) => setPunch(index, 'out', p)}
                      onUseSite={() => applySiteLocation(index, 'out')}
                    />
                  </div>
                </div>
              ))}

              {canManageCorrections && (
                <div className="mb-4">
                  {addOpen ? (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-800">Add session</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-slate-600">
                          Punch in
                          <input
                            type="datetime-local"
                            value={newIn}
                            onChange={(e) => setNewIn(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Punch out (optional)
                          <input
                            type="datetime-local"
                            value={newOut}
                            onChange={(e) => setNewOut(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={submitAdd} loading={addSession.isPending}>Add</Button>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNewIn(toLocalInput(undefined, date));
                        setAddOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    >
                      <FiPlus className="size-4" /> Add session
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {tab === 'regularize' && canCorrectRecords && (
          <div className="border-t border-slate-200 px-5 py-4">
            {error && (
              <p className="mb-2 flex items-center gap-1.5 text-sm text-rose-600">
                <FiAlertTriangle className="size-4 shrink-0" /> {error}
              </p>
            )}
            <label className="block text-xs font-medium text-slate-600">
              Reason (required — recorded in the audit log)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Forgot to punch out, confirmed with floor supervisor"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
              <Button onClick={save} loading={correctSession.isPending}>Save changes</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PunchFields({
  label,
  form,
  missing,
  disabled,
  onChange,
  onUseSite,
}: {
  label: string;
  form: PunchForm;
  missing: boolean;
  disabled: boolean;
  onChange: (patch: Partial<PunchForm>) => void;
  onUseSite: () => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${missing ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {missing && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <FiAlertTriangle className="size-3" /> missing
          </span>
        )}
      </div>

      <label className="block text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><FiClock className="size-3" /> Time</span>
        <input
          type="datetime-local"
          value={form.at}
          disabled={disabled}
          onChange={(e) => onChange({ at: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
        />
      </label>

      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
        <FiMapPin className="size-3" /> Location
      </p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={form.latitude}
          disabled={disabled}
          onChange={(e) => onChange({ latitude: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={form.longitude}
          disabled={disabled}
          onChange={(e) => onChange({ longitude: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
        />
      </div>
      <input
        type="number"
        min="0"
        placeholder="Accuracy (m)"
        value={form.accuracy}
        disabled={disabled}
        onChange={(e) => onChange({ accuracy: e.target.value })}
        className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
      />

      <button
        type="button"
        onClick={onUseSite}
        disabled={disabled}
        className="mt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
      >
        Use work-site location
      </button>

      <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
        <input
          type="checkbox"
          checked={form.outsideGeofence}
          disabled={disabled}
          onChange={(e) => onChange({ outsideGeofence: e.target.checked })}
          className="rounded border-slate-300"
        />
        Outside geofence
      </label>
    </div>
  );
}
