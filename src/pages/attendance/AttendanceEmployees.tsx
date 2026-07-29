import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { TableRowActions } from '../../components/TableRowActions';
import {
  useAttendanceSummary,
  useDeleteEmployee,
  useEmployeesList,
  useFaceEnrollment,
  useImportEmployees,
} from '../../api/attendance';
import { currentMonth, monthLabel, monthRange, shiftMonth } from '../../components/attendance/monthUtils';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceCounts, Employee } from '../../types/attendance';

function EmployeeAvatar({ employee }: { employee: Employee }) {
  if (employee.referencePhotoUrl) {
    return (
      <img
        src={employee.referencePhotoUrl}
        alt=""
        className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  const initials = employee.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 ring-2 ring-white">
      {initials || 'E'}
    </div>
  );
}

/**
 * Attendance as a proportion, not a code.
 *
 * The previous "5P 22A 4W 0H" needed a legend nobody had, and buried the one number
 * that matters — how much of the month this person actually worked. The bar makes a bad
 * month visible before you read any digits.
 */
function AttendanceBar({ counts }: { counts: AttendanceCounts | undefined }) {
  if (!counts || counts.totalDays === 0) {
    return <span className="text-sm text-slate-300">No data</span>;
  }

  const { presentDays, absentDays, weekOffDays, holidayDays } = counts;
  const leaveDays = counts.paidLeaveDays + counts.unpaidLeaveDays;
  const total = Math.max(1, counts.totalDays);
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="min-w-[10rem]">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className="bg-emerald-500" style={{ width: pct(presentDays) }} />
        <span className="bg-rose-400" style={{ width: pct(absentDays) }} />
        <span className="bg-sky-300" style={{ width: pct(leaveDays) }} />
        <span className="bg-violet-300" style={{ width: pct(holidayDays) }} />
        <span className="bg-slate-200" style={{ width: pct(weekOffDays) }} />
      </div>
      <p className="mt-1.5 text-sm">
        <span className="font-semibold text-slate-800">{presentDays}</span>
        <span className="text-slate-500"> present</span>
        {absentDays > 0 && (
          <>
            <span className="text-slate-300"> · </span>
            <span className="font-semibold text-rose-600">{absentDays}</span>
            <span className="text-rose-500"> absent</span>
          </>
        )}
        {counts.incompleteDays > 0 && (
          <span
            className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
            title={`${counts.incompleteDays} day(s) with no punch-out`}
          >
            {counts.incompleteDays} open
          </span>
        )}
      </p>
    </div>
  );
}

