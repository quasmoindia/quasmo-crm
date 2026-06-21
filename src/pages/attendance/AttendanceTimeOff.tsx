import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AttendanceSectionTabs } from '../../components/attendance/AttendanceSectionTabs';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import { AttendanceHolidays } from './AttendanceHolidays';
import { AttendanceLeaves } from './AttendanceLeaves';

type TimeOffSection = 'leaves' | 'holidays';

export function AttendanceTimeOff() {
  const { navAccess } = useAttendancePermissions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(() => {
    const items: { id: TimeOffSection; label: string }[] = [];
    if (navAccess.canViewLeaves) items.push({ id: 'leaves', label: 'Leaves' });
    if (navAccess.canViewHolidays) items.push({ id: 'holidays', label: 'Holidays' });
    return items;
  }, [navAccess.canViewHolidays, navAccess.canViewLeaves]);

  const requested = searchParams.get('tab');
  const fallback = tabs[0]?.id ?? 'leaves';
  const section: TimeOffSection =
    requested === 'holidays' && navAccess.canViewHolidays
      ? 'holidays'
      : requested === 'leaves' && navAccess.canViewLeaves
        ? 'leaves'
        : fallback;

  function setSection(next: TimeOffSection) {
    navigate({ pathname: location.pathname, search: next === fallback ? '' : `?tab=${next}` }, { replace: true });
  }

  if (tabs.length === 0) return null;
  if (tabs.length === 1) {
    return tabs[0].id === 'leaves' ? <AttendanceLeaves /> : <AttendanceHolidays />;
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Time off</h1>
        <p className="mt-1 text-sm text-slate-500">Manage employee leaves and company holidays.</p>
      </div>
      <AttendanceSectionTabs tabs={tabs} active={section} onChange={(id) => setSection(id as TimeOffSection)} />
      {section === 'leaves' ? <AttendanceLeaves embedded /> : <AttendanceHolidays embedded />}
    </div>
  );
}
