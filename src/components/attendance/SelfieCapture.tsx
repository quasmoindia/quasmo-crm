import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FiCamera, FiRefreshCw } from 'react-icons/fi';
import { Button } from '../Button';

export interface SelfieCaptureHandle {
  /** Grabs the current live video frame as a JPEG blob (freezes the preview + fires onCapture too). */
  capture: () => Promise<Blob | null>;
}

type SelfieCaptureProps = {
  onCapture: (blob: Blob) => void;
  className?: string;
  /** Overrides the default "Take photo" button label/icon (e.g. a one-tap "Punch in" action). */
  captureLabel?: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
  disabled?: boolean;
  /** Hide the internal capture button — use when a parent button drives capture via the ref instead. */
  hideButton?: boolean;
  /** Tailwind aspect-ratio class for the video/preview frame (default 4:3). */
  aspectClassName?: string;
};

export const SelfieCapture = forwardRef<SelfieCaptureHandle, SelfieCaptureProps>(function SelfieCapture(
  { onCapture, className = '', captureLabel, variant = 'primary', disabled, hideButton, aspectClassName = 'aspect-[4/3]' },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('Camera access denied or unavailable.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth) {
        resolve(null);
        return;
      }
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, []);

  const capture = useCallback(async () => {
    const blob = await captureBlob();
    if (!blob) return null;
    setPreview(URL.createObjectURL(blob));
    onCapture(blob);
    return blob;
  }, [captureBlob, onCapture]);

  useImperativeHandle(ref, () => ({ capture }), [capture]);

  return (
    <div className={className}>
      {error ? (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          {preview ? (
            <img src={preview} alt="Selfie preview" className={`${aspectClassName} w-full object-cover`} />
          ) : (
            <video ref={videoRef} playsInline muted className={`${aspectClassName} w-full object-cover`} />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      {!error && !hideButton && (
        <Button
          type="button"
          variant={variant}
          disabled={disabled}
          className="mt-3 w-full py-4 text-lg"
          onClick={() => void capture()}
        >
          {preview ? (
            <>
              <FiRefreshCw className="size-6" /> Retake photo
            </>
          ) : (
            (captureLabel ?? (
              <>
                <FiCamera className="size-6" /> Take photo
              </>
            ))
          )}
        </Button>
      )}
    </div>
  );
});
