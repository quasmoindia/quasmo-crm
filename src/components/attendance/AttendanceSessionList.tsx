import { useState } from 'react';
import { FiAlertTriangle, FiMapPin, FiMonitor, FiSmartphone, FiTablet, FiUser, FiUserCheck, FiX } from 'react-icons/fi';
import type { AttendancePunchDetail, AttendanceSessionDetail } from '../../types/attendance';
import { formatMinutes } from './dayTypeMeta';

/**
 * Read-only rendering of a day's punch sessions: selfies, times, device, location and
 * geofence state. Extracted so the employee calendar panel and the day overlay show
 * punches identically rather than each growing its own version.
 */

const DEVICE_META: Record<AttendancePunchDetail['deviceType'], { label: string; Icon: typeof FiSmartphone }> = {
  phone: { label: 'Phone', Icon: FiSmartphone },
  kiosk: { label: 'Kiosk', Icon: FiTablet },
  crm: { label: 'CRM', Icon: FiMonitor },
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function PunchCard({
  punch,
  label,
  onPhotoClick,
}: {
  punch: AttendancePunchDetail | null;
  label: string;
  onPhotoClick: (url: string, caption: string) => void;
}) {
  if (!punch) {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-sm font-medium text-amber-700">Still punched in</p>
        <p className="mt-1 text-[11px] text-amber-600">Use Regularize to add the missing punch-out.</p>
      </div>
    );
  }

  const device = DEVICE_META[punch.deviceType] ?? DEVICE_META.phone;
  const caption = `${label} · ${fmtTime(punch.at)}`;

  return (
    <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          <device.Icon className="size-3" aria-hidden />
          {device.label}
        </span>
      </div>

      {punch.selfieUrl ? (
        <button
          type="button"
          onClick={() => onPhotoClick(punch.selfieUrl, caption)}
          className="block w-full overflow-hidden rounded-md border border-slate-200 transition-shadow hover:shadow-md"
        >
          <img src={punch.selfieUrl} alt={`${label} selfie`} loading="lazy" className="h-32 w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          <FiUser className="size-6" aria-hidden />
          <span className="mt-1 text-[11px]">No photo</span>
        </div>
      )}

      <p className="mt-2 text-sm font-semibold text-slate-900">{fmtTime(punch.at)}</p>

      <a
        href={`https://www.google.com/maps?q=${punch.latitude},${punch.longitude}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800"
      >
        <FiMapPin className="size-3 shrink-0" aria-hidden />
        {punch.latitude.toFixed(5)}, {punch.longitude.toFixed(5)} · ±{Math.round(punch.accuracy)}m
      </a>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {punch.outsideGeofence && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            <FiAlertTriangle className="size-3" aria-hidden />
            Outside geofence
          </span>
        )}
        {punch.siteMismatch && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800"
            title="Punched at a kiosk belonging to a different work site than this employee is assigned to"
          >
            <FiMapPin className="size-3" aria-hidden />
            Different site
          </span>
        )}
        {punch.faceMatch && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800"
            title={
              `Identified by face at ${(punch.faceMatch.similarity * 100).toFixed(1)}% similarity` +
              `, ${(punch.faceMatch.margin * 100).toFixed(1)}% clear of the next candidate` +
              (punch.faceMatch.real != null
                ? `. Anti-spoof ${(punch.faceMatch.real * 100).toFixed(0)}%`
                : '')
            }
          >
            <FiUserCheck className="size-3" aria-hidden />
            Face matched {(punch.faceMatch.similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function AttendanceSessionList({
  sessions,
  emptyMessage = 'No punches recorded on this day.',
}: {
  sessions: AttendanceSessionDetail[];
  emptyMessage?: string;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null);

  if (sessions.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                Session {i + 1} of {sessions.length}
              </p>
              {session.durationMinutes !== null && (
                <span className="text-xs font-medium text-slate-600">
                  {formatMinutes(session.durationMinutes)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PunchCard punch={session.in} label="Punch in" onPhotoClick={(url, caption) => setLightbox({ url, caption })} />
              <PunchCard punch={session.out} label="Punch out" onPhotoClick={(url, caption) => setLightbox({ url, caption })} />
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="text-sm font-medium">{lightbox.caption}</p>
              <button type="button" onClick={() => setLightbox(null)} aria-label="Close photo">
                <FiX className="size-5" />
              </button>
            </div>
            <img src={lightbox.url} alt={lightbox.caption} className="max-h-[80vh] rounded-lg object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
