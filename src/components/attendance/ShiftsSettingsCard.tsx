import { useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { DataTable } from '../DataTable';
import { useCreateShift, useDeleteShift, useShiftsList, useUpdateShift } from '../../api/attendance';
import type { Shift } from '../../types/attendance';

type ShiftsSettingsCardProps = {
  canEdit: boolean;
  isAdmin?: boolean;
};

export function ShiftsSettingsCard({ canEdit, isAdmin }: ShiftsSettingsCardProps) {
  const { data, isLoading } = useShiftsList();
  const createMutation = useCreateShift();
  const updateMutation = useUpdateShift();
  const deleteMutation = useDeleteShift();
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [form, setForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: '15',
    isDefault: false,
  });

  const openNew = () => {
    setEditing({ _id: '', name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, isDefault: false, isActive: true });
    setForm({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: '15', isDefault: false });
  };

  const openEdit = (shift: Shift) => {
    setEditing(shift);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: String(shift.graceMinutes),
      isDefault: shift.isDefault,
    });
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      graceMinutes: parseInt(form.graceMinutes, 10) || 0,
      isDefault: form.isDefault,
      isActive: true,
    };
    if (editing?._id) {
      await updateMutation.mutateAsync({ id: editing._id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setEditing(null);
  };

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Shifts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Work hours used to flag late punches. The default shift applies to employees without a specific one.
          </p>
        </div>
        {canEdit && <Button onClick={openNew}>Add shift</Button>}
      </div>
      <DataTable<Shift>
        columns={[
          { key: 'name', label: 'Name', render: (s) => s.name },
          { key: 'time', label: 'Hours', render: (s) => `${s.startTime} – ${s.endTime}` },
          { key: 'grace', label: 'Grace (min)', render: (s) => s.graceMinutes },
          { key: 'default', label: 'Default', render: (s) => (s.isDefault ? 'Yes' : '—') },
        ]}
        data={data?.data ?? []}
        rowKey={(s) => s._id}
        isLoading={isLoading}
        emptyMessage="No shifts configured."
        renderActions={(s) =>
          canEdit ? (
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => openEdit(s)}>
                Edit
              </button>
              {isAdmin && !s.isDefault && (
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setDeleteTarget(s)}>
                  Delete
                </button>
              )}
            </div>
          ) : null
        }
      />
      {editing && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <FiClock className="text-[#305dff]" />
              {editing._id ? 'Edit shift' : 'New shift'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Start (HH:mm)" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <Input label="End (HH:mm)" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <Input label="Grace minutes" value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                Default shift
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={save} loading={createMutation.isPending || updateMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete shift</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-medium">{deleteTarget.name}</span>? Employees assigned to this shift must be
              reassigned first.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync(deleteTarget._id);
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
    </Card>
  );
}
