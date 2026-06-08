import { useEffect, useRef, useState } from 'react';
import { Button } from '../Button';

type SelfieCaptureProps = {
  onCapture: (blob: Blob) => void;
  className?: string;
};

export function SelfieCapture({ onCapture, className = '' }: SelfieCaptureProps) {
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

  const capture = () => {
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
        if (!blob) return;
        setPreview(URL.createObjectURL(blob));
        onCapture(blob);
      },
      'image/jpeg',
      0.85
    );
  };

  return (
    <div className={className}>
      {error ? (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          {preview ? (
            <img src={preview} alt="Selfie preview" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      {!error && (
        <Button type="button" className="mt-3 w-full" onClick={capture}>
          {preview ? 'Retake selfie' : 'Capture selfie'}
        </Button>
      )}
    </div>
  );
}
