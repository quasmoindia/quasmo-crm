import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiAlertTriangle, FiGrid, FiList, FiMapPin, FiSearch } from 'react-icons/fi';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { GpsStatusBanner } from '../../components/attendance/GpsStatusBanner';
import { QuickPunchModal } from '../../components/attendance/QuickPunchModal';
import { EmployeePhotoGrid, shiftTimingLabel } from '../../components/attendance/EmployeePhotoGrid';
import { KioskToolbar } from '../../components/attendance/KioskToolbar';
import {
  crmPunchInApi,
  crmPunchOutApi,
  usePunchContext,
  useRosterToday,
} from '../../api/attendance';
import { useAttendanceGeolocation } from '../../hooks/useAttendanceGeolocation';
import { useKioskMode } from '../../hooks/useKioskMode';
import { formatWorkedDuration } from '../../components/attendance/dayTypeMeta';
import type { RosterEntry } from '../../types/attendance';

function timeLabel(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function rosterWorkedLabel(today: RosterEntry['today']) {
  if (today.grossWorkedSeconds != null) return formatWorkedDuration(today.grossWorkedSeconds);
  return formatWorkedDuration((today.workedMinutes ?? 0) * 60);
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function AttendanceRoster() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'kiosk'>('cards');
  const { locked } = useKioskMode();
  const { data: context } = usePunchContext();
  const maxGps = context?.maxGpsAccuracyMeters;
  const geo = useAttendanceGeolocation(maxGps, true);
  const { data: roster, isLoading } = useRosterToday({ search: search.trim() || undefined });
  const qc = useQueryClient();

  const [active, setActive] = useState<{ employee: RosterEntry; mode: 'in' | 'out' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const punchMutation = useMutation({
    mutationFn: async ({ employee, mode, selfie }: { employee: RosterEntry; mode: 'in' | 'out'; selfie: Blob }) => {
      if (!geo.coords) throw new Error('GPS location not available yet');
      const payload = {
        employeeId: employee._id,
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        accuracy: geo.coords.accuracy,
        selfie,
      };
      return mode === 'in' ? crmPunchInApi(payload) : crmPunchOutApi(payload);
    },
    onSuccess: () => {
      setActive(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ['attendance', 'roster'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'dashboard'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Punch failed'),
  });

  const entries = roster?.data ?? [];
  const summary = useMemo(() => {
    let inCount = 0;
    let worked = 0;
    let outside = 0;
    for (const e of entries) {
      if (e.today.open) inCount += 1;
      if (e.today.sessionsCount > 0) worked += 1;
      if (e.today.outsideGeofence) outside += 1;
    }
    return { total: entries.length, inCount, worked, outside };
  }, [entries]);

  const openPunch = (employee: RosterEntry, mode: 'in' | 'out') => {
    setError(null);
    setActive({ employee, mode });
  };

  useEffect(() => {
    if (locked) setViewMode('kiosk');
  }, [locked]);

  const isKiosk = viewMode === 'kiosk' || locked;

  return (
    <div className={`space-y-5 ${isKiosk ? 'min-h-screen' : ''}`}>
      {!locked && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Quick punch</h1>
            <p className="text-sm text-slate-500 sm:text-base">
              {isKiosk
                ? 'Large photos — tap Punch In or Punch Out under each employee'
                : 'Tap an employee to capture their selfie and mark attendance.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-md p-2 ${viewMode === 'cards' ? 'bg-[#305dff]/10 text-[#305dff]' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Card view"
              >
                <FiList className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kiosk')}
                className={`rounded-md p-2 ${viewMode === 'kiosk' ? 'bg-[#305dff]/10 text-[#305dff]' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Photo kiosk view"
              >
                <FiGrid className="size-5" />
              </button>
            </div>
            <KioskToolbar />
          </div>
        </div>
      )}

      {locked && (
        <>
          <p className="text-center text-2xl font-bold text-slate-800 sm:text-3xl">Tap your photo to punch</p>
          <KioskToolbar />
        </>
      )}

      {!isKiosk && (
        <GpsStatusBanner
          coords={geo.coords}
          error={geo.error}
          maxGpsAccuracyMeters={maxGps ?? 100}
        />
      )}

      {!isKiosk && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Employees</p>
            <p className="text-xl font-semibold text-slate-800">{summary.total}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Currently in</p>
            <p className="text-xl font-semibold text-emerald-600">{summary.inCount}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Punched today</p>
            <p className="text-xl font-semibold text-slate-700">{summary.worked}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-xs text-slate-500">Outside location</p>
            <p className="text-xl font-semibold text-amber-600">{summary.outside}</p>
          </Card>
        </div>
      )}

      <div className={`relative ${isKiosk ? 'max-w-none' : 'max-w-sm'}`}>
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          className={`w-full rounded-xl border bg-white py-2 pl-11 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff] ${
            isKiosk ? 'border-2 border-slate-200 py-3 pl-12 text-base' : 'border-slate-300'
          }`}
          placeholder="Search name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isKiosk && !locked && (
        <GpsStatusBanner
          coords={geo.coords}
          error={geo.error}
          maxGpsAccuracyMeters={maxGps ?? 100}
        />
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading roster…</p>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No active employees found.</p>
        </Card>
      ) : isKiosk ? (
        <EmployeePhotoGrid
          employees={entries}
          size="xlarge"
          emptyMessage="No active employees found."
          renderFooter={(emp) => {
            const today = emp.today;
            return (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {today.open ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      In · {rosterWorkedLabel(today)}
                    </span>
                  ) : today.sessionsCount > 0 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Out · {rosterWorkedLabel(today)}
                    </span>
                  ) : null}
                  {today.outsideGeofence && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      <FiMapPin size={10} /> Outside
                    </span>
                  )}
                </div>
                {today.open ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    className="py-2.5 text-sm"
                    disabled={!geo.coords}
                    onClick={() => openPunch(emp, 'out')}
                  >
                    Punch Out
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    className="py-2.5 text-sm"
                    disabled={!geo.coords}
                    onClick={() => openPunch(emp, 'in')}
                  >
                    {today.sessionsCount > 0 ? 'Punch In again' : 'Punch In'}
                  </Button>
                )}
              </div>
            );
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((emp) => {
            const today = emp.today;
            return (
              <Card key={emp._id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  {emp.referencePhotoUrl ? (
                    <img
                      src={emp.referencePhotoUrl}
                      alt={emp.fullName}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                      {initials(emp.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{emp.fullName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {emp.employeeCode}
                      {emp.department ? ` · ${emp.department}` : ''}
                    </p>
                    {emp.shift ? (
                      <p className="truncate text-xs font-medium text-[#305dff]">
                        {emp.shift.name} · {shiftTimingLabel(emp.shift)}
                      </p>
                    ) : null}
                  </div>
                  {today.open ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      In
                    </span>
                  ) : null}
                  {today.outsideGeofence && (
                    <span
                      title="Punched outside the work location"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                    >
                      <FiMapPin size={11} /> Outside
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <span>
                    Today:{' '}
                    <span className="font-semibold text-slate-700">{rosterWorkedLabel(today)}</span>
                  </span>
                  <span>
                    {today.sessionsCount} session{today.sessionsCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>First in: <span className="font-medium text-slate-700">{timeLabel(today.firstInAt)}</span></span>
                  <span>Last out: <span className="font-medium text-slate-700">{timeLabel(today.lastOutAt)}</span></span>
                </div>

                {today.open ? (
                  <Button fullWidth variant="secondary" onClick={() => openPunch(emp, 'out')}>
                    Punch Out
                  </Button>
                ) : (
                  <Button fullWidth onClick={() => openPunch(emp, 'in')}>
                    {today.sessionsCount > 0 ? 'Punch In again' : 'Punch In'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!geo.coords && !geo.error && !locked && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <FiAlertTriangle size={12} /> Acquiring GPS — punch buttons activate once location is ready.
        </p>
      )}

      <QuickPunchModal
        open={!!active}
        mode={active?.mode ?? 'in'}
        employeeName={active?.employee.fullName ?? ''}
        employeeCode={active?.employee.employeeCode ?? ''}
        referencePhotoUrl={active?.employee.referencePhotoUrl}
        coords={geo.coords}
        accuracyLabel={geo.accuracyLabel}
        poorAccuracy={geo.poorAccuracy}
        submitting={punchMutation.isPending}
        error={error}
        onClose={() => {
          if (!punchMutation.isPending) {
            setActive(null);
            setError(null);
          }
        }}
        onConfirm={(selfie) => {
          if (active) punchMutation.mutate({ employee: active.employee, mode: active.mode, selfie });
        }}
      />
    </div>
  );
}
