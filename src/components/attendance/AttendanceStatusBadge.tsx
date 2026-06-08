import type { AttendanceRecordStatus } from '../../types/attendance';

const styles: Record<AttendanceRecordStatus, string> = {
  open: 'bg-sky-100 text-sky-800',
  complete: 'bg-emerald-100 text-emerald-800',
  flagged: 'bg-amber-100 text-amber-900',
};

const labels: Record<AttendanceRecordStatus, string> = {
  open: 'Open',
  complete: 'Complete',
  flagged: 'Flagged',
};

export function AttendanceStatusBadge({ status }: { status: AttendanceRecordStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
