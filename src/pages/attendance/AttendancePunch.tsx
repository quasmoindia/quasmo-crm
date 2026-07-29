import { useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiClock, FiLogIn, FiLogOut, FiSearch, FiUser } from 'react-icons/fi';
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
  getKioskDeviceToken,
  clearKioskDeviceToken,
  isKioskUnauthorizedError,
  useKioskDirectory,
  kioskPunchInApi,
  kioskPunchOutApi,
  kioskPunchPreviewApi,
} from '../../api/attendance';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SelfieCapture } from '../../components/attendance/SelfieCapture';
import type { SelfieCaptureHandle } from '../../components/attendance/SelfieCapture';
import { GeofenceWarningBanner } from '../../components/attendance/GeofenceWarningBanner';
import { GpsStatusBanner } from '../../components/attendance/GpsStatusBanner';
import { PunchConfirmModal } from '../../components/attendance/PunchConfirmModal';
import { EmployeePhotoGrid, shiftTimingLabel } from '../../components/attendance/EmployeePhotoGrid';
import { KioskFaceScanner, type FaceMatchPayload } from '../../components/attendance/KioskFaceScanner';
import { KioskToolbar } from '../../components/attendance/KioskToolbar';
import { useAttendanceGeolocation } from '../../hooks/useAttendanceGeolocation';
import { useKioskMode } from '../../hooks/useKioskMode';
import type {
  AttendanceRecord,
  GeofencePreview,
  KioskTodayStatus,
  PunchDirectoryEntry,
} from '../../types/attendance';

type Step = 'login' | 'otp' | 'home' | 'preview' | 'selfie' | 'done';
type LoginMode = 'photo' | 'manual';

