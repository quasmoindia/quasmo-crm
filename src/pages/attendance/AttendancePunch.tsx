import { useEffect, useState } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';
import {
  myTodayApi,
  punchInApi,
  punchOutApi,
  punchPreviewApi,
  requestEmployeeOtpApi,
  setPunchToken,
  verifyEmployeeOtpApi,
  getPunchToken,
  clearPunchToken,
  usePunchContext,
  usePunchDirectory,
} from '../../api/attendance';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SelfieCapture } from '../../components/attendance/SelfieCapture';
import { GeofenceWarningBanner } from '../../components/attendance/GeofenceWarningBanner';
import { GpsStatusBanner } from '../../components/attendance/GpsStatusBanner';
import { PunchConfirmModal } from '../../components/attendance/PunchConfirmModal';
import { EmployeePhotoGrid, shiftTimingLabel } from '../../components/attendance/EmployeePhotoGrid';
import { KioskToolbar } from '../../components/attendance/KioskToolbar';
import { useAttendanceGeolocation } from '../../hooks/useAttendanceGeolocation';
import { useKioskMode } from '../../hooks/useKioskMode';
import type { AttendanceRecord, GeofencePreview, PunchDirectoryEntry } from '../../types/attendance';

type Step = 'login' | 'otp' | 'home' | 'preview' | 'selfie' | 'done';
type LoginMode = 'photo' | 'manual';

