import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { AttendanceSectionTabs } from '../../components/attendance/AttendanceSectionTabs';
import { EmployeeAttendanceSection } from '../../components/attendance/EmployeeAttendanceSection';
import { EmployeePayrollSection } from '../../components/attendance/EmployeePayrollSection';
import { EmployeeProfileSection } from '../../components/attendance/EmployeeProfileSection';
import { generateIdCardsPdf, triggerBlobDownload, useDeleteEmployee, useEmployee } from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';

const TAB_IDS = ['profile', 'attendance', 'payroll'] as const;
type TabId = (typeof TAB_IDS)[number];

export function AttendanceEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageEmployees, isAdmin, canAccessNav } = useAttendancePermissions();
  const { data: employee, isLoading } = useEmployee(id);
  const deleteEmployee = useDeleteEmployee();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloadingIdCard, setDownloadingIdCard] = useState(false);
  const [idCardError, setIdCardError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const canSeePayroll = canAccessNav('payrollHub');
  const tabs = [
    { id: 'profile', label: 'Personal details' },
    { id: 'attendance', label: 'Attendance' },
    ...(canSeePayroll ? [{ id: 'payroll', label: 'Payroll' }] : []),
  ];

  // The tab lives in the URL alongside the attendance section's ?month=, so a link to a
  // specific tab (and month) survives a refresh and can be shared.
  const tabParam = searchParams.get('tab');
  const requested = TAB_IDS.includes(tabParam as TabId) ? (tabParam as TabId) : 'profile';
  const activeTab = requested === 'payroll' && !canSeePayroll ? 'profile' : requested;

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  async function downloadIdCard() {
    if (!employee) return;
    setDownloadingIdCard(true);
    setIdCardError('');
    try {
      const blob = await generateIdCardsPdf({ employeeIds: [employee._id] });
      triggerBlobDownload(blob, `id-card-${employee.employeeCode}.pdf`);
    } catch (err) {
      setIdCardError(err instanceof Error ? err.message : 'Failed to generate ID card');
    } finally {
      setDownloadingIdCard(false);
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!employee) return <p className="text-slate-500">Employee not found.</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {employee.referencePhotoUrl ? (
            <img
              src={employee.referencePhotoUrl}
              alt={employee.fullName}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400">
              {employee.fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{employee.fullName}</h1>
            <p className="text-sm text-slate-500">{employee.employeeCode} · {employee.department ?? 'No department'}</p>
          </div>
        </div>
        {(canManageEmployees || canAccessNav('idCards')) && (
          <div className="flex flex-wrap gap-2">
            {canAccessNav('idCards') && (
              <Button variant="outline" loading={downloadingIdCard} onClick={() => void downloadIdCard()}>
                <FiCreditCard className="size-4" /> Generate ID card
              </Button>
            )}
            {canManageEmployees && (
              <Button onClick={() => navigate(`/dashboard/attendance/employees/${id}/edit`)}>Edit</Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {idCardError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {idCardError}
        </p>
      ) : null}

      <AttendanceSectionTabs tabs={tabs} active={activeTab} onChange={setTab} />

      {activeTab === 'profile' && <EmployeeProfileSection employee={employee} />}
      {activeTab === 'attendance' && id && (
        <EmployeeAttendanceSection employeeId={id} employeeName={employee.fullName} />
      )}
      {activeTab === 'payroll' && id && (
        <EmployeePayrollSection employeeId={id} employeeCode={employee.employeeCode} />
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete employee</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{employee.fullName}</span> ({employee.employeeCode})?
              This permanently removes all attendance records, leaves, and payroll adjustments for this employee.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteEmployee.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteEmployee.isPending}
                onClick={async () => {
                  try {
                    await deleteEmployee.mutateAsync(employee._id);
                    navigate('/dashboard/attendance/employees');
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