function unpairAndRedirect() {
  clearKioskDeviceToken();
  window.location.href = '/attendance/kiosk-setup';
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

const AUTO_RETURN_SECONDS = 4;

export function AttendancePunch() {
  const isKioskDevice = !!getKioskDeviceToken();
  const { data: punchContext } = usePunchContext(true);
  const maxGps = punchContext?.maxGpsAccuracyMeters ?? 100;
  const { coords, error: geoError } = useAttendanceGeolocation(maxGps, true);
  const { locked } = useKioskMode();
  const [step, setStep] = useState<Step>(() => (!isKioskDevice && getPunchToken() ? 'home' : 'login'));
  const [loginMode, setLoginMode] = useState<LoginMode>('photo');
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PunchDirectoryEntry | null>(null);
  // On a face kiosk the camera leads and the name grid is one button away. On a simple
  // kiosk the grid is all there is — no face code runs and no models are downloaded.
  const [showDirectoryOnFaceKiosk, setShowDirectoryOnFaceKiosk] = useState(false);
  const [faceMatch, setFaceMatch] = useState<FaceMatchPayload | null>(null);
  const { data: directoryData, isLoading: loadingDirectory } = usePunchDirectory(
    { search: directoryQuery, shiftId: shiftFilter || undefined },
    !isKioskDevice && step === 'login' && loginMode === 'photo'
  );
  const {
    data: kioskDirectoryData,
    isLoading: loadingKioskDirectory,
    error: kioskDirectoryError,
    refetch: refetchKioskDirectory,
  } = useKioskDirectory(isKioskDevice && step === 'login');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [kioskToday, setKioskToday] = useState<KioskTodayStatus | null>(null);
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [preview, setPreview] = useState<GeofencePreview | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autoReturnIn, setAutoReturnIn] = useState<number | null>(null);
  const resetToLoginRef = useRef<() => void>(() => {});
  const selfieCaptureRef = useRef<SelfieCaptureHandle>(null);

  const loadToday = async () => {
    const res = await myTodayApi();
    setTodayRecord(res.record);
  };

  useEffect(() => {
    if (isKioskDevice) return;
    if (step === 'home' && getPunchToken()) {
      loadToday().catch(() => {
        clearPunchToken();
        setStep('login');
      });
    }
  }, [step, isKioskDevice]);

  useEffect(() => {
    if (isKioskDevice && isKioskUnauthorizedError(kioskDirectoryError)) {
      unpairAndRedirect();
    }
  }, [isKioskDevice, kioskDirectoryError]);

  // The directory query has a staleTime, so simply becoming "enabled" again
  // when we return to the photo grid isn't enough to guarantee a refetch —
  // force one every time so punch statuses (in/out) are never stale.
  useEffect(() => {
    if (isKioskDevice && step === 'login') {
      void refetchKioskDirectory();
    }
  }, [isKioskDevice, step, refetchKioskDirectory]);

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

  const selectEmployeeFromPhoto = async (emp: PunchDirectoryEntry, match?: FaceMatchPayload) => {
    // Passed explicitly rather than read from state: tapping a name is a manual
    // identification and must not inherit a match left over from the camera.
    setFaceMatch(match ?? null);
    setSelectedEmployee(emp);
    setEmployeeCode(emp.employeeCode);
    setPhone('');
    setMessage('');
    if (isKioskDevice) {
      const today = (emp as { today?: KioskTodayStatus }).today ?? null;
      setKioskToday(today);
      setEmployeeName(emp.fullName);
      setStep('home');
      return;
    }
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

  // Kiosk devices capture + submit in one tap: the camera is already live on
  // the home screen, so tapping Punch In/Out grabs the current frame and
  // submits immediately — no separate "review photo" screen. The only time
  // this pauses for a second tap is the rare outside-geofence confirmation.
  const captureAndSubmit = async (kind: 'in' | 'out') => {
    const blob = await selfieCaptureRef.current?.capture();
    if (!blob) {
      setMessage('Could not capture photo. Make sure the camera is visible and try again.');
      setLoading(false);
      return;
    }
    await submitPunch(blob, kind);
  };

  const handleKioskPunch = async (kind: 'in' | 'out') => {
    if (!coords) return;
    setAction(kind);
    setLoading(true);
    try {
      const p = await kioskPunchPreviewApi({ employeeId: selectedEmployee!._id, ...coords });
      setPreview(p);
      if (p.insideGeofence) {
        await captureAndSubmit(kind);
      } else {
        setConfirmOpen(true);
        setLoading(false);
      }
    } catch (e) {
      if (isKioskUnauthorizedError(e)) {
        unpairAndRedirect();
        return;
      }
      setMessage((e as Error).message);
      setLoading(false);
    }
  };

  const submitPunch = async (selfieOverride?: Blob, kindOverride?: 'in' | 'out') => {
    const selfieToSubmit = selfieOverride ?? selfie;
    const kind = kindOverride ?? action;
    if (!coords || !selfieToSubmit) return;
    setLoading(true);
    try {
      if (isKioskDevice) {
        const payload = {
          employeeId: selectedEmployee!._id,
          ...coords,
          selfie: selfieToSubmit,
          faceMatch: faceMatch ?? undefined,
        };
        if (kind === 'in') await kioskPunchInApi(payload);
        else await kioskPunchOutApi(payload);
      } else {
        const payload = { ...coords, selfie: selfieToSubmit };
        if (kind === 'in') await punchInApi(payload);
        else await punchOutApi(payload);
      }
      setMessage(`${kind === 'in' ? 'Punch in' : 'Punch out'} recorded`);
      setAction(kind);
      setStep('done');
      if (isKioskDevice) {
        vibrate(kind === 'in' ? 150 : [100, 80, 100]);
        setKioskToday({
          open: kind === 'in',
          workedMinutes: kioskToday?.workedMinutes ?? 0,
          firstInAt: kind === 'in' ? new Date().toISOString() : kioskToday?.firstInAt ?? null,
          lastOutAt: kind === 'out' ? new Date().toISOString() : kioskToday?.lastOutAt ?? null,
        });
        // Refresh the directory now (not just when we land back on the grid)
        // so the cached "currently IN" statuses can't be shown stale.
        void refetchKioskDirectory();
      } else {
        await loadToday();
      }
    } catch (e) {
      if (isKioskUnauthorizedError(e)) {
        unpairAndRedirect();
        return;
      }
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    if (!isKioskDevice) clearPunchToken();
    setFaceMatch(null);
    setShowDirectoryOnFaceKiosk(false);
    setStep('login');
    setSelectedEmployee(null);
    setEmployeeCode('');
    setPhone('');
    setOtp('');
    setSelfie(null);
    setPreview(null);
    setKioskToday(null);
    setAutoReturnIn(null);
  };
  resetToLoginRef.current = resetToLogin;

  // Kiosk devices auto-return to the photo grid after a punch so the next
  // employee doesn't have to read or tap anything — a countdown is shown but
  // tapping "Next employee" any time skips the wait.
  useEffect(() => {
    if (!isKioskDevice || step !== 'done') return;
    setAutoReturnIn(AUTO_RETURN_SECONDS);
    const tick = setInterval(() => {
      setAutoReturnIn((n) => (n === null ? null : n - 1));
    }, 1000);
    const timeout = setTimeout(() => resetToLoginRef.current(), AUTO_RETURN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [isKioskDevice, step]);

  const canPunchIn = isKioskDevice ? !kioskToday?.open : !todayRecord?.punchIn;
  const canPunchOut = isKioskDevice ? !!kioskToday?.open : todayRecord?.punchIn && !todayRecord?.punchOut;
  const kioskDirectoryList = kioskDirectoryData?.data ?? [];
  // The paired device declares its own mode, so a simple kiosk behaves exactly as it
  // did before this feature existed.
  const isFaceKiosk = isKioskDevice && kioskDirectoryData?.deviceMode === 'face';
  const filteredKioskDirectory = directorySearch.trim()
    ? kioskDirectoryList.filter(
        (e) =>
          e.fullName.toLowerCase().includes(directorySearch.trim().toLowerCase()) ||
          e.employeeCode.toLowerCase().includes(directorySearch.trim().toLowerCase())
      )
    : kioskDirectoryList;
  const directory = isKioskDevice ? filteredKioskDirectory : directoryData?.data ?? [];
  const punchShifts = punchContext?.shifts ?? [];

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-4 sm:p-6">
      <div
        className={
          (loginMode === 'photo' && step === 'login') || (isKioskDevice && step === 'home')
            ? 'mx-auto max-w-5xl'
            : 'mx-auto max-w-md'
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Employee punch</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              {isKioskDevice
                ? 'Tap your photo to punch in or out'
                : step === 'login' && loginMode === 'photo'
                  ? 'Tap your photo to sign in'
                  : 'OTP login · GPS · selfie required'}
            </p>
          </div>
          <KioskToolbar />
        </div>

        {step === 'login' && loginMode === 'photo' && isFaceKiosk && !showDirectoryOnFaceKiosk && (
          <KioskFaceScanner
            onIdentify={(employeeId, match) => {
              const emp = directory.find((e) => e._id === employeeId);
              if (!emp) return;
              void selectEmployeeFromPhoto(emp, match);
            }}
            onUseDirectory={() => setShowDirectoryOnFaceKiosk(true)}
          />
        )}

        {step === 'login' && loginMode === 'photo' && !(isFaceKiosk && !showDirectoryOnFaceKiosk) && (
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
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-lg text-slate-900 placeholder:text-slate-400 focus:border-[#305dff] focus:outline-none focus:ring-2 focus:ring-[#305dff]/20"
                  />
                </div>
                {!isKioskDevice && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 py-3 text-base"
                    onClick={() => setDirectoryQuery(directorySearch)}
                  >
                    Search
                  </Button>
                )}
              </div>
              {!isKioskDevice && punchShifts.length > 0 && (
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
              loading={isKioskDevice ? loadingKioskDirectory : loadingDirectory}
              size="xlarge"
              emptyMessage="No employees found. Ask HR to add photos."
              onSelect={(emp) => void selectEmployeeFromPhoto(emp)}
              renderFooter={
                isKioskDevice
                  ? (emp) => {
                      const today = (emp as { today?: KioskTodayStatus }).today;
                      if (!today?.open) return null;
                      return (
                        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <FiCheckCircle className="size-4" /> Currently IN
                        </span>
                      );
                    }
                  : undefined
              }
            />

            {!locked && !isKioskDevice && (
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

        {step === 'home' && isKioskDevice && (
          <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
              {/* Left: identity, status, GPS, actions */}
              <div className="flex flex-col">
                <div className="flex items-center gap-4">
                  {selectedEmployee?.referencePhotoUrl ? (
                    <img
                      src={selectedEmployee.referencePhotoUrl}
                      alt={selectedEmployee.fullName}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-md sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-2xl font-bold text-slate-500 sm:h-24 sm:w-24">
                      {employeeName.slice(0, 1)}
                    </div>
                  )}
                  <p className="text-2xl font-bold text-slate-900">{employeeName}</p>
                </div>

                <div
                  className={`mt-5 flex items-center justify-center gap-3 rounded-2xl p-4 ${
                    canPunchOut ? 'bg-emerald-50' : 'bg-slate-100'
                  }`}
                >
                  {canPunchOut ? (
                    <FiCheckCircle className="size-9 shrink-0 text-emerald-600" />
                  ) : (
                    <FiClock className="size-9 shrink-0 text-slate-500" />
                  )}
                  <p className={`text-lg font-bold ${canPunchOut ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {canPunchOut ? "You're currently IN" : "You're currently OUT"}
                  </p>
                </div>

                <div className="mt-3">
                  <GpsStatusBanner coords={coords} maxGpsAccuracyMeters={maxGps} error={geoError} />
                </div>
                {(punchContext?.workSites?.length ?? 0) === 0 && (
                  <p className="mt-2 text-xs text-amber-800">No work sites configured yet. Contact HR.</p>
                )}

                <div className="mt-5 grid flex-1 content-end gap-3">
                  {canPunchIn && (
                    <Button
                      fullWidth
                      variant="success"
                      className="py-5 text-xl"
                      disabled={!coords}
                      loading={loading}
                      onClick={() => void handleKioskPunch('in')}
                    >
                      <FiLogIn className="size-7" /> PUNCH IN
                    </Button>
                  )}
                  {canPunchOut && (
                    <Button
                      fullWidth
                      variant="danger"
                      className="py-5 text-xl"
                      disabled={!coords}
                      loading={loading}
                      onClick={() => void handleKioskPunch('out')}
                    >
                      <FiLogOut className="size-7" /> PUNCH OUT
                    </Button>
                  )}
                  {!canPunchIn && !canPunchOut && (
                    <p className="text-center text-base text-slate-500">Today&apos;s session is complete.</p>
                  )}
                  <Button fullWidth variant="outline" onClick={resetToLogin}>
                    <FiUser className="size-4" /> Not you? Switch employee
                  </Button>
                </div>
              </div>

              {/* Right: live camera preview */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-500">Live camera</p>
                <SelfieCapture
                  ref={selfieCaptureRef}
                  hideButton
                  onCapture={() => {}}
                  aspectClassName="aspect-square sm:aspect-[4/5]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'home' && !isKioskDevice && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-xl font-semibold text-slate-800">Hello, {employeeName}</p>

            <div className="mt-3">
              <GpsStatusBanner coords={coords} maxGpsAccuracyMeters={maxGps} error={geoError} />
            </div>
            {(punchContext?.workSites?.length ?? 0) === 0 && (
              <p className="mt-2 text-xs text-amber-800">No work sites configured yet. Contact HR.</p>
            )}
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-base">
              <p>Today: {new Date().toISOString().slice(0, 10)}</p>
              <p>In: {todayRecord?.punchIn ? new Date(todayRecord.punchIn.at).toLocaleTimeString() : '—'}</p>
              <p>Out: {todayRecord?.punchOut ? new Date(todayRecord.punchOut.at).toLocaleTimeString() : '—'}</p>
            </div>
            <div className="mt-4 grid gap-3">
              {canPunchIn && (
                <Button
                  fullWidth
                  variant="success"
                  className="py-5 text-xl"
                  disabled={!coords}
                  loading={loading}
                  onClick={() => startPreview('in')}
                >
                  <FiLogIn className="size-7" /> PUNCH IN
                </Button>
              )}
              {canPunchOut && (
                <Button
                  fullWidth
                  variant="danger"
                  className="py-5 text-xl"
                  disabled={!coords}
                  loading={loading}
                  onClick={() => startPreview('out')}
                >
                  <FiLogOut className="size-7" /> PUNCH OUT
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
            <div
              className={`mb-4 flex items-center justify-center gap-2 rounded-xl py-3 text-lg font-bold ${
                action === 'in' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {action === 'in' ? <FiLogIn className="size-6" /> : <FiLogOut className="size-6" />}
              {action === 'in' ? 'Punching IN' : 'Punching OUT'}
            </div>
            <GeofenceWarningBanner preview={preview} />
            <SelfieCapture className="mt-4" onCapture={setSelfie} />
            <Button
              variant="primary"
              className="mt-4 w-full py-5 text-xl"
              disabled={!selfie}
              loading={loading}
              onClick={() => void submitPunch()}
            >
              {action === 'in' ? <FiLogIn className="size-6" /> : <FiLogOut className="size-6" />}
              Confirm {action === 'in' ? 'punch in' : 'punch out'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <div
              className={`mx-auto mb-4 flex size-24 items-center justify-center rounded-full ${
                action === 'in' ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              {action === 'in' ? (
                <FiLogIn className="size-12 text-emerald-600" />
              ) : (
                <FiLogOut className="size-12 text-rose-600" />
              )}
            </div>
            <p className={`text-2xl font-bold ${action === 'in' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {action === 'in' ? 'Punched IN' : 'Punched OUT'}
            </p>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
            <Button
              className="mt-6 w-full py-4 text-lg"
              onClick={() => {
                if (isKioskDevice || locked) {
                  resetToLogin();
                } else {
                  setStep('home');
                  setSelfie(null);
                  setPreview(null);
                }
              }}
            >
              {isKioskDevice || locked ? 'Next employee' : 'Done'}
              {isKioskDevice && autoReturnIn != null && autoReturnIn > 0 ? ` (${autoReturnIn}s)` : ''}
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
        onConfirm={() => {
          setConfirmOpen(false);
          if (isKioskDevice) void captureAndSubmit(action);
          else setStep('selfie');
        }}
      />
    </div>
  );
}
