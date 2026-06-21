import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { GpsStatusBanner } from '../../components/attendance/GpsStatusBanner';
import { QuickPunchModal } from '../../components/attendance/QuickPunchModal';
import {
  selfPunchInApi,
  selfPunchOutApi,
  usePunchContext,
  useSelfContext,
} from '../../api/attendance';
import { useAttendanceGeolocation } from '../../hooks/useAttendanceGeolocation';
import type { AttendanceRecord } from '../../types/attendance';

function formatMinutes(minutes?: number) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function hasOpenSession(record?: AttendanceRecord | null) {
  return !!record?.sessions?.some((session) => session.in && !session.out);
}

export function AttendanceSelfPunch() {
  const qc = useQueryClient();
  const selfContext = useSelfContext(true);
  const punchContext = usePunchContext(true);
  const maxGps = punchContext.data?.maxGpsAccuracyMeters ?? 100;
  const geo = useAttendanceGeolocation(maxGps, true);
  const [punchMode, setPunchMode] = useState<'in' | 'out' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const punchMutation = useMutation({
    mutationFn: async ({ mode, selfie }: { mode: 'in' | 'out'; selfie: Blob }) => {
      if (!geo.coords) throw new Error('GPS location not available yet');
      const payload = {
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        accuracy: geo.coords.accuracy,
        selfie,
      };
      return mode === 'in' ? selfPunchInApi(payload) : selfPunchOutApi(payload);
    },
    onSuccess: () => {
      setPunchMode(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ['attendance', 'self-context'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Punch failed'),
  });

  if (selfContext.isLoading) {
    return <p className="text-sm text-slate-500">Loading your punch profile…</p>;
  }

  if (!selfContext.data?.linked) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Punch</h1>
        <Card>
          <h2 className="font-semibold text-slate-800">Employee profile not linked</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your CRM account is not linked to an employee record yet. Ask HR to link your profile under
            Attendance → Employees, or ensure your phone number matches your employee record.
          </p>
        </Card>
      </div>
    );
  }

  const record = selfContext.data.record;
  const open = hasOpenSession(record);
  const employee = selfContext.data.employee;

  const stats = useMemo(
    () => [
      { label: 'Worked today', value: formatMinutes(record?.workedMinutes) },
      { label: 'Sessions', value: String(record?.sessions?.length ?? 0) },
      { label: 'Current', value: open ? 'In' : 'Out' },
    ],
    [open, record?.sessions?.length, record?.workedMinutes]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Punch</h1>
        <p className="mt-1 text-sm text-slate-500">
          Check in or out with a live selfie and location check — same flow as the mobile app.
        </p>
      </div>

      <Card className={open ? 'border-emerald-200 bg-emerald-50/60' : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{employee?.fullName}</p>
            <p className="text-sm text-slate-500">
              {employee?.employeeCode} • {selfContext.data.workDate}
            </p>
            {record?.status ? (
              <div className="mt-3">
                <AttendanceStatusBadge status={record.status} />
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl bg-white/80 px-4 py-3">
              <p className="text-xl font-bold text-slate-900">{item.value}</p>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <GpsStatusBanner coords={geo.coords} error={geo.error} maxGpsAccuracyMeters={maxGps} />

      <Card>
        <h2 className="font-semibold text-slate-800">Ready to punch?</h2>
        <p className="mt-1 text-sm text-slate-500">
          {open
            ? 'You are checked in. Tap punch out when you leave.'
            : 'Tap punch in when you arrive — camera and GPS run together in one step.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={open || punchMode !== null} onClick={() => setPunchMode('in')}>
            Punch in
          </Button>
          <Button
            variant="secondary"
            disabled={!open || punchMode !== null}
            onClick={() => setPunchMode('out')}
          >
            Punch out
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </Card>

      <QuickPunchModal
        open={punchMode !== null}
        mode={punchMode ?? 'in'}
        employeeName={employee?.fullName ?? 'Employee'}
        employeeCode={employee?.employeeCode ?? ''}
        referencePhotoUrl={employee?.referencePhotoUrl}
        coords={geo.coords}
        accuracyLabel={geo.accuracyLabel}
        poorAccuracy={geo.poorAccuracy}
        submitting={punchMutation.isPending}
        error={error}
        onClose={() => {
          setPunchMode(null);
          setError(null);
        }}
        onConfirm={(selfie) => {
          if (!punchMode) return;
          punchMutation.mutate({ mode: punchMode, selfie });
        }}
      />
    </div>
  );
}
