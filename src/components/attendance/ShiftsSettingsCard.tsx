import { useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { DataTable } from '../DataTable';
import { useCreateShift, useShiftsList, useUpdateShift } from '../../api/attendance';
import type { Shift } from '../../types/attendance';

type ShiftsSettingsCardProps = {
  canEdit: boolean;
};

export function ShiftsSettingsCard({ canEdit }: ShiftsSettingsCardProps) {
  const { data, isLoading } = useShiftsList();
  const createMutation = useCreateShift();
  const updateMutation = useUpdateShift();
  const [editing, setEditing] = useState<Shift | null>(null);
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
            <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => openEdit(s)}>
              Edit
            </button>
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
    </Card>
  );
}
