import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCamera,
  FiCheck,
  FiCpu,
  FiRefreshCw,
  FiTrash2,
  FiUserPlus,
  FiVideo,
} from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import {
  useAddFaceSamples,
  useClearFaceSamples,
  useFaceEnrollment,
  useFaceGallery,
} from '../../api/attendance';
import { useFaceEngine, type FaceObservation } from '../../hooks/useFaceEngine';
import type { FaceGalleryEntry } from '../../types/attendance';

/**
 * Test rig for kiosk face recognition.
 *
 * Deliberately separate from the live kiosk: this is where accuracy gets measured in
 * real lighting before anything touches the real punch flow. Every number the matcher
 * uses is shown on screen, because "it felt about right" is not a basis for putting
 * biometrics in front of payroll.
 */

/**
 * Gate thresholds. Tuned conservatively: a wrong match writes bad attendance, while a
 * miss just means the person taps their name. Adjustable live so you can find the real
 * numbers for your camera and lighting rather than trusting these.
 */
const DEFAULTS = {
  /** Similarity above which we will name someone. */
  matchThreshold: 0.6,
  /** Required gap to the runner-up, so near-ties never auto-name. */
  marginThreshold: 0.04,
  /** Minimum anti-spoof score. */
  realThreshold: 0.5,
  /** Face must fill this share of frame width — stops matching on distant passers-by. */
  minRelativeWidth: 0.18,
  /** Max head turn in degrees before we skip the frame. */
  maxYaw: 25,
};

const ENROLL_TARGET = 5;

interface MatchResult {
  entry: FaceGalleryEntry;
  similarity: number;
  runnerUp: number;
}

