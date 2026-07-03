import { FiAlertTriangle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import type { GeoCoords } from '../../hooks/useAttendanceGeolocation';

type GpsStatusBannerProps = {
  coords: GeoCoords | null;
  maxGpsAccuracyMeters: number;
  error: string | null;
  workSiteName?: string;
};

export function GpsStatusBanner({ coords, maxGpsAccuracyMeters, error, workSiteName }: GpsStatusBannerProps) {
  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
        <FiAlertTriangle className="size-6 shrink-0" />
        {error}
      </div>
    );
  }
  if (!coords) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        <FiLoader className="size-6 shrink-0 animate-spin" />
        Finding your location…
      </div>
    );
  }
  const poor = coords.accuracy > maxGpsAccuracyMeters;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 text-sm ${
        poor ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'
      }`}
    >
      {poor ? (
        <FiAlertTriangle className="size-6 shrink-0" />
      ) : (
        <FiCheckCircle className="size-6 shrink-0" />
      )}
      <div>
        <p>
          GPS accuracy: <strong>{Math.round(coords.accuracy)}m</strong>
          {poor ? (
            <> — above limit of {maxGpsAccuracyMeters}m. Move outdoors or wait for a better signal.</>
          ) : (
            <> — within {maxGpsAccuracyMeters}m limit.</>
          )}
        </p>
        {workSiteName && <p className="mt-1 text-xs opacity-80">Checking against: {workSiteName}</p>}
      </div>
    </div>
  );
}
