import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCamera, FiTablet } from 'react-icons/fi';
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

  const [face, setFace] = useState({
    faceRecognitionEnabled: false,
    faceMatchThreshold: '0.6',
    faceMarginThreshold: '0.04',
    faceAntiSpoofMode: 'record' as 'off' | 'record' | 'block',
    faceAntiSpoofThreshold: '0.3',
    faceLivenessThreshold: '0',
  });

  const [employer, setEmployer] = useState({
    employerName: '',
    employerAddressLine1: '',
    employerAddressLine2: '',
    employerPfCode: '',
    employerEsiCode: '',
    employerLogoUrl: '',
  });

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
      setFace({
        faceRecognitionEnabled: settings.faceRecognitionEnabled ?? false,
        faceMatchThreshold: String(settings.faceMatchThreshold ?? 0.6),
        faceMarginThreshold: String(settings.faceMarginThreshold ?? 0.04),
        faceAntiSpoofMode: settings.faceAntiSpoofMode ?? 'record',
        faceAntiSpoofThreshold: String(settings.faceAntiSpoofThreshold ?? 0.3),
        faceLivenessThreshold: String(settings.faceLivenessThreshold ?? 0),
      });
      setEmployer({
        employerName: settings.employerName ?? '',
        employerAddressLine1: settings.employerAddressLine1 ?? '',
        employerAddressLine2: settings.employerAddressLine2 ?? '',
        employerPfCode: settings.employerPfCode ?? '',
        employerEsiCode: settings.employerEsiCode ?? '',
        employerLogoUrl: settings.employerLogoUrl ?? '',
      });
    }
  }, [settings]);

  const saveEmployer = async () => {
    await updateSettings.mutateAsync(employer);
  };

  const saveFace = async () => {
    await updateSettings.mutateAsync({
      faceRecognitionEnabled: face.faceRecognitionEnabled,
      faceMatchThreshold: parseFloat(face.faceMatchThreshold) || 0.6,
      faceMarginThreshold: parseFloat(face.faceMarginThreshold) || 0,
      faceAntiSpoofMode: face.faceAntiSpoofMode,
      faceAntiSpoofThreshold: parseFloat(face.faceAntiSpoofThreshold) || 0,
      faceLivenessThreshold: parseFloat(face.faceLivenessThreshold) || 0,
    });
  };

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/attendance/kiosk-devices')}>
              <FiTablet className="size-4" /> Kiosk devices
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/attendance/face-kiosk')}>
              <FiCamera className="size-4" /> Face kiosk (trial)
            </Button>
          </div>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">Face recognition at kiosks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lets a kiosk identify an enrolled employee by camera instead of asking them to
              tap their name. It only selects them — they still confirm the punch.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard/attendance/face-kiosk')}>
            Test rig
          </Button>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={face.faceRecognitionEnabled}
            onChange={(e) => setFace({ ...face, faceRecognitionEnabled: e.target.checked })}
            disabled={!canManageSitesShifts}
          />
          <span>
            Enable face recognition
            <span className="mt-0.5 block text-xs text-slate-400">
              Off by default. Enrol faces under People → Face enrolment first, or kiosks will
              fall straight through to the name grid.
            </span>
          </span>
        </label>

        <div className="mt-4 grid max-w-2xl gap-5 sm:grid-cols-2">
          <div>
            <Input
              label="Match threshold"
              type="number"
              step="0.01"
              value={face.faceMatchThreshold}
              onChange={(e) => setFace({ ...face, faceMatchThreshold: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              Similarity needed to name someone, 0–1. Higher is stricter: fewer wrong
              identifications, more people falling back to tapping their name.
            </p>
          </div>
          <div>
            <Input
              label="Margin threshold"
              type="number"
              step="0.01"
              value={face.faceMarginThreshold}
              onChange={(e) => setFace({ ...face, faceMarginThreshold: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              How far ahead of the next-closest person a match must be. Guards against
              lookalikes and relatives resolving to a coin flip.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Anti-spoof</label>
            <select
              value={face.faceAntiSpoofMode}
              onChange={(e) =>
                setFace({ ...face, faceAntiSpoofMode: e.target.value as 'off' | 'record' | 'block' })
              }
              disabled={!canManageSitesShifts}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="off">Off — ignore the score</option>
              <option value="record">Record only — store it, never block</option>
              <option value="block">Block — refuse to identify below the threshold</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Only choose Block once the test rig shows live faces and photos land in clearly
              separate ranges on your own cameras. A false positive stops a real employee
              punching, which costs more than a rare spoof.
            </p>
          </div>
          <div>
            <Input
              label="Anti-spoof threshold"
              type="number"
              step="0.01"
              value={face.faceAntiSpoofThreshold}
              onChange={(e) => setFace({ ...face, faceAntiSpoofThreshold: e.target.value })}
              disabled={!canManageSitesShifts || face.faceAntiSpoofMode !== 'block'}
            />
            <p className="mt-1 text-xs text-slate-400">
              Used only in Block mode. The test rig suggests a value once you record both a
              live face and a photo.
            </p>
          </div>
          <div>
            <Input
              label="Liveness threshold"
              type="number"
              step="0.01"
              value={face.faceLivenessThreshold}
              onChange={(e) => setFace({ ...face, faceLivenessThreshold: e.target.value })}
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              A second, independent spoof signal. Leave at 0 to record it without gating.
              Raise it only if the test rig shows liveness separates live faces from photos
              on your cameras — it may not, and the score is recorded either way.
            </p>
          </div>
        </div>

        {canManageSitesShifts && (
          <Button className="mt-5" onClick={saveFace} loading={updateSettings.isPending}>
            Save face settings
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

      <Card>
        <h2 className="font-semibold text-slate-800">Employer details (payslips)</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Printed as the letterhead on every payslip. Blank fields are left off the slip rather
          than printed empty.
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Company name"
              value={employer.employerName}
              onChange={(e) => setEmployer({ ...employer, employerName: e.target.value })}
              placeholder="e.g. Quality Scientific & Mechanical Works"
              disabled={!canManageSitesShifts}
            />
          </div>
          <Input
            label="Address line 1"
            value={employer.employerAddressLine1}
            onChange={(e) => setEmployer({ ...employer, employerAddressLine1: e.target.value })}
            placeholder="Plot No. 84, HSIDC Industrial Area"
            disabled={!canManageSitesShifts}
          />
          <Input
            label="Address line 2"
            value={employer.employerAddressLine2}
            onChange={(e) => setEmployer({ ...employer, employerAddressLine2: e.target.value })}
            placeholder="Ambala Cantt, Haryana 133001"
            disabled={!canManageSitesShifts}
          />
          <Input
            label="PF establishment code"
            value={employer.employerPfCode}
            onChange={(e) => setEmployer({ ...employer, employerPfCode: e.target.value })}
            disabled={!canManageSitesShifts}
          />
          <Input
            label="ESI establishment code"
            value={employer.employerEsiCode}
            onChange={(e) => setEmployer({ ...employer, employerEsiCode: e.target.value })}
            disabled={!canManageSitesShifts}
          />
          <div className="sm:col-span-2">
            <Input
              label="Logo URL"
              value={employer.employerLogoUrl}
              onChange={(e) => setEmployer({ ...employer, employerLogoUrl: e.target.value })}
              placeholder="https://..."
              disabled={!canManageSitesShifts}
            />
            <p className="mt-1 text-xs text-slate-400">
              Must be publicly reachable — the PDF renderer fetches it at generation time.
            </p>
          </div>
        </div>
        {canManageSitesShifts && (
          <Button className="mt-5" onClick={saveEmployer} loading={updateSettings.isPending}>
            Save employer details
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
