import type { ReactNode } from 'react';

export type EmployeePhotoGridShift = {
  name: string;
  startTime: string;
  endTime: string;
};

export type EmployeePhotoGridItem = {
  _id: string;
  fullName: string;
  employeeCode: string;
  referencePhotoUrl?: string | null;
  department?: string | null;
  shift?: EmployeePhotoGridShift | null;
};

function formatShiftTime(time: string) {
  const [hh, mm] = time.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function shiftTimingLabel(shift?: EmployeePhotoGridShift | null) {
  if (!shift) return null;
  return `${formatShiftTime(shift.startTime)} – ${formatShiftTime(shift.endTime)}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

type EmployeePhotoGridProps<T extends EmployeePhotoGridItem> = {
  employees: T[];
  onSelect?: (employee: T) => void;
  renderFooter?: (employee: T) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  size?: 'large' | 'xlarge';
};

export function EmployeePhotoGrid<T extends EmployeePhotoGridItem>({
  employees,
  onSelect,
  renderFooter,
  loading,
  emptyMessage = 'No employees found.',
  size = 'large',
}: EmployeePhotoGridProps<T>) {
  const photoClass = size === 'xlarge' ? 'aspect-square' : 'aspect-4/5';
  const nameClass = size === 'xlarge' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg';
  const gridClass =
    size === 'xlarge'
      ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  if (loading) {
    return <p className="py-12 text-center text-lg text-slate-500">Loading employees…</p>;
  }

  if (employees.length === 0) {
    return <p className="py-12 text-center text-lg text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className={gridClass}>
      {employees.map((emp) => {
        const interactive = Boolean(onSelect);
        const Wrapper = interactive ? 'button' : 'div';
        return (
          <Wrapper
            key={emp._id}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onSelect!(emp) : undefined}
            className={`flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm transition-all ${
              interactive
                ? 'cursor-pointer hover:border-[#305dff] hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#305dff] focus:ring-offset-2'
                : ''
            }`}
          >
            <div className={`relative w-full overflow-hidden bg-slate-100 ${photoClass}`}>
              {emp.referencePhotoUrl ? (
                <img
                  src={emp.referencePhotoUrl}
                  alt={emp.fullName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
                  <span className="text-4xl font-bold text-slate-400 sm:text-5xl">{initials(emp.fullName)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className={`line-clamp-2 font-bold leading-tight text-slate-900 ${nameClass}`}>{emp.fullName}</p>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{emp.employeeCode}</p>
              {emp.department ? (
                <p className="line-clamp-1 text-xs text-slate-400">{emp.department}</p>
              ) : null}
              {emp.shift ? (
                <p className="line-clamp-1 text-xs font-medium text-[#305dff]">
                  {emp.shift.name} · {shiftTimingLabel(emp.shift)}
                </p>
              ) : null}
              {renderFooter?.(emp)}
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
