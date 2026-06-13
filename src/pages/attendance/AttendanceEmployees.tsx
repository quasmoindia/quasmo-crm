import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiUpload } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { useDeleteEmployee, useEmployeesList, useImportEmployees } from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { Employee } from '../../types/attendance';

export function AttendanceEmployees() {
  const navigate = useNavigate();
  const { canManageEmployees, isAdmin } = useAttendancePermissions();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const { data, isLoading } = useEmployeesList({ search: searchQuery, page, limit: 20 });
  const importMutation = useImportEmployees();
  const deleteEmployee = useDeleteEmployee();

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
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h === 'name' ? 'fullName' : h] = cols[i] ?? '';
        });
        return row;
      });
      await importMutation.mutateAsync(rows);
    };
    input.click();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
        {canManageEmployees && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCsvImport} loading={importMutation.isPending}>
              <FiUpload className="size-4" /> Import CSV
            </Button>
            <Button onClick={() => navigate('/dashboard/attendance/employees/new')}>
              <FiPlus className="size-4" /> Add employee
            </Button>
          </div>
        )}
      </div>
      <Card>
        <DataTable<Employee>
          columns={[
            { key: 'code', label: 'Code', render: (e) => <span className="font-medium">{e.employeeCode}</span> },
            { key: 'name', label: 'Name', render: (e) => e.fullName },
            { key: 'phone', label: 'Phone', render: (e) => e.phone ?? '—' },
            { key: 'dept', label: 'Department', render: (e) => e.department ?? '—' },
            { key: 'status', label: 'Status', render: (e) => e.status },
          ]}
          data={data?.data ?? []}
          rowKey={(e) => e._id}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search employees...',
            onSearchSubmit: () => { setSearchQuery(searchInput); setPage(1); },
          }}
          pagination={data?.pagination ? {
            page: data.pagination.page,
            totalPages: data.pagination.pages,
            total: data.pagination.total,
            limit: data.pagination.limit,
            onPageChange: setPage,
          } : undefined}
          isLoading={isLoading}
          emptyMessage="No employees found."
          renderActions={(e) => (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="text-sm text-[#305dff] hover:underline"
                onClick={() => navigate(`/dashboard/attendance/employees/${e._id}`)}
              >
                View
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => setDeleteTarget(e)}
                >
                  Delete
                </button>
              )}
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