export function AttendancePunch() {
  const { data: punchContext } = usePunchContext(true);
  const maxGps = punchContext?.maxGpsAccuracyMeters ?? 100;
  const { coords, error: geoError } = useAttendanceGeolocation(maxGps, true);
  const { locked } = useKioskMode();
  const [step, setStep] = useState<Step>(() => (getPunchToken() ? 'home' : 'login'));
  const [loginMode, setLoginMode] = useState<LoginMode>('photo');
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PunchDirectoryEntry | null>(null);
  const { data: directoryData, isLoading: loadingDirectory } = usePunchDirectory(
    { search: directoryQuery, shiftId: shiftFilter || undefined },
    step === 'login' && loginMode === 'photo'
  );
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [preview, setPreview] = useState<GeofencePreview | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadToday = async () => {
    const res = await myTodayApi();
    setTodayRecord(res.record);
  };

  useEffect(() => {
    if (step === 'home' && getPunchToken()) {
      loadToday().catch(() => {
        clearPunchToken();
        setStep('login');
      });
    }
  }, [step]);

  const requestOtp = async (code?: string) => {
    const codeVal = (code ?? employeeCode).trim();
    const phoneVal = phone.trim();
    if (!codeVal && !phoneVal) return;
    setLoading(true);
    try {
      await requestEmployeeOtpApi({
        employeeCode: codeVal || undefined,
        phone: phoneVal || undefined,
      });
      if (codeVal) setEmployeeCode(codeVal);
      setStep('otp');
      setMessage('OTP sent. Use 0000 in dev.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectEmployeeFromPhoto = async (emp: PunchDirectoryEntry) => {
    setSelectedEmployee(emp);
    setEmployeeCode(emp.employeeCode);
    setPhone('');
    setMessage('');
    await requestOtp(emp.employeeCode);
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const res = await verifyEmployeeOtpApi({
        employeeCode: employeeCode.trim() || undefined,
        phone: phone.trim() || undefined,
        otp,
      });
      setPunchToken(res.token);
      setEmployeeName(res.employee.fullName);
      setStep('home');
      setMessage('');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startPreview = async (kind: 'in' | 'out') => {
    if (!coords) return;
    setAction(kind);
    setLoading(true);
    try {
      const p = await punchPreviewApi(coords);
      setPreview(p);
      if (p.insideGeofence) setStep('selfie');
      else setConfirmOpen(true);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitPunch = async () => {
    if (!coords || !selfie) return;
    setLoading(true);
    try {
      const payload = { ...coords, selfie };
      if (action === 'in') await punchInApi(payload);
      else await punchOutApi(payload);
      setMessage(`${action === 'in' ? 'Punch in' : 'Punch out'} recorded`);
      setStep('done');
      await loadToday();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    clearPunchToken();
    setStep('login');
    setSelectedEmployee(null);
    setEmployeeCode('');
    setPhone('');
    setOtp('');
    setSelfie(null);
    setPreview(null);
  };

  const canPunchIn = !todayRecord?.punchIn;
  const canPunchOut = todayRecord?.punchIn && !todayRecord?.punchOut;
  const directory = directoryData?.data ?? [];
  const punchShifts = punchContext?.shifts ?? [];

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-4 sm:p-6">
      <div className={loginMode === 'photo' && step === 'login' ? 'mx-auto max-w-7xl' : 'mx-auto max-w-md'}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Employee punch</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              {step === 'login' && loginMode === 'photo'
                ? 'Tap your photo to sign in'
                : 'OTP login · GPS · selfie required'}
            </p>
          </div>
          <KioskToolbar />
        </div>

        {step === 'login' && loginMode === 'photo' && (
          <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setDirectoryQuery(directorySearch);
                      }
                    }}
                    placeholder="Search name or code…"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#305dff] focus:outline-none focus:ring-2 focus:ring-[#305dff]/20"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 py-3 text-base"
                  onClick={() => setDirectoryQuery(directorySearch)}
                >
                  Search
                </Button>
              </div>
              {punchShifts.length > 0 && (
                <label className="block text-sm font-medium text-slate-700">
                  Filter by shift
                  <select
                    className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-base text-slate-900 focus:border-[#305dff] focus:outline-none focus:ring-2 focus:ring-[#305dff]/20 sm:max-w-xs"
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                  >
                    <option value="">All shifts</option>
                    {punchShifts.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({shiftTimingLabel(s) ?? `${s.startTime} – ${s.endTime}`})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <EmployeePhotoGrid
              employees={directory}
              loading={loadingDirectory}
              size="xlarge"
              emptyMessage="No employees found. Ask HR to add photos."
              onSelect={(emp) => void selectEmployeeFromPhoto(emp)}
            />

            {!locked && (
              <button
                type="button"
                onClick={() => setLoginMode('manual')}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <FiUser className="size-4" />
                Enter employee code instead
              </button>
            )}
          </div>
        )}

        {step === 'login' && loginMode === 'manual' && (
          <div className="rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <Input label="Employee code" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP-0001" />
            <p className="text-center text-xs text-slate-400">or</p>
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
            <Button fullWidth onClick={() => void requestOtp()} loading={loading} disabled={!employeeCode.trim() && !phone.trim()}>
              Send OTP
            </Button>
            {!locked && (
              <Button fullWidth variant="outline" onClick={() => setLoginMode('photo')}>
                Show employee photos
              </Button>
            )}
          </div>
        )}

        {step === 'otp' && (
          <div className="rounded-2xl bg-white p-6 shadow-lg space-y-4">
            {selectedEmployee && (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#305dff]/20 bg-[#305dff]/5 p-4">
                {selectedEmployee.referencePhotoUrl ? (
                  <img
                    src={selectedEmployee.referencePhotoUrl}
                    alt={selectedEmployee.fullName}
                    className="h-32 w-32 rounded-2xl object-cover shadow-md sm:h-40 sm:w-40"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-200 text-3xl font-bold text-slate-500 sm:h-40 sm:w-40">
                    {selectedEmployee.fullName.slice(0, 1)}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">{selectedEmployee.fullName}</p>
                  <p className="text-sm text-slate-500">{selectedEmployee.employeeCode}</p>
                  {selectedEmployee.shift ? (
                    <p className="mt-1 text-sm font-medium text-[#305dff]">
                      {selectedEmployee.shift.name} · {shiftTimingLabel(selectedEmployee.shift)}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            <Input
              label="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="0000"
              className="text-lg"
            />
            <Button fullWidth className="py-3 text-base" onClick={() => void verifyOtp()} loading={loading}>
              Verify & continue
            </Button>
            {!locked && (
              <Button fullWidth variant="outline" onClick={() => { setStep('login'); setOtp(''); setSelectedEmployee(null); }}>
                Back
              </Button>
            )}
          </div>
        )}

        {step === 'home' && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-xl font-semibold text-slate-800">Hello, {employeeName}</p>
            <div className="mt-3">
              <GpsStatusBanner coords={coords} maxGpsAccuracyMeters={maxGps} error={geoError} />
            </div>
            {(punchContext?.workSites?.length ?? 0) === 0 && (
              <p className="mt-2 text-xs text-amber-800">No work sites configured yet. Contact HR.</p>
            )}
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-base">
              <p>Today: {todayRecord?.workDate ?? new Date().toISOString().slice(0, 10)}</p>
              <p>In: {todayRecord?.punchIn ? new Date(todayRecord.punchIn.at).toLocaleTimeString() : '—'}</p>
              <p>Out: {todayRecord?.punchOut ? new Date(todayRecord.punchOut.at).toLocaleTimeString() : '—'}</p>
            </div>
            <div className="mt-4 grid gap-3">
              {canPunchIn && (
                <Button fullWidth className="py-4 text-lg" disabled={!coords} loading={loading} onClick={() => startPreview('in')}>
                  Punch in
                </Button>
              )}
              {canPunchOut && (
                <Button fullWidth className="py-4 text-lg" disabled={!coords} loading={loading} onClick={() => startPreview('out')}>
                  Punch out
                </Button>
              )}
              {!canPunchIn && !canPunchOut && (
                <p className="text-center text-base text-slate-500">Today&apos;s session is complete.</p>
              )}
            </div>
            {!locked && (
              <Button fullWidth variant="outline" className="mt-4" onClick={resetToLogin}>
                Log out
              </Button>
            )}
          </div>
        )}

        {step === 'selfie' && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <GeofenceWarningBanner preview={preview} />
            <SelfieCapture className="mt-4" onCapture={setSelfie} />
            <Button className="mt-4 w-full py-4 text-lg" disabled={!selfie} loading={loading} onClick={submitPunch}>
              Confirm {action === 'in' ? 'punch in' : 'punch out'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <p className="text-xl font-semibold text-emerald-700">{message}</p>
            <Button
              className="mt-6 w-full py-4 text-lg"
              onClick={() => {
                if (locked) {
                  resetToLogin();
                } else {
                  setStep('home');
                  setSelfie(null);
                  setPreview(null);
                }
              }}
            >
              {locked ? 'Next employee' : 'Done'}
            </Button>
          </div>
        )}

        {message && !['done', 'home'].includes(step) && (
          <p className="mt-4 text-center text-sm text-rose-600">{message}</p>
        )}
      </div>

      <PunchConfirmModal
        open={confirmOpen}
        title="Outside work site"
        message={preview?.warning ?? 'You are outside the geofence. Continue anyway?'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); setStep('selfie'); }}
      />
    </div>
  );
}
