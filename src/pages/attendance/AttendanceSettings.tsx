import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTablet } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import {
  useAttendanceSettings,
  useUpdateAttendanceSettings,
} from '../../api/attendance';
import { WorkSitesSettingsCard } from '../../components/attendance/WorkSitesSettingsCard';
import { ShiftsSettingsCard } from '../../components/attendance/ShiftsSettingsCard';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';

export function AttendanceSettings() {
  const navigate = useNavigate();
  const { canManageSitesShifts, isAdmin, canAccessNav } = useAttendancePermissions();
  const { data: settings } = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();

  const [policy, setPolicy] = useState({
    maxGpsAccuracyMeters: '100',
    otpExpiryMinutes: '10',
    allowOutsideGeofence: true,
    standardHoursPerDay: '8',
    overtimeEnabled: true,
    overtimeMultiplier: '1.5',
    pfEnabled: false,
    pfEmployeePercent: '12',
    pfWageCeiling: '15000',
    esiEnabled: false,
    esiEmployeePercent: '0.75',
    esiGrossCeiling: '21000',
    ptEnabled: false,
    ptAmount: '200',
    weeklyOffDays: [0] as number[],
    paidWeeklyOff: true,
  });

  useEffect(() => {
    if (settings) {
      setPolicy({
        maxGpsAccuracyMeters: String(settings.maxGpsAccuracyMeters),
        otpExpiryMinutes: String(settings.otpExpiryMinutes),
        allowOutsideGeofence: settings.allowOutsideGeofence,
        standardHoursPerDay: String(settings.standardHoursPerDay ?? 8),
        overtimeEnabled: settings.overtimeEnabled ?? true,
        overtimeMultiplier: String(settings.overtimeMultiplier ?? 1.5),
        pfEnabled: settings.pfEnabled ?? false,
        pfEmployeePercent: String(settings.pfEmployeePercent ?? 12),
        pfWageCeiling: String(settings.pfWageCeiling ?? 15000),
        esiEnabled: settings.esiEnabled ?? false,
        esiEmployeePercent: String(settings.esiEmployeePercent ?? 0.75),
        esiGrossCeiling: String(settings.esiGrossCeiling ?? 21000),
        ptEnabled: settings.ptEnabled ?? false,
        ptAmount: String(settings.ptAmount ?? 200),
        weeklyOffDays: settings.weeklyOffDays ?? [0],
        paidWeeklyOff: settings.paidWeeklyOff ?? true,
      });
    }
  }, [settings]);

  const savePolicy = async () => {
    await updateSettings.mutateAsync({
      maxGpsAccuracyMeters: parseInt(policy.maxGpsAccuracyMeters, 10),
      otpExpiryMinutes: parseInt(policy.otpExpiryMinutes, 10),
      allowOutsideGeofence: policy.allowOutsideGeofence,
      standardHoursPerDay: parseFloat(policy.standardHoursPerDay) || 8,
      overtimeEnabled: policy.overtimeEnabled,
      overtimeMultiplier: parseFloat(policy.overtimeMultiplier) || 1.5,
      pfEnabled: policy.pfEnabled,
      pfEmployeePercent: parseFloat(policy.pfEmployeePercent) || 0,
      pfWageCeiling: parseFloat(policy.pfWageCeiling) || 0,
      esiEnabled: policy.esiEnabled,
      esiEmployeePercent: parseFloat(policy.esiEmployeePercent) || 0,
      esiGrossCeiling: parseFloat(policy.esiGrossCeiling) || 0,
      ptEnabled: policy.ptEnabled,
      ptAmount: parseFloat(policy.ptAmount) || 0,
      weeklyOffDays: policy.weeklyOffDays,
      paidWeeklyOff: policy.paidWeeklyOff,
    });
  };

  const toggleWeeklyOff = (day: number) => {
    setPolicy((p) => ({
      ...p,
      weeklyOffDays: p.weeklyOffDays.includes(day)
        ? p.weeklyOffDays.filter((d) => d !== day)
        : [...p.weeklyOffDays, day].sort(),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Attendance settings</h1>
        {canAccessNav('kioskDevices') && (
          <Button variant="outline" onClick={() => navigate('/dashboard/attendance/kiosk-devices')}>
            <FiTablet className="size-4" /> Kiosk devices
          </Button>
        )}
      </div>

      <Card>
        <h2 className="font-semibold text-slate-800">Policies</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Rules applied automatically every time someone punches in or out.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 max-w-2xl">
          <div>
            <Input
              label="Max GPS accuracy (m)"
              value={policy.maxGpsAccuracyMeters}
              onChange={(e) => setPolicy({ ...policy, maxGpsAccuracyMeters: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              If the phone's location reading is less precise than this, the punch is marked as
              outside the work site (the GPS isn't trustworthy enough to confirm they're on site).
            </p>
          </div>
          <div>
            <Input
              label="OTP expiry (minutes)"
              value={policy.otpExpiryMinutes}
              onChange={(e) => setPolicy({ ...policy, otpExpiryMinutes: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              How long a one-time login code stays valid on the phone OTP punch page.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={policy.allowOutsideGeofence}
                onChange={(e) => setPolicy({ ...policy, allowOutsideGeofence: e.target.checked })}
                disabled={!canManageSitesShifts}
              />
              <span>
                Allow punch outside geofence (with warning)
                <span className="mt-0.5 block text-xs text-slate-400">
                  On: employees can still punch when away from the site, but it's flagged. Off:
                  punches outside the site are blocked.
                </span>
              </span>
            </label>
          </div>
        </div>
        {canManageSitesShifts && (
          <Button className="mt-5" onClick={savePolicy} loading={updateSettings.isPending}>
            Save policies
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800">Overtime &amp; payroll</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Used to split each day's worked hours into regular and overtime for payout.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 max-w-2xl">
          <div>
            <Input
              label="Standard hours / day"
              type="number"
              value={policy.standardHoursPerDay}
              onChange={(e) => setPolicy({ ...policy, standardHoursPerDay: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              Hours worked beyond this in a single day are counted as overtime. Also used to derive
              the hourly rate for daily/monthly-paid staff (daily rate ÷ standard hours).
            </p>
          </div>
          <div>
            <Input
              label="Overtime multiplier"
              type="number"
              value={policy.overtimeMultiplier}
              onChange={(e) => setPolicy({ ...policy, overtimeMultiplier: e.target.value })}
              disabled={!canManageSitesShifts || !policy.overtimeEnabled}
            />
            <p className="mt-1 text-xs text-slate-400">
              Overtime hours are paid at this rate (e.g. 1.5 = 1.5×). India's Factories Act mandates
              2× for covered factory workers — set 2 to comply.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={policy.overtimeEnabled}
                onChange={(e) => setPolicy({ ...policy, overtimeEnabled: e.target.checked })}
                disabled={!canManageSitesShifts}
              />
              <span>
                Enable overtime
                <span className="mt-0.5 block text-xs text-slate-400">
                  On: extra hours are paid at the multiplier. Off: all worked hours are paid at the
                  normal rate.
                </span>
              </span>
            </label>
          </div>
        </div>
        {canManageSitesShifts && (
          <Button className="mt-5" onClick={savePolicy} loading={updateSettings.isPending}>
            Save overtime settings
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800">Weekly off</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Days marked as weekly off are paid for monthly-salaried staff (so an unworked off-day
          isn't deducted). Daily/hourly staff are paid only for days worked.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, day) => {
            const active = policy.weeklyOffDays.includes(day);
            return (
              <button
                key={label}
                type="button"
                disabled={!canManageSitesShifts}
                onClick={() => toggleWeeklyOff(day)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-[#305dff] bg-[#305dff] text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={policy.paidWeeklyOff}
            onChange={(e) => setPolicy({ ...policy, paidWeeklyOff: e.target.checked })}
            disabled={!canManageSitesShifts}
          />
          <span>
            Pay weekly offs for monthly staff
            <span className="mt-0.5 block text-xs text-slate-400">
              Off: monthly staff are also paid strictly on worked/leave days.
            </span>
          </span>
        </label>
        {canManageSitesShifts && (
          <Button className="mt-5" onClick={savePolicy} loading={updateSettings.isPending}>
            Save weekly off
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800">Statutory deductions (India)</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Applied to each employee's payslip (unless exempted on their profile). Leave a section off
          if it doesn't apply to your establishment.
        </p>
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-lg border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={policy.pfEnabled}
                onChange={(e) => setPolicy({ ...policy, pfEnabled: e.target.checked })}
                disabled={!canManageSitesShifts}
              />
              Provident Fund (EPF)
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Employee contribution on basic (regular) wages. Statutory: 12% on wages up to ₹15,000.
            </p>
            {policy.pfEnabled && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input label="Employee %" type="number" value={policy.pfEmployeePercent} onChange={(e) => setPolicy({ ...policy, pfEmployeePercent: e.target.value })} disabled={!canManageSitesShifts} />
                <Input label="Wage ceiling (₹)" type="number" value={policy.pfWageCeiling} onChange={(e) => setPolicy({ ...policy, pfWageCeiling: e.target.value })} disabled={!canManageSitesShifts} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={policy.esiEnabled}
                onChange={(e) => setPolicy({ ...policy, esiEnabled: e.target.checked })}
                disabled={!canManageSitesShifts}
              />
              ESI
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Employee contribution on gross, only when gross ≤ ceiling. Statutory: 0.75% up to ₹21,000.
            </p>
            {policy.esiEnabled && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input label="Employee %" type="number" value={policy.esiEmployeePercent} onChange={(e) => setPolicy({ ...policy, esiEmployeePercent: e.target.value })} disabled={!canManageSitesShifts} />
                <Input label="Gross ceiling (₹)" type="number" value={policy.esiGrossCeiling} onChange={(e) => setPolicy({ ...policy, esiGrossCeiling: e.target.value })} disabled={!canManageSitesShifts} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={policy.ptEnabled}
                onChange={(e) => setPolicy({ ...policy, ptEnabled: e.target.checked })}
                disabled={!canManageSitesShifts}
              />
              Professional Tax (PT)
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Flat monthly amount deducted (varies by state, e.g. ₹200). Set per your state's slab.
            </p>
            {policy.ptEnabled && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input label="Monthly amount (₹)" type="number" value={policy.ptAmount} onChange={(e) => setPolicy({ ...policy, ptAmount: e.target.value })} disabled={!canManageSitesShifts} />
              </div>
            )}
          </div>
        </div>
        {canManageSitesShifts && (
          <Button className="mt-5" onClick={savePolicy} loading={updateSettings.isPending}>
            Save deduction settings
          </Button>
        )}
      </Card>

      <WorkSitesSettingsCard
        canEdit={canManageSitesShifts}
        isAdmin={isAdmin}
        maxGpsAccuracyMeters={parseInt(policy.maxGpsAccuracyMeters, 10) || settings?.maxGpsAccuracyMeters || 100}
      />

      <ShiftsSettingsCard canEdit={canManageSitesShifts} isAdmin={isAdmin} />
    </div>
  );
}
