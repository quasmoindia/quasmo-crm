import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AttendanceSectionTabs } from '../../components/attendance/AttendanceSectionTabs';
import { AttendanceDashboard } from './AttendanceDashboard';
import { AttendanceRecords } from './AttendanceRecords';

type OverviewSection = 'today' | 'records';

export function AttendanceOverview() {
  const location = useLocation();
  const navigate = useNavigate();
  const section: OverviewSection = location.pathname.includes('/records') ? 'records' : 'today';

  const tabs = useMemo(
    () =>
      [
        { id: 'today' as const, label: 'Today' },
        { id: 'records' as const, label: 'Punch log' },
      ],
    []
  );

  function setSection(next: OverviewSection) {
    navigate(next === 'records' ? '/dashboard/attendance/records' : '/dashboard/attendance', { replace: true });
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Today&apos;s attendance snapshot and full punch history.</p>
      </div>
      <AttendanceSectionTabs tabs={tabs} active={section} onChange={(id) => setSection(id as OverviewSection)} />
      {section === 'today' ? <AttendanceDashboard embedded /> : <AttendanceRecords embedded />}
    </div>
  );
}
