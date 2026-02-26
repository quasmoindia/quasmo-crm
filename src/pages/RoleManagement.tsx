import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useRolesList, useCreateRole, useUpdateRole } from '../api/roles';
import { useRolesConfig } from '../api/config';
import type { RoleRecord } from '../api/roles';

export function RoleManagement() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const { data, isLoading, isError, error } = useRolesList();
  const { data: configData } = useRolesConfig();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const roles = data?.data ?? [];
  const modulesFromConfig = configData?.modules;

  const columns = [
    { key: 'name', label: 'Name', render: (r: RoleRecord) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'label', label: 'Label', render: (r: RoleRecord) => r.label },
    { key: 'moduleIds', label: 'Modules', render: (r: RoleRecord) => (r.moduleIds.includes('*') ? 'All' : r.moduleIds.length) },
    {
      key: 'actions',
      label: '',
      render: (r: RoleRecord) => (
        <Button variant="outline" size="sm" onClick={() => setEditingRole(r)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Role management</h1>
        <Button onClick={() => setCreateOpen(true)}>Create role</Button>
      </div>

      <Card>
        {isError ? (
          <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
        ) : (
          <DataTable<RoleRecord>
            columns={columns}
            data={roles}
            rowKey={(r) => r._id}
            isLoading={isLoading}
            emptyMessage="No roles yet. Create one to assign module access."
          />
        )}
      </Card>

      {createOpen && (
        <RoleFormModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
          mutation={createMutation}
          modulesFromConfig={modulesFromConfig}
        />
      )}

      {editingRole && (
        <RoleFormModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSuccess={() => setEditingRole(null)}
          mutation={updateMutation}
          modulesFromConfig={modulesFromConfig}
        />
      )}
    </div>
  );
}

function RoleFormModal({
  role,
  onClose,
  onSuccess,
  mutation,
  modulesFromConfig,
}: {
  role?: RoleRecord;
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useCreateRole> | ReturnType<typeof useUpdateRole>;
  modulesFromConfig?: { id: string; label: string }[];
}) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [label, setLabel] = useState(role?.label ?? '');
  const [moduleIds, setModuleIds] = useState<string[]>(role?.moduleIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const modules = modulesFromConfig ?? [];

  function toggleModule(id: string) {
    if (id === '*') {
      setModuleIds((prev) => (prev.includes('*') ? [] : ['*']));
      return;
    }
    setModuleIds((prev) => {
      if (prev.includes('*')) return [id];
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim().toLowerCase();
    const trimmedLabel = label.trim();
    if (!trimmedName || !trimmedLabel) {
      setError('Name and label are required');
      return;
    }
    if (!isEdit && !/^[a-z0-9_]+$/.test(trimmedName)) {
      setError('Name can only contain lowercase letters, numbers and underscores');
      return;
    }
    const finalModuleIds = moduleIds.includes('*') ? ['*'] : moduleIds;

    if (isEdit) {
      (mutation as ReturnType<typeof useUpdateRole>).mutate(
        { id: role!._id, payload: { label: trimmedLabel, moduleIds: finalModuleIds } },
        { onSuccess, onError: (err: Error) => setError(err.message) }
      );
    } else {
      (mutation as ReturnType<typeof useCreateRole>).mutate(
        { name: trimmedName, label: trimmedLabel, moduleIds: finalModuleIds },
        { onSuccess, onError: (err: Error) => setError(err.message) }
      );
    }
  }

  const isPending = mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-form-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="role-form-title" className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Edit role' : 'Create role'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <Input
            label="Name (slug)"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. sales_manager"
            disabled={isEdit || isPending}
            required
          />
          <Input
            label="Label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Sales manager"
            disabled={isPending}
            required
          />
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Module access</span>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={moduleIds.includes('*')}
                  onChange={() => toggleModule('*')}
                  disabled={isPending}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium">All modules</span>
              </label>
              {modules.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={moduleIds.includes('*') || moduleIds.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    disabled={isPending}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save' : 'Create role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
