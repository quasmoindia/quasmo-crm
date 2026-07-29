import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiChevronLeft, FiRefreshCw, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import {
  useAddFaceSamples,
  useClearFaceSamples,
  useFaceEnrollment,
  useFaceGallery,
} from '../../api/attendance';
import { useFaceEngine, type FaceObservation } from '../../hooks/useFaceEngine';
import type { FaceEnrollmentRow } from '../../types/attendance';
import './faceHud.css';

/**
 * Guided face enrolment.
 *
 * Enrolment quality decides recognition quality, so this walks through a fixed set of
 * angles rather than letting someone take five near-identical frontal shots. Each pose
 * is validated against the tracked head angle before it can be captured, and capture
 * fires automatically once the pose holds steady — hands stay free to actually turn
 * your head.
 */

interface PoseStep {
  id: string;
  label: string;
  instruction: string;
  /** Whether the current head angles satisfy this pose. */
  matches: (obs: FaceObservation) => boolean;
}

/** Yaw is reported relative to the camera; the preview is mirrored, so "turn left"
 *  from the person's point of view is a positive yaw here. */
const STEPS: PoseStep[] = [
  {
    id: 'front',
    label: 'Face forward',
    instruction: 'Look straight at the camera',
    matches: (o) => Math.abs(o.yaw) <= 12 && Math.abs(o.pitch) <= 14,
  },
  {
    id: 'left',
    label: 'Turn left',
    instruction: 'Turn your head slowly to your left',
    matches: (o) => o.yaw >= 16 && o.yaw <= 45,
  },
  {
    id: 'right',
    label: 'Turn right',
    instruction: 'Turn your head slowly to your right',
    matches: (o) => o.yaw <= -16 && o.yaw >= -45,
  },
  {
    id: 'up',
    label: 'Chin up',
    instruction: 'Lift your chin slightly',
    matches: (o) => o.pitch <= -10 && Math.abs(o.yaw) <= 20,
  },
  {
    id: 'close',
    label: 'Step closer',
    instruction: 'Move a little closer, face forward',
    matches: (o) => Math.abs(o.yaw) <= 14 && o.relativeWidth >= 0.3,
  },
];

/** Pose must hold this long before the frame is taken — stops blur mid-turn. */
const HOLD_MS = 700;

/**
 * Similarity at which two faces are treated as the same person.
 *
 * The library's own guidance is that anything above 0.5 "can be considered a match", so
 * 0.5-0.6 is the boundary between people, not a confident same-person score. Observed
 * same-person values here run 0.75-0.88, so the bar sits above the noise band rather
 * than inside it.
 */
const COLLISION_THRESHOLD = 0.72;
const MIN_FACE_WIDTH = 0.16;
const MIN_SCORE = 0.6;

