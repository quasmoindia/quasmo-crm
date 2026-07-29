import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiGrid } from 'react-icons/fi';
import { useKioskFaceGallery } from '../../api/attendance';
import { useFaceEngine, type FaceObservation } from '../../hooks/useFaceEngine';
import type { FaceGalleryEntry } from '../../types/attendance';
import '../../pages/attendance/faceHud.css';

/**
 * Camera-first identification for a paired kiosk.
 *
 * Identifying someone only selects them — the punch confirmation screen after this is
 * unchanged, so nobody is ever punched in without a deliberate tap. The tap-your-name
 * grid stays one button away and is the path for anyone not enrolled, not recognised,
 * or unwilling to use face recognition at all.
 */

export interface FaceMatchPayload {
  similarity: number;
  margin: number;
  real?: number;
  live?: number;
}

/** How long a match must hold before it is accepted — stops a passing face flickering
 *  someone onto the screen, and gives the person time to square up to the camera. */
const CONFIRM_MS = 800;
const MIN_FACE_WIDTH = 0.2;
const MAX_YAW = 28;

export function KioskFaceScanner({
  onIdentify,
  onUseDirectory,
}: {
  onIdentify: (employeeId: string, match: FaceMatchPayload) => void;
  onUseDirectory: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const holdRef = useRef<{ id: string; since: number } | null>(null);
  const firedRef = useRef(false);

  const { status, load, detect, similarity } = useFaceEngine();
  const gallery = useKioskFaceGallery(true);

  const [obs, setObs] = useState<FaceObservation | null>(null);
  const [candidate, setCandidate] = useState<{ entry: FaceGalleryEntry; sim: number; margin: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const entries = useMemo(() => gallery.data?.entries ?? [], [gallery.data]);
  const config = gallery.data?.config;
  const active = gallery.data?.enabled && entries.length > 0;

  useEffect(() => {
    if (active && status === 'idle') void load();
  }, [active, status, load]);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  const findMatch = useCallback(
    (embedding: number[]) => {
      let best: { entry: FaceGalleryEntry; score: number } | null = null;
      let second = 0;
      for (const entry of entries) {
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
      return { entry: best.entry, sim: best.score, margin: best.score - second };
    },
    [entries, similarity]
  );

  useEffect(() => {
    if (!active || status !== 'ready' || !config) return;
    let raf = 0;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && !busyRef.current && !firedRef.current) {
        busyRef.current = true;
        try {
          const next = await detect(video);
          setObs(next);

          const found = next?.embedding ? findMatch(next.embedding) : null;
          setCandidate(found);

          const spoofOk =
            config.antiSpoofMode !== 'block' ||
            next?.real == null ||
            next.real >= config.antiSpoofThreshold;

          // Second, independent signal. Off by default (threshold 0) until calibration
          // shows it separates live faces from photos on the real hardware.
          const livenessOk =
            !config.livenessThreshold ||
            next?.live == null ||
            next.live >= config.livenessThreshold;

          const usable =
            next &&
            found &&
            next.relativeWidth >= MIN_FACE_WIDTH &&
            Math.abs(next.yaw) <= MAX_YAW &&
            found.sim >= config.matchThreshold &&
            found.margin >= config.marginThreshold &&
            spoofOk &&
            livenessOk;

          if (usable && found) {
            const held = holdRef.current;
            if (!held || held.id !== found.entry.employeeId) {
              holdRef.current = { id: found.entry.employeeId, since: performance.now() };
              setProgress(0);
            } else {
              const elapsed = performance.now() - held.since;
              setProgress(Math.min(1, elapsed / CONFIRM_MS));
              if (elapsed >= CONFIRM_MS) {
                firedRef.current = true;
                onIdentify(found.entry.employeeId, {
                  similarity: found.sim,
                  margin: found.margin,
                  real: next?.real ?? undefined,
                  live: next?.live ?? undefined,
                });
              }
            }
          } else {
            holdRef.current = null;
            setProgress(0);
          }
        } catch {
          // Dropped frame; retry next tick.
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
  }, [active, status, config, detect, findMatch, onIdentify]);

  // Face recognition off, or nobody enrolled at this site — say so plainly rather than
  // showing a camera that can never succeed.
  if (!gallery.isLoading && !active) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-lg font-medium text-slate-800">
          {gallery.data?.enabled === false
            ? 'Face recognition is off'
            : 'No faces enrolled at this site yet'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {gallery.data?.enabled === false
            ? 'Turn it on in Attendance → Settings.'
            : 'Ask HR to enrol faces, or tap your name below.'}
        </p>
        <button
          type="button"
          onClick={onUseDirectory}
          className="mt-4 rounded-xl bg-[#305dff] px-6 py-3 text-base font-semibold text-white"
        >
          Find my name
        </button>
      </div>
    );
  }

  const box = obs?.box;
  const vw = videoRef.current?.videoWidth || 1;
  const vh = videoRef.current?.videoHeight || 1;
  const locked = progress > 0;

  return (
    <div className="hud hud-grid-bg p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--grid)' }}>
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full scale-x-[-1] object-cover" />

        {box && (
          <div
            className={`reticle ${locked ? 'is-locked' : ''}`}
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

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="hud-panel rounded-xl px-5 py-4 backdrop-blur">
            {status !== 'ready' ? (
              <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Starting camera…
              </p>
            ) : candidate && progress > 0 ? (
              <>
                <p className="hud-label">Identifying</p>
                <p className="mt-0.5 text-2xl font-bold" style={{ color: 'var(--measure)' }}>
                  {candidate.entry.fullName}
                </p>
                <div className="hud-meter mt-2" data-ok="true">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                  Look at the camera
                </p>
                <p className="hud-label mt-1">
                  {!obs
                    ? 'Waiting for a face'
                    : obs.relativeWidth < MIN_FACE_WIDTH
                      ? 'Step a little closer'
                      : Math.abs(obs.yaw) > MAX_YAW
                        ? 'Face the camera straight on'
                        : 'Hold still'}
                </p>
              </>
            )}
          </div>
        </div>

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
            {cameraError}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onUseDirectory}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-4 text-lg font-semibold"
        style={{ borderColor: 'var(--grid)', color: 'var(--ink)' }}
      >
        <FiGrid className="size-5" /> Find my name instead
      </button>
    </div>
  );
}
