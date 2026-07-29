import { FiAlertTriangle } from 'react-icons/fi';
import type { GeofencePreview } from '../../types/attendance';

export function GeofenceWarningBanner({ preview }: { preview: GeofencePreview | null }) {
  if (!preview) return null;
  const outside = !preview.insideGeofence;
  if (!outside && !preview.siteMismatch) return null;

  // A site mismatch alone is worth saying out loud, but it is not a blocker — the punch
  // still records and the day is flagged for HR rather than lost.
  if (!outside && preview.siteMismatch) {
    return (
      <div className="flex gap-3 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900">
        <FiAlertTriangle className="size-7 shrink-0 text-sky-600" />
        <div>
          <p className="font-semibold">Different work site</p>
          <p className="mt-1">
            You are usually assigned somewhere else. Your punch will still be recorded and
            marked for HR to review.
          </p>
          {preview.workSiteName && (
            <p className="mt-1 text-xs text-sky-800">This kiosk: {preview.workSiteName}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <FiAlertTriangle className="size-7 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">Outside work site</p>
        <p className="mt-1">{preview.warning ?? 'You are outside the allowed geofence.'}</p>
        {preview.workSiteName && (
          <p className="mt-1 text-xs text-amber-800">Site: {preview.workSiteName}</p>
        )}
        {preview.siteMismatch && (
          <p className="mt-1 text-xs font-medium text-amber-900">
            You are also assigned to a different site. The punch will be flagged for review.
          </p>
        )}
        {preview.maxGpsAccuracyMeters != null && (
          <p className="mt-1 text-xs text-amber-800">
            Max GPS accuracy: {preview.maxGpsAccuracyMeters}m (your reading: {preview.accuracyMeters}m)
          </p>
        )}
      </div>
    </div>
  );
}
