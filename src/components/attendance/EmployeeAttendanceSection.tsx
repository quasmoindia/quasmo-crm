import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../Card';
import { useEmployeeAttendanceSummary } from '../../api/attendance';
import { AttendanceCountsStrip } from './AttendanceCountsStrip';
import { AttendanceDayDetailPanel } from './AttendanceDayDetailPanel';
import { AttendanceMonthCalendar } from './AttendanceMonthCalendar';
import { EmployeeDayDrawer } from './EmployeeDayDrawer';
import { currentMonth, monthRange } from './monthUtils';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Month-at-a-glance attendance for one employee: counts, a colour-coded calendar, and
 * the punch sessions (with selfies) for whichever day is selected.
 *
 * The month lives in the URL so the view is linkable and survives a refresh.
 */
export function EmployeeAttendanceSection({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const { canCorrectRecords } = useAttendancePermissions();
  const [fixDate, setFixDate] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const month = monthParam && MONTH_PATTERN.test(monthParam) ? monthParam : currentMonth();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const range = useMemo(() => monthRange(month), [month]);
  const { data, isLoading, isError, error } = useEmployeeAttendanceSummary(employeeId, range);

  const setMonth = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('month', next);
    setSearchParams(params, { replace: true });
  };

  // No effect needed to clear the selection on month change: days only ever cover the
  // loaded month, so a date left over from another month simply matches nothing.
  const selectedDay = data?.days.find((d) => d.date === selectedDate) ?? null;

  return (
    <Card>
      {isError ? (
        <p className="py-6 text-center text-sm text-red-600">{(error as Error).message}</p>
      ) : (
        <>
          {data && (
            <div className="mb-5">
              <AttendanceCountsStrip counts={data.counts} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <AttendanceMonthCalendar
              month={month}
              days={data?.days ?? []}
              selectedDate={selectedDate}
              onMonthChange={setMonth}
              onSelectDate={setSelectedDate}
              isLoading={isLoading}
            />
            <AttendanceDayDetailPanel
              day={selectedDay}
              onFix={canCorrectRecords ? setFixDate : undefined}
            />
          </div>
        </>
      )}

      {fixDate && (
        <EmployeeDayDrawer
          employeeId={employeeId}
          employeeName={employeeName}
          date={fixDate}
          initialTab="regularize"
          onClose={() => setFixDate(null)}
        />
      )}
    </Card>
  );
}
