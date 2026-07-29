import { useCallback, useEffect, useRef, useState } from 'react';
import type { Human, FaceResult } from '@vladmandic/human';

/**
 * Wraps the Human face model for the kiosk: loads it lazily, runs a detection loop on a
 * live video element, and exposes the most recent face with its embedding.
 *
 * The library and its ~10 MB of weights are dynamically imported so they never enter
 * the main bundle — only pages that actually mount this hook pay for them.
 */

export interface FaceObservation {
  /** 1024-element embedding, absent until the description model has run on this face. */
  embedding: number[] | null;
  /** Detector confidence that this is a face at all. */
  score: number;
  /** Anti-spoof score, 0..1. Higher means more likely a real face than a photo. */
  real: number | null;
  /** Liveness score, 0..1, from a separate model to anti-spoof. */
  live: number | null;
  /** Head rotation in degrees; used to reject badly angled frames before matching. */
  yaw: number;
  pitch: number;
  /** Face box as a share of frame width — a proxy for "close enough to the camera". */
  relativeWidth: number;
  box: [number, number, number, number];
  /** How many faces were in the frame. >1 makes any capture ambiguous. */
  faceCount: number;
}

export type FaceEngineStatus = 'idle' | 'loading' | 'ready' | 'error';

const MODEL_BASE_PATH = '/human-models/';

export function useFaceEngine() {
  const humanRef = useRef<Human | null>(null);
  const [status, setStatus] = useState<FaceEngineStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadMs, setLoadMs] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (humanRef.current || status === 'loading') return;
    setStatus('loading');
    setError(null);
    const started = performance.now();
    try {
      const { Human: HumanCtor } = await import('@vladmandic/human');
      const human = new HumanCtor({
        modelBasePath: MODEL_BASE_PATH,
        backend: 'webgl',
        // Histogram equalisation meaningfully rescues backlit faces, which is the
        // single worst real-world condition at an entrance.
        filter: { enabled: true, equalization: true },
        face: {
          enabled: true,
          // Rotation correction lets a tilted head still produce a usable embedding.
          // maxDetected 2, not 1: we do not want a second face, we want to KNOW
          // there is one so enrolment can refuse the frame instead of silently
          // capturing whichever face won that frame.
          detector: { rotation: true, maxDetected: 2, return: false },
          mesh: { enabled: true },
          /**
           * skipFrames/skipTime forced to 0.
           *
           * The library defaults to caching an embedding for 99 frames or 3000ms. At a
           * kiosk that is a misidentification bug waiting to happen: our match only has
           * to hold for 800ms, so one person stepping away and the next stepping up
           * inside the cache window could be matched on the previous person's vector.
           * Recomputing every frame costs FPS and is worth it.
           */
          description: { enabled: true, skipFrames: 0, skipTime: 0 },
          antispoof: { enabled: true, skipFrames: 0, skipTime: 0 },
          liveness: { enabled: true, skipFrames: 0, skipTime: 0 },
          iris: { enabled: false },
          emotion: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      });
      await human.load();
      await human.warmup();
      humanRef.current = human;
      setLoadMs(Math.round(performance.now() - started));
      setStatus('ready');
    } catch (e) {
      setError((e as Error).message || 'Failed to load face models');
      setStatus('error');
    }
  }, [status]);

  useEffect(() => {
    return () => {
      humanRef.current = null;
    };
  }, []);

  /** Run one detection pass over the current video frame. */
  const detect = useCallback(async (video: HTMLVideoElement): Promise<FaceObservation | null> => {
    const human = humanRef.current;
    if (!human || video.readyState < 2) return null;

    const result = await human.detect(video);
    const faces = result.face ?? [];
    // Largest face wins when several are present, so the person at the kiosk beats
    // someone walking past behind them.
    const face: FaceResult | undefined = [...faces].sort((a, b) => b.box[2] - a.box[2])[0];
    if (!face) return null;

    const [, , boxWidth] = face.box;
    return {
      embedding: face.embedding ?? null,
      score: face.score ?? 0,
      real: face.real ?? null,
      live: face.live ?? null,
      yaw: Math.round(((face.rotation?.angle?.yaw ?? 0) * 180) / Math.PI),
      pitch: Math.round(((face.rotation?.angle?.pitch ?? 0) * 180) / Math.PI),
      relativeWidth: video.videoWidth > 0 ? boxWidth / video.videoWidth : 0,
      box: face.box as [number, number, number, number],
      faceCount: faces.length,
    };
  }, []);

  /** Normalised 0..1 similarity between two embeddings. */
  const similarity = useCallback((a: number[], b: number[]): number => {
    const human = humanRef.current;
    if (!human) return 0;
    return human.match.similarity(a, b);
  }, []);

  return { status, error, loadMs, load, detect, similarity };
}