export function AttendanceEmployees() {
  const navigate = useNavigate();
  const { canManageEmployees, isAdmin, canAccessNav } = useAttendancePermissions();

  const [month, setMonth] = useState(currentMonth());
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data, isLoading } = useEmployeesList({ search: searchQuery, page, limit: 20 });
  const { data: summary } = useAttendanceSummary(monthRange(month));
  const { data: faces } = useFaceEnrollment();
  const importMutation = useImportEmployees();
  const deleteEmployee = useDeleteEmployee();

  const rows = data?.data ?? [];

  const countsByEmployee = useMemo(
    () => new Map((summary?.rows ?? []).map((r) => [r.employeeId, r])),
    [summary]
  );
  const facesByEmployee = useMemo(
    () => new Map((faces?.data ?? []).map((r) => [r.employeeId, r.sampleCount])),
    [faces]
  );
  const enrolledCount = useMemo(
    () => (faces?.data ?? []).filter((r) => r.sampleCount > 0).length,
    [faces]
  );

  const handleCsvImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsedRows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h === 'name' ? 'fullName' : h] = cols[i] ?? '';
        });
        return row;
      });
      await importMutation.mutateAsync(parsedRows);
    };
    input.click();
  };

  const totalEmployees = data?.pagination?.total ?? rows.length;

  return (
    <div>
      {/* One header row: identity on the left, actions on the right. The month picker
          belongs with the table, not up here — it only affects one column. */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">People</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your team and their attendance. Open anyone to see their calendar or fix a day.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageEmployees && (
            <Button variant="outline" onClick={() => navigate('/dashboard/attendance/face-enrollment')}>
              <FiCamera className="size-4" /> Face enrolment
            </Button>
          )}
          {canAccessNav('idCards') && (
            <Button variant="outline" onClick={() => navigate('/dashboard/attendance/id-cards')}>
              <FiCreditCard className="size-4" /> ID cards
            </Button>
          )}
          {canManageEmployees && (
            <>
              <Button variant="outline" onClick={handleCsvImport} loading={importMutation.isPending}>
                <FiUpload className="size-4" /> Import CSV
              </Button>
              <Button onClick={() => navigate('/dashboard/attendance/employees/new')}>
                <FiPlus className="size-4" /> Add employee
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        {/* Toolbar: the month stepper sits here because it scopes the attendance column,
            with the two counts that are actually worth a glance. */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Previous month"
            >
              <FiChevronLeft className="size-4" />
            </button>
            <span className="min-w-[8.5rem] text-center text-sm font-semibold text-slate-800">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Next month"
            >
              <FiChevronRight className="size-4" />
            </button>
          </div>

          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{totalEmployees}</span> people
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-800">{enrolledCount}</span> face-enrolled
          </p>
        </div>

        <DataTable<Employee>
          columns={[
            {
              key: 'name',
              label: 'Employee',
              render: (employee) => (
                <div className="flex items-center gap-3">
                  <EmployeeAvatar employee={employee} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{employee.fullName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {employee.employeeCode}
                      {employee.department ? ` · ${employee.department}` : ''}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'attendance',
              label: 'Attendance',
              render: (employee) => <AttendanceBar counts={countsByEmployee.get(employee._id)} />,
            },
            {
              key: 'face',
              label: 'Face ID',
              render: (employee) => {
                const samples = facesByEmployee.get(employee._id) ?? 0;
                if (samples > 0) {
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                      <FiCamera className="size-3" aria-hidden />
                      {samples}
                    </span>
                  );
                }
                if (!canManageEmployees) return <span className="text-sm text-slate-300">—</span>;
                return (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/attendance/face-enrollment')}
                    className="text-xs font-medium text-slate-400 hover:text-indigo-600"
                  >
                    Enrol
                  </button>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (employee) =>
                employee.status === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                    <span className="size-1.5 rounded-full bg-slate-300" aria-hidden />
                    Inactive
                  </span>
                ),
            },
          ]}
          data={rows}
          rowKey={(employee) => employee._id}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search name, code or department…',
            onSearchSubmit: () => {
              setSearchQuery(searchInput);
              setPage(1);
            },
          }}
          pagination={
            data?.pagination
              ? {
                  page: data.pagination.page,
                  totalPages: data.pagination.pages,
                  total: data.pagination.total,
                  limit: data.pagination.limit,
                  onPageChange: setPage,
                }
              : undefined
          }
          isLoading={isLoading}
          emptyMessage="No employees found."
          renderActions={(employee) => (
            <TableRowActions
              items={[
                {
                  key: 'view',
                  label: 'Open employee',
                  icon: FiEye,
                  variant: 'primary',
                  onClick: () => navigate(`/dashboard/attendance/employees/${employee._id}`),
                },
                {
                  key: 'edit',
                  label: 'Edit employee',
                  icon: FiEdit2,
                  hidden: !canManageEmployees,
                  onClick: () => navigate(`/dashboard/attendance/employees/${employee._id}/edit`),
                },
                {
                  key: 'delete',
                  label: 'Delete employee',
                  icon: FiTrash2,
                  variant: 'danger',
                  hidden: !isAdmin,
                  onClick: () => setDeleteTarget(employee),
                },
              ]}
            />
          )}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <LegendSwatch cls="bg-emerald-500" label="Present" />
          <LegendSwatch cls="bg-rose-400" label="Absent" />
          <LegendSwatch cls="bg-sky-300" label="Leave" />
          <LegendSwatch cls="bg-violet-300" label="Holiday" />
          <LegendSwatch cls="bg-slate-200" label="Week off" />
        </div>
      </Card>

      {importMutation.data?.errors?.length ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Imported {importMutation.data.created}. Errors: {importMutation.data.errors.join('; ')}
        </div>
      ) : null}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete employee</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteTarget.fullName}</span> ({deleteTarget.employeeCode})?
              This permanently removes all attendance records, leaves, and payroll adjustments.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteEmployee.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteEmployee.isPending}
                onClick={async () => {
                  try {
                    await deleteEmployee.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
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

function LegendSwatch({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-sm ${cls}`} aria-hidden />
      {label}
    </span>
  );
}