export function FaceKioskLab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const { status, error: engineError, loadMs, load, detect, similarity } = useFaceEngine();
  const gallery = useFaceGallery({ enabled: status === 'ready' });
  const enrollment = useFaceEnrollment();
  const addSamples = useAddFaceSamples();
  const clearSamples = useClearFaceSamples();

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [obs, setObs] = useState<FaceObservation | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [fps, setFps] = useState(0);
  const [thresholds, setThresholds] = useState(DEFAULTS);

  const [enrollFor, setEnrollFor] = useState<string>('');
  const [enrollBuffer, setEnrollBuffer] = useState<number[][]>([]);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  // Anti-spoof calibration. Absolute `real` scores mean nothing on their own — what
  // matters is whether live faces and photos land in separable ranges on THIS camera.
  const [calibLabel, setCalibLabel] = useState<'live' | 'spoof' | null>(null);
  // Both signals recorded per bucket, so liveness can be judged on evidence rather
  // than assumed useful. It costs an inference every frame either way.
  const [calibSamples, setCalibSamples] = useState<{
    live: { real: number[]; liveness: number[] };
    spoof: { real: number[]; liveness: number[] };
  }>({
    live: { real: [], liveness: [] },
    spoof: { real: [], liveness: [] },
  });
  const calibRef = useRef<'live' | 'spoof' | null>(null);
  calibRef.current = calibLabel;

  const entries = useMemo(() => gallery.data?.entries ?? [], [gallery.data]);

  // ─ camera ─
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (e) {
        setCameraError((e as Error).message || 'Camera unavailable');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  /** Best match for an embedding, plus the runner-up so near-ties can be rejected. */
  const findMatch = useCallback(
    (embedding: number[]): MatchResult | null => {
      let best: { entry: FaceGalleryEntry; score: number } | null = null;
      let second = 0;

      for (const entry of entries) {
        // Max across that person's samples: one good angle should be enough to match,
        // so averaging would only dilute a strong hit.
        let bestForEntry = 0;
        for (const d of entry.descriptors) {
          const s = similarity(embedding, d);
          if (s > bestForEntry) bestForEntry = s;
        }
        if (!best || bestForEntry > best.score) {
          second = best?.score ?? second;
          best = { entry, score: bestForEntry };
        } else if (bestForEntry > second) {
          second = bestForEntry;
        }
      }

      if (!best) return null;
      return { entry: best.entry, similarity: best.score, runnerUp: second };
    },
    [entries, similarity]
  );

  // ─ detection loop ─
  useEffect(() => {
    if (!running || status !== 'ready') return;
    let frames = 0;
    let windowStart = performance.now();
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && !busyRef.current) {
        busyRef.current = true;
        try {
          const next = await detect(video);
          setObs(next);
          if (next?.embedding) {
            setMatch(findMatch(next.embedding));
          } else {
            setMatch(null);
          }
          const bucket = calibRef.current;
          if (bucket && next) {
            setCalibSamples((c) => ({
              ...c,
              [bucket]: {
                real: next.real != null ? [...c[bucket].real, next.real].slice(-120) : c[bucket].real,
                liveness:
                  next.live != null ? [...c[bucket].liveness, next.live].slice(-120) : c[bucket].liveness,
              },
            }));
          }
        } catch {
          // A dropped frame is not worth surfacing; the next one will retry.
        } finally {
          busyRef.current = false;
        }

        frames += 1;
        const elapsed = performance.now() - windowStart;
        if (elapsed >= 1000) {
          setFps(Math.round((frames * 1000) / elapsed));
          frames = 0;
          windowStart = performance.now();
        }
      }
      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [running, status, detect, findMatch]);

  // ─ gate evaluation ─
  const gates = useMemo(() => {
    if (!obs) return null;
    return {
      size: { ok: obs.relativeWidth >= thresholds.minRelativeWidth, value: obs.relativeWidth },
      angle: { ok: Math.abs(obs.yaw) <= thresholds.maxYaw, value: obs.yaw },
      real: { ok: (obs.real ?? 1) >= thresholds.realThreshold, value: obs.real },
      match: { ok: (match?.similarity ?? 0) >= thresholds.matchThreshold, value: match?.similarity ?? 0 },
      margin: {
        ok: match ? match.similarity - match.runnerUp >= thresholds.marginThreshold : false,
        value: match ? match.similarity - match.runnerUp : 0,
      },
    };
  }, [obs, match, thresholds]);

  const identified = gates
    ? gates.size.ok && gates.angle.ok && gates.real.ok && gates.match.ok && gates.margin.ok
    : false;

  const captureSample = () => {
    if (!obs?.embedding) {
      setEnrollMsg('No face detected — look at the camera and try again.');
      return;
    }
    if (Math.abs(obs.yaw) > 35) {
      setEnrollMsg('Too much head turn for a useful sample.');
      return;
    }
    setEnrollBuffer((b) => [...b, obs.embedding!]);
    setEnrollMsg(null);
  };

  const saveSamples = async () => {
    if (!enrollFor || enrollBuffer.length === 0) return;
    try {
      const res = await addSamples.mutateAsync({
        employeeId: enrollFor,
        vectors: enrollBuffer,
        source: 'live',
      });
      setEnrollBuffer([]);
      setEnrollMsg(`Saved. ${res.sampleCount} sample${res.sampleCount === 1 ? '' : 's'} on file.`);
    } catch (e) {
      setEnrollMsg((e as Error).message);
    }
  };

  const enrollRows = enrollment.data?.data ?? [];
  const enrolledCount = enrollRows.filter((r) => r.sampleCount > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Face kiosk — test rig</h1>
        <p className="mt-1 text-sm text-slate-500">
          Measure recognition accuracy in your real lighting before this goes near the live
          punch flow. Nothing here records attendance.
        </p>
      </div>

      {status !== 'ready' && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <FiCpu className="size-5 text-indigo-600" aria-hidden />
            <div className="flex-1">
              <p className="font-medium text-slate-900">Face models</p>
              <p className="text-sm text-slate-500">
                About 10 MB, served from this app so the kiosk works offline. Downloaded once,
                then cached.
              </p>
            </div>
            <Button onClick={load} loading={status === 'loading'}>
              {status === 'loading' ? 'Loading models…' : 'Load models'}
            </Button>
          </div>
          {engineError && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600">
              <FiAlertTriangle className="size-4" /> {engineError}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <div className="relative overflow-hidden rounded-xl bg-slate-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[4/3] w-full scale-x-[-1] object-cover"
            />
            {obs && (
              <div
                className={`pointer-events-none absolute rounded-lg border-2 ${
                  identified ? 'border-emerald-400' : 'border-amber-400'
                }`}
                style={{
                  // Video is mirrored for a natural preview, so the box mirrors too.
                  right: `${(obs.box[0] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                  top: `${(obs.box[1] / (videoRef.current?.videoHeight || 1)) * 100}%`,
                  width: `${(obs.box[2] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                  height: `${(obs.box[3] / (videoRef.current?.videoHeight || 1)) * 100}%`,
                }}
              />
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                {cameraError}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => setRunning((v) => !v)} disabled={status !== 'ready'}>
              <FiVideo className="size-4" /> {running ? 'Stop' : 'Start recognising'}
            </Button>
            <Button variant="outline" onClick={() => gallery.refetch()} disabled={status !== 'ready'}>
              <FiRefreshCw className="size-4" /> Reload gallery
            </Button>
            <span className="ml-auto text-xs text-slate-500">
              {fps > 0 && `${fps} fps · `}
              {loadMs !== null && `models ${(loadMs / 1000).toFixed(1)}s · `}
              {entries.length} enrolled
            </span>
          </div>

          {/* Result */}
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            {!running ? (
              <p className="text-sm text-slate-500">Not running.</p>
            ) : !obs ? (
              <p className="text-sm text-slate-500">No face in frame.</p>
            ) : identified && match ? (
              <div className="flex items-center gap-3">
                {match.entry.referencePhotoUrl ? (
                  <img
                    src={match.entry.referencePhotoUrl}
                    alt={match.entry.fullName}
                    className="size-14 rounded-full object-cover ring-2 ring-emerald-400"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <FiCheck className="size-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-slate-900">{match.entry.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {match.entry.employeeCode} · {(match.similarity * 100).toFixed(1)}% match
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => undefined} disabled title="Test rig — punching is disabled">
                    Punch in
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-amber-700">Not identified</p>
                <p className="mt-1 text-xs text-slate-500">
                  {match
                    ? `Closest: ${match.entry.fullName} at ${(match.similarity * 100).toFixed(1)}%`
                    : 'No candidate above zero — is anyone enrolled?'}
                </p>
              </div>
            )}
          </div>

          {/* Gates — the whole point of the rig */}
          {gates && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Gate label="Size" ok={gates.size.ok} value={`${(gates.size.value * 100).toFixed(0)}%`} />
              <Gate label="Head turn" ok={gates.angle.ok} value={`${gates.angle.value}°`} />
              <Gate
                label="Real"
                ok={gates.real.ok}
                value={gates.real.value === null ? 'n/a' : `${(gates.real.value * 100).toFixed(0)}%`}
              />
              <Gate label="Match" ok={gates.match.ok} value={`${(gates.match.value * 100).toFixed(1)}%`} />
              <Gate label="Margin" ok={gates.margin.ok} value={`${(gates.margin.value * 100).toFixed(1)}%`} />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Enrollment */}
          <Card>
            <h2 className="mb-1 font-semibold text-slate-900">Enrol a face</h2>
            <p className="mb-3 text-sm text-slate-500">
              Capture {ENROLL_TARGET} samples with slightly different angles and expressions.
              More angles is the single biggest accuracy gain available.
            </p>

            <select
              value={enrollFor}
              onChange={(e) => {
                setEnrollFor(e.target.value);
                setEnrollBuffer([]);
                setEnrollMsg(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select employee…</option>
              {enrollRows.map((r) => (
                <option key={r.employeeId} value={r.employeeId}>
                  {r.fullName} ({r.employeeCode}) — {r.sampleCount} sample
                  {r.sampleCount === 1 ? '' : 's'}
                </option>
              ))}
            </select>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={captureSample}
                disabled={!enrollFor || status !== 'ready' || !running}
              >
                <FiCamera className="size-4" /> Capture ({enrollBuffer.length}/{ENROLL_TARGET})
              </Button>
              <Button
                onClick={saveSamples}
                disabled={!enrollFor || enrollBuffer.length === 0}
                loading={addSamples.isPending}
              >
                <FiUserPlus className="size-4" /> Save samples
              </Button>
              {enrollFor && (
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => clearSamples.mutate(enrollFor)}
                  loading={clearSamples.isPending}
                >
                  <FiTrash2 className="size-4" /> Clear
                </Button>
              )}
            </div>

            {!running && enrollFor && (
              <p className="mt-2 text-xs text-amber-700">Start recognition first — capture reads the live frame.</p>
            )}
            {enrollMsg && <p className="mt-2 text-sm text-slate-600">{enrollMsg}</p>}

            <p className="mt-3 text-xs text-slate-400">
              {enrolledCount} of {enrollRows.length} employees enrolled.
            </p>
          </Card>

          {/* Anti-spoof calibration */}
          <Card>
            <h2 className="mb-1 font-semibold text-slate-900">Anti-spoof calibration</h2>
            <p className="mb-3 text-sm text-slate-500">
              A single reading tells you nothing. Record your live face, then record a photo
              of yourself on a phone held to the camera. If the two ranges overlap, this
              model cannot tell them apart on your hardware and should not gate anything.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={calibLabel === 'live' ? 'primary' : 'outline'}
                onClick={() => setCalibLabel(calibLabel === 'live' ? null : 'live')}
                disabled={!running}
              >
                {calibLabel === 'live' ? 'Stop' : 'Record live face'}
              </Button>
              <Button
                variant={calibLabel === 'spoof' ? 'primary' : 'outline'}
                onClick={() => setCalibLabel(calibLabel === 'spoof' ? null : 'spoof')}
                disabled={!running}
              >
                {calibLabel === 'spoof' ? 'Stop' : 'Record photo/screen'}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCalibSamples({
                    live: { real: [], liveness: [] },
                    spoof: { real: [], liveness: [] },
                  })
                }
              >
                Reset
              </Button>
            </div>
            {!running && <p className="mt-2 text-xs text-amber-700">Start recognition first.</p>}

            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Anti-spoof score
              </p>
              <div className="space-y-2">
                <CalibRow label="Live face" values={calibSamples.live.real} tone="text-emerald-700" />
                <CalibRow label="Photo / screen" values={calibSamples.spoof.real} tone="text-rose-700" />
              </div>
              <SeparationVerdict
                signal="Anti-spoof"
                live={calibSamples.live.real}
                spoof={calibSamples.spoof.real}
              />
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Liveness score
              </p>
              <div className="space-y-2">
                <CalibRow label="Live face" values={calibSamples.live.liveness} tone="text-emerald-700" />
                <CalibRow label="Photo / screen" values={calibSamples.spoof.liveness} tone="text-rose-700" />
              </div>
              <SeparationVerdict
                signal="Liveness"
                live={calibSamples.live.liveness}
                spoof={calibSamples.spoof.liveness}
              />
            </div>
          </Card>

          {/* Thresholds */}
          <Card>
            <h2 className="mb-1 font-semibold text-slate-900">Thresholds</h2>
            <p className="mb-3 text-sm text-slate-500">
              Raise Match until wrong identifications stop, then lower it until people stop
              being missed. The gap between those two numbers is your real accuracy.
            </p>
            <Slider
              label="Match"
              hint="Similarity needed to name someone"
              value={thresholds.matchThreshold}
              min={0.3}
              max={0.9}
              onChange={(v) => setThresholds((t) => ({ ...t, matchThreshold: v }))}
            />
            <Slider
              label="Margin"
              hint="Lead over the runner-up, so near-ties are rejected"
              value={thresholds.marginThreshold}
              min={0}
              max={0.2}
              onChange={(v) => setThresholds((t) => ({ ...t, marginThreshold: v }))}
            />
            <Slider
              label="Real"
              hint="Anti-spoof floor — try holding up a photo on a phone"
              value={thresholds.realThreshold}
              min={0}
              max={1}
              onChange={(v) => setThresholds((t) => ({ ...t, realThreshold: v }))}
            />
            <Slider
              label="Min face size"
              hint="Share of frame width; stops matching passers-by"
              value={thresholds.minRelativeWidth}
              min={0.05}
              max={0.5}
              onChange={(v) => setThresholds((t) => ({ ...t, minRelativeWidth: v }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function stats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0],
    p50: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    // 10th/90th percentile bound the bulk of readings, ignoring odd frames.
    p10: sorted[Math.floor(sorted.length * 0.1)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
  };
}

function CalibRow({ label, values, tone }: { label: string; values: number[]; tone: string }) {
  const s = stats(values);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className="w-32 shrink-0 text-xs font-medium text-slate-600">{label}</span>
      {!s ? (
        <span className="text-xs text-slate-400">No samples yet</span>
      ) : (
        <span className={`font-mono text-xs tabular-nums ${tone}`}>
          n={s.n} · min {(s.min * 100).toFixed(0)}% · median {(s.p50 * 100).toFixed(0)}% · max{' '}
          {(s.max * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

/** The actual answer: do the two distributions separate, and where does the line go? */
function SeparationVerdict({
  signal,
  live,
  spoof,
}: {
  signal: string;
  live: number[];
  spoof: number[];
}) {
  const l = stats(live);
  const s = stats(spoof);
  if (!l || !s || l.n < 20 || s.n < 20) {
    return (
      <p className="mt-3 text-xs text-slate-400">
        Record at least 20 frames of each to get a verdict.
      </p>
    );
  }

  // Usable if the bulk of live readings sit above the bulk of spoof readings.
  const separated = l.p10 > s.p90;
  const suggested = separated ? (l.p10 + s.p90) / 2 : null;

  return (
    <div
      className={`mt-3 rounded-lg border p-3 text-sm ${
        separated ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
      }`}
    >
      {separated ? (
        <>
          <p className="font-medium text-emerald-900">{signal} separates on this camera</p>
          <p className="mt-1 text-xs text-emerald-800">
            Live faces sit above {(l.p10 * 100).toFixed(0)}%, spoofs below{' '}
            {(s.p90 * 100).toFixed(0)}%. Set the Real threshold near{' '}
            <span className="font-mono font-semibold">{suggested!.toFixed(2)}</span>.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-rose-900">{signal} does not separate</p>
          <p className="mt-1 text-xs text-rose-800">
            Live and spoof readings overlap, so no threshold can tell them apart here. Keep
            recording this score for audit, but do not let it block or allow a punch.
          </p>
        </>
      )}
    </div>
  );
}

function Gate({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div
      className={`rounded-lg border p-2 text-center ${
        ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${ok ? 'text-emerald-800' : 'text-amber-800'}`}>{value}</p>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="font-mono text-sm text-slate-600">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
      <p className="text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}
