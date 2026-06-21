import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AttendanceSectionTabs } from '../../components/attendance/AttendanceSectionTabs';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import { AttendancePayroll } from './AttendancePayroll';
import { AttendanceReports } from './AttendanceReports';

type PayrollHubSection = 'payroll' | 'reports';

export function AttendancePayrollHub() {
  const { navAccess } = useAttendancePermissions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(() => {
    const items: { id: PayrollHubSection; label: string }[] = [];
    if (navAccess.canViewPayroll) items.push({ id: 'payroll', label: 'Payroll' });
    if (navAccess.canViewReports) items.push({ id: 'reports', label: 'Reports' });
    return items;
  }, [navAccess.canViewPayroll, navAccess.canViewReports]);

  const requested = searchParams.get('tab');
  const fallback = tabs[0]?.id ?? 'payroll';
  const section: PayrollHubSection =
    requested === 'reports' && navAccess.canViewReports
      ? 'reports'
      : requested === 'payroll' && navAccess.canViewPayroll
        ? 'payroll'
        : fallback;

  function setSection(next: PayrollHubSection) {
    navigate({ pathname: location.pathname, search: next === fallback ? '' : `?tab=${next}` }, { replace: true });
  }

  if (tabs.length === 0) return null;
  if (tabs.length === 1) {
    return tabs[0].id === 'payroll' ? <AttendancePayroll /> : <AttendanceReports />;
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
        <p className="mt-1 text-sm text-slate-500">Run payroll and review attendance reports.</p>
      </div>
      <AttendanceSectionTabs tabs={tabs} active={section} onChange={(id) => setSection(id as PayrollHubSection)} />
      {section === 'payroll' ? <AttendancePayroll embedded /> : <AttendanceReports embedded />}
    </div>
  );
}
