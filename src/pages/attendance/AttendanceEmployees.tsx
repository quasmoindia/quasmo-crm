import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCreditCard, FiPlus, FiUpload, FiUsers, FiUserCheck } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import {
  useAttendanceSummary,
  useDeleteEmployee,
  useEmployeesList,
  useImportEmployees,
} from '../../api/attendance';
import { currentMonth, monthLabel, monthRange, shiftMonth } from '../../components/attendance/monthUtils';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { Employee } from '../../types/attendance';

function EmployeeAvatar({ employee }: { employee: Employee }) {
  if (employee.referencePhotoUrl) {
    return (
      <img
        src={employee.referencePhotoUrl}
        alt={employee.fullName}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
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
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 ring-2 ring-white">
      {initials || 'E'}
    </div>
  );
}

function StatusBadge({ status }: { status: Employee['status'] }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AttendanceEmployees() {
  const navigate = useNavigate();
  const { canManageEmployees, isAdmin, canAccessNav } = useAttendancePermissions();
  const [month, setMonth] = useState(currentMonth());
  const { data: summary } = useAttendanceSummary(monthRange(month));

  // Counts are shown inline here so nobody needs a separate "attendance summary" page.
  const countsByEmployee = useMemo(
    () => new Map((summary?.rows ?? []).map((r) => [r.employeeId, r])),
    [summary]
  );
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const { data, isLoading } = useEmployeesList({ search: searchQuery, page, limit: 20 });
  const importMutation = useImportEmployees();
  const deleteEmployee = useDeleteEmployee();

  const rows = data?.data ?? [];
  const linkedCount = useMemo(
    () => rows.filter((employee) => employee.userId && typeof employee.userId === 'object').length,
    [rows]
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">People</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your team and this month&apos;s attendance. Click anyone to see their calendar and fix a day.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <FiChevronLeft className="size-4" />
            </button>
            <span className="min-w-[8rem] text-center text-sm font-semibold text-slate-800">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"
            >
              <FiChevronRight className="size-4" />
            </button>
          </div>
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <FiUsers className="size-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total employees</p>
            <p className="text-2xl font-bold text-slate-800">{data?.pagination?.total ?? rows.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <FiUserCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">App linked (this page)</p>
            <p className="text-2xl font-bold text-slate-800">{linkedCount}</p>
          </div>
        </Card>
      </div>

      <Card>
        <DataTable<Employee>
          columns={[
            {
              key: 'name',
              label: 'Employee',
              render: (employee) => (
                <div className="flex items-center gap-3">
                  <EmployeeAvatar employee={employee} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{employee.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{employee.employeeCode}</p>
                  </div>
                </div>
              ),
            },
            { key: 'dept', label: 'Department', render: (employee) => employee.department ?? '—' },
            {
              key: 'attendance',
              label: `${monthLabel(month)} attendance`,
              render: (employee) => {
                const c = countsByEmployee.get(employee._id);
                if (!c) return <span className="text-sm text-slate-400">—</span>;
                return (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-emerald-700" title="Present">{c.presentDays}P</span>
                    <span className={c.absentDays > 0 ? 'font-medium text-rose-700' : 'text-slate-400'} title="Absent">
                      {c.absentDays}A
                    </span>
                    <span className="text-indigo-600" title="Week off">{c.weekOffDays}W</span>
                    <span className="text-violet-600" title="Holiday">{c.holidayDays}H</span>
                    {c.incompleteDays > 0 && (
                      <span
                        className="rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800"
                        title={`${c.incompleteDays} day(s) with no punch-out`}
                      >
                        {c.incompleteDays}!
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'app',
              label: 'App login',
              render: (employee) =>
                employee.userId && typeof employee.userId === 'object' ? (
                  <span className="text-sm text-teal-700">{employee.userId.fullName}</span>
                ) : (
                  <span className="text-sm text-slate-400">Not linked</span>
                ),
            },
            { key: 'status', label: 'Status', render: (employee) => <StatusBadge status={employee.status} /> },
          ]}
          data={rows}
          rowKey={(employee) => employee._id}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search by name, code, department...',
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
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#305dff] hover:bg-indigo-50"
                onClick={() => navigate(`/dashboard/attendance/employees/${employee._id}`)}
              >
                View
              </button>
              {canManageEmployees ? (
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  onClick={() => navigate(`/dashboard/attendance/employees/${employee._id}/edit`)}
                >
                  Edit
                </button>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteTarget(employee)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          )}
        />
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
