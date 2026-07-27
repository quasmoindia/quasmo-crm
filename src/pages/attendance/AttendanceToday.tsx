import { useSearchParams } from 'react-router-dom';
import { AttendanceSectionTabs } from '../../components/attendance/AttendanceSectionTabs';
import { NeedsAttentionPanel } from '../../components/attendance/NeedsAttentionPanel';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import { AttendanceDashboard } from './AttendanceDashboard';
import { AttendanceRecords } from './AttendanceRecords';
import { AttendanceRegularizations } from './AttendanceRegularizations';
import { AttendanceRoster } from './AttendanceRoster';

/**
 * The module's home page, folding what used to be three sidebar items — Overview,
 * Quick punch and Records — into one destination.
 *
 * "Needs attention" sits above the tabs deliberately: anything requiring a decision is
 * visible on arrival rather than behind a nav item someone has to know exists.
 */

type TodaySection = 'board' | 'punch' | 'log' | 'requests';

export function AttendanceToday() {
  const { canAccessNav } = useAttendancePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const canPunchForOthers = canAccessNav('roster');
  const canSeeRequests = canAccessNav('regularizations');
  const requested = searchParams.get('tab');

  const isAllowed = (id: string) =>
    (id !== 'punch' || canPunchForOthers) && (id !== 'requests' || canSeeRequests);
  const section: TodaySection =
    requested && ['log', 'punch', 'requests'].includes(requested) && isAllowed(requested)
      ? (requested as TodaySection)
      : 'board';

  const tabs = [
    { id: 'board', label: 'Live board' },
    ...(canPunchForOthers ? [{ id: 'punch', label: 'Quick punch' }] : []),
    { id: 'log', label: 'Punch log' },
    // Needs attention above handles pending requests at a glance; this tab keeps the
    // full history and the review-note flow that panel deliberately does not duplicate.
    ...(canSeeRequests ? [{ id: 'requests', label: 'Requests' }] : []),
  ];

  const setSection = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'board') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Today</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who is in, what needs fixing, and the full punch history.
        </p>
      </div>

      <NeedsAttentionPanel />

      <AttendanceSectionTabs tabs={tabs} active={section} onChange={setSection} />

      {section === 'board' && <AttendanceDashboard embedded />}
      {section === 'punch' && canPunchForOthers && <AttendanceRoster />}
      {section === 'log' && <AttendanceRecords embedded />}
      {section === 'requests' && canSeeRequests && <AttendanceRegularizations />}
    </div>
  );
}
