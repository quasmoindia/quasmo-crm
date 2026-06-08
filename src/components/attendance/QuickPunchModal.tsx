import { useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Button } from '../Button';
import type { GeoCoords } from '../../hooks/useAttendanceGeolocation';

type QuickPunchModalProps = {
  open: boolean;
  mode: 'in' | 'out';
  employeeName: string;
  employeeCode: string;
  referencePhotoUrl?: string | null;
  coords: GeoCoords | null;
  accuracyLabel: string;
  poorAccuracy: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (selfie: Blob) => void;
};

export function QuickPunchModal({
  open,
  mode,
  employeeName,
  employeeCode,
  referencePhotoUrl,
  coords,
  accuracyLabel,
  poorAccuracy,
  submitting,
  error,
  onClose,
  onConfirm,
}: QuickPunchModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCamError(null);
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
        setCamError('Camera access denied or unavailable.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const captureAndConfirm = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      'image/jpeg',
      0.85
    );
  };

  if (!open) return null;

  const actionLabel = mode === 'in' ? 'Capture & Punch In' : 'Capture & Punch Out';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{employeeName}</h3>
            <p className="text-xs text-slate-500">{employeeCode}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Live selfie</p>
              <div className="relative overflow-hidden rounded-xl bg-slate-900">
                {camError ? (
                  <p className="p-4 text-xs text-rose-200">{camError}</p>
                ) : (
                  <video ref={videoRef} playsInline muted className="aspect-3/4 w-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Reference photo</p>
              <div className="flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {referencePhotoUrl ? (
                  <img src={referencePhotoUrl} alt="Reference" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-xs text-slate-400">No reference photo</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-500">GPS accuracy</span>
            <span className={poorAccuracy ? 'font-medium text-amber-600' : 'font-medium text-slate-700'}>
              {accuracyLabel}
            </span>
          </div>

          {error && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}

          <Button
            type="button"
            fullWidth
            variant={mode === 'in' ? 'primary' : 'secondary'}
            disabled={!coords || submitting || !!camError}
            loading={submitting}
            onClick={captureAndConfirm}
          >
            {coords ? actionLabel : 'Waiting for GPS…'}
          </Button>
        </div>
      </div>
    </div>
  );
}