export function FaceEnrollment() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const holdSinceRef = useRef<number | null>(null);

  const { status, error: engineError, load, detect, similarity } = useFaceEngine();
  const enrollment = useFaceEnrollment();
  // Needed to compare a new face against everyone already enrolled.
  const gallery = useFaceGallery({ enabled: status === 'ready' });
  const addSamples = useAddFaceSamples();
  const clearSamples = useClearFaceSamples();

  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState<FaceEnrollmentRow | null>(null);
  const [obs, setObs] = useState<FaceObservation | null>(null);
  const [captured, setCaptured] = useState<Record<string, number[]>>({});
  const [sweepKey, setSweepKey] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  /** A blocked save, shown next to the Save button. Distinct from `saved` so a refusal
   *  never renders as a success. */
  const [blocked, setBlocked] = useState<{ message: string; overridable: boolean } | null>(null);

  const filtered = useMemo(() => {
    const all = enrollment.data?.data ?? [];
    const t = search.trim().toLowerCase();
    if (!t) return all;
    return all.filter((r) => `${r.fullName} ${r.employeeCode} ${r.department}`.toLowerCase().includes(t));
  }, [enrollment.data, search]);

  const stepIndex = STEPS.findIndex((s) => !captured[s.id]);
  const activeStep = stepIndex === -1 ? null : STEPS[stepIndex];
  const doneCount = Object.keys(captured).length;

  // ─ camera, only while enrolling someone ─
  useEffect(() => {
    if (!subject) return;
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
  }, [subject]);

  const takeSample = useCallback((stepId: string, embedding: number[]) => {
    setCaptured((c) => ({ ...c, [stepId]: embedding }));
    setSweepKey((k) => k + 1);
    holdSinceRef.current = null;
    setHoldProgress(0);
  }, []);

  // ─ detection + auto-capture loop ─
  useEffect(() => {
    if (!subject || status !== 'ready' || !activeStep) return;
    let raf = 0;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && !busyRef.current) {
        busyRef.current = true;
        try {
          const next = await detect(video);
          setObs(next);

          const usable =
            next &&
            next.embedding &&
            next.score >= MIN_SCORE &&
            next.relativeWidth >= MIN_FACE_WIDTH &&
            // Refuse ambiguous frames outright. With two faces present the detector can
            // switch between them across poses, quietly enrolling a blend of two people.
            next.faceCount === 1 &&
            activeStep.matches(next);

          if (usable) {
            if (holdSinceRef.current === null) holdSinceRef.current = performance.now();
            const held = performance.now() - holdSinceRef.current;
            setHoldProgress(Math.min(1, held / HOLD_MS));
            if (held >= HOLD_MS) takeSample(activeStep.id, next.embedding!);
          } else {
            holdSinceRef.current = null;
            setHoldProgress(0);
          }
        } catch {
          // Dropped frame; the next one retries.
        } finally {
          busyRef.current = false;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [subject, status, activeStep, detect, takeSample]);

  /**
   * Guard against enrolling the wrong person.
   *
   * If HR opens Deepak's record while Rajesh is standing at the camera, Rajesh's face
   * gets saved as Deepak — and Rajesh can then punch as Deepak indefinitely. Comparing
   * the new samples against everyone already enrolled catches that before it is stored.
   *
   * This is a guard against an honest mistake, not a security boundary: it runs in the
   * browser and a determined operator could bypass it. The realistic failure here is
   * carelessness at a busy enrolment session, and this catches that.
   */
  const findCollision = (vectors: number[][]) => {
    for (const entry of gallery.data?.entries ?? []) {
      if (entry.employeeId === subject?.employeeId) continue;

      // Best match for EACH new sample, then the median of those.
      //
      // Firing on any single pair meant taking the maximum of 5x8 = 40 noisy
      // comparisons per person, which sits far above their average and false-positives
      // on almost anyone — worse as the gallery grows. Requiring the median to clear
      // the bar means the same face has to match consistently, not once by luck.
      const perSampleBest = vectors.map((v) =>
        entry.descriptors.reduce((best, known) => Math.max(best, similarity(v, known)), 0)
      );
      const sorted = [...perSampleBest].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

      if (median >= COLLISION_THRESHOLD) return { entry, score: median };
    }
    return null;
  };

  const save = async (force = false) => {
    if (!subject) return;
    const vectors = STEPS.map((s) => captured[s.id]).filter(Boolean) as number[][];
    if (vectors.length === 0) return;

    // `force` skips the collision guard after the operator has seen who it matched and
    // confirmed anyway — a legitimate path when correcting a previous mis-enrolment.
    if (!force) {
      const clash = findCollision(vectors);
      if (clash) {
        setBlocked({
          message:
            `This face matches ${clash.entry.fullName} (${clash.entry.employeeCode}) at ` +
            `${(clash.score * 100).toFixed(0)}%. Nothing was saved.`,
          overridable: true,
        });
        return;
      }
    }

    setBlocked(null);
    try {
      const res = await addSamples.mutateAsync({
        employeeId: subject.employeeId,
        vectors,
        source: 'live',
      });
      setSaved(`${subject.fullName} enrolled — ${res.sampleCount} samples on file.`);
      setCaptured({});
      setSubject(null);
    } catch (e) {
      setBlocked({ message: (e as Error).message, overridable: false });
    }
  };

  // ── Picker ──
  if (!subject) {
    return (
      <div>
        <header className="mb-6">
          <p className="hud-label" style={{ color: '#7c8aa8' }}>Attendance · Biometrics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Face enrolment</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register an employee&apos;s face so the kiosk can recognise them. Takes about
            twenty seconds per person.
          </p>
        </header>

        {status !== 'ready' && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex-1">
              <p className="font-medium text-slate-900">Face models not loaded</p>
              <p className="text-sm text-slate-500">About 10 MB, downloaded once and then cached.</p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={status === 'loading'}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {status === 'loading' ? 'Loading…' : 'Load models'}
            </button>
            {engineError && <p className="w-full text-sm text-rose-600">{engineError}</p>}
          </div>
        )}

        {saved && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            {saved}
          </p>
        )}

        <div className="relative mb-4 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code or department"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div
              key={r.employeeId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              {r.referencePhotoUrl ? (
                <img src={r.referencePhotoUrl} alt="" className="size-11 rounded-full object-cover" />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400">
                  {r.fullName.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{r.fullName}</p>
                <p className="truncate text-xs text-slate-500">{r.employeeCode}</p>
                <p className="mt-0.5 text-[11px] font-medium">
                  {r.sampleCount > 0 ? (
                    <span className="text-emerald-700">{r.sampleCount} samples enrolled</span>
                  ) : (
                    <span className="text-slate-400">Not enrolled</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCaptured({});
                    setSaved(null);
                    setBlocked(null);
                    setSubject(r);
                  }}
                  disabled={status !== 'ready'}
                  className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {r.sampleCount > 0 ? 'Re-enrol' : 'Enrol'}
                </button>
                {r.sampleCount > 0 && (
                  <button
                    type="button"
                    onClick={() => clearSamples.mutate(r.employeeId)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <FiTrash2 className="inline size-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No employees match that search.</p>
        )}
      </div>
    );
  }

  // ── Capture ──
  const box = obs?.box;
  const vw = videoRef.current?.videoWidth || 1;
  const vh = videoRef.current?.videoHeight || 1;
  const poseOk = obs && activeStep ? activeStep.matches(obs) : false;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSubject(null)}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <FiChevronLeft className="size-4" /> All employees
        </button>
        <div>
          <p className="font-semibold text-slate-900">{subject.fullName}</p>
          <p className="text-xs text-slate-500">{subject.employeeCode}</p>
        </div>
      </div>

      <div className="hud hud-grid-bg p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Viewport */}
          <div>
            <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--grid)' }}>
              <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full scale-x-[-1] object-cover" />

              {box && (
                <div
                  className={`reticle ${poseOk ? 'is-locked' : ''}`}
                  style={{
                    right: `${(box[0] / vw) * 100}%`,
                    top: `${(box[1] / vh) * 100}%`,
                    width: `${(box[2] / vw) * 100}%`,
                    height: `${(box[3] / vh) * 100}%`,
                  }}
                >
                  <span className="reticle-corner tl" />
                  <span className="reticle-corner tr" />
                  <span className="reticle-corner bl" />
                  <span className="reticle-corner br" />
                </div>
              )}

              {sweepKey > 0 && <div key={sweepKey} className="hud-sweep" />}

              {/* Instruction */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="hud-panel rounded-lg px-4 py-3 backdrop-blur">
                  {activeStep ? (
                    <>
                      <p className="hud-label">
                        Step {stepIndex + 1} of {STEPS.length}
                      </p>
                      <p
                        className={`mt-0.5 text-lg font-semibold ${poseOk ? 'hud-holding' : ''}`}
                        style={{ color: poseOk ? 'var(--measure)' : 'var(--ink)' }}
                      >
                        {activeStep.instruction}
                      </p>
                      <div className="hud-meter mt-2" data-ok={poseOk}>
                        <span style={{ width: `${holdProgress * 100}%` }} />
                      </div>
                      <p className="hud-label mt-1">
                        {!obs
                          ? 'No face detected'
                          : obs.faceCount > 1
                            ? `${obs.faceCount} faces in frame — only one person, please`
                            : poseOk
                              ? 'Hold still'
                              : 'Adjust to match the pose'}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold" style={{ color: 'var(--measure)' }}>
                      All {STEPS.length} poses captured
                    </p>
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Tracking readouts */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Readout label="Yaw" value={obs ? `${obs.yaw}°` : '—'} />
              <Readout label="Pitch" value={obs ? `${obs.pitch}°` : '—'} />
              <Readout label="Frame fill" value={obs ? `${Math.round(obs.relativeWidth * 100)}%` : '—'} />
            </div>
          </div>

          {/* Sequence */}
          <div>
            <p className="hud-label mb-2">Capture sequence</p>
            <ol className="space-y-2">
              {STEPS.map((s, i) => {
                const done = !!captured[s.id];
                const active = activeStep?.id === s.id;
                return (
                  <li
                    key={s.id}
                    className="hud-step flex items-center gap-3 rounded-lg px-3 py-2.5"
                    data-state={done ? 'done' : active ? 'active' : 'idle'}
                  >
                    <span
                      className="hud-readout flex size-6 shrink-0 items-center justify-center rounded-full text-xs"
                      style={{
                        border: `1px solid ${done ? 'var(--measure)' : active ? 'var(--signal)' : 'var(--grid)'}`,
                        color: done ? 'var(--measure)' : active ? 'var(--signal)' : 'var(--ink-dim)',
                      }}
                    >
                      {done ? <FiCheck className="size-3.5" /> : i + 1}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: done || active ? 'var(--ink)' : 'var(--ink-dim)' }}
                    >
                      {s.label}
                    </span>
                    {done && (
                      <button
                        type="button"
                        onClick={() =>
                          setCaptured((c) => {
                            const next = { ...c };
                            delete next[s.id];
                            return next;
                          })
                        }
                        className="ml-auto"
                        style={{ color: 'var(--ink-dim)' }}
                        aria-label={`Retake ${s.label}`}
                        title="Retake"
                      >
                        <FiRefreshCw className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* Feedback lives beside the button that causes it. Previously this only
                rendered on the picker screen, so a blocked save looked like a dead
                button. */}
            {blocked && (
              <div
                className="mt-5 rounded-lg border p-3"
                style={{ borderColor: 'var(--alert)', background: 'rgba(255,107,91,0.1)' }}
                role="alert"
              >
                <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                  <FiAlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--alert)' }} />
                  {blocked.message}
                </p>
                {blocked.overridable && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void save(true)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ background: 'var(--alert)', color: '#2b0b07' }}
                    >
                      Enrol anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlocked(null)}
                      className="rounded-lg border px-3 py-1.5 text-xs"
                      style={{ borderColor: 'var(--grid)', color: 'var(--ink-dim)' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {blocked.overridable && (
                  <p className="hud-label mt-2 leading-relaxed">
                    Only override if you are correcting a previous wrong enrolment. Two people
                    sharing a face means the kiosk cannot tell them apart.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={doneCount === 0 || addSamples.isPending}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
                style={{
                  background: doneCount === STEPS.length ? 'var(--measure)' : 'var(--grid)',
                  color: doneCount === STEPS.length ? '#06231f' : 'var(--ink)',
                }}
              >
                {addSamples.isPending ? 'Saving…' : `Save ${doneCount} sample${doneCount === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                onClick={() => setCaptured({})}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--grid)', color: 'var(--ink-dim)' }}
              >
                <FiX className="mr-1 inline size-3.5" /> Start over
              </button>
            </div>

            <p className="hud-label mt-4 leading-relaxed" style={{ letterSpacing: '0.08em' }}>
              Capture fires on its own once a pose holds steady. Good light on the face
              matters more than anything else here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-panel rounded-lg px-3 py-2">
      <p className="hud-label">{label}</p>
      <p className="hud-readout mt-0.5 text-base font-semibold" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
    </div>
  );
}
