import type { GeofencePreview } from '../../types/attendance';

export function GeofenceWarningBanner({ preview }: { preview: GeofencePreview | null }) {
  if (!preview || preview.insideGeofence) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Outside work site</p>
      <p className="mt-1">{preview.warning ?? 'You are outside the allowed geofence.'}</p>
      {preview.workSiteName && (
        <p className="mt-1 text-xs text-amber-800">Site: {preview.workSiteName}</p>
      )}
      {preview.maxGpsAccuracyMeters != null && (
        <p className="mt-1 text-xs text-amber-800">
          Max GPS accuracy: {preview.maxGpsAccuracyMeters}m (your reading: {preview.accuracyMeters}m)
        </p>
      )}
    </div>
  );
}
