import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useUsersList, useCreateUser, useUpdateUser } from '../api/users';
import { useRolesConfig } from '../api/config';
import type { UserRecord, RoleOption } from '../types/user';
import { getRoleLabel } from '../config/roles';

function useRoleLabels() {
  const { data } = useRolesConfig();
  return data?.roles ?? [];
}

/** Shows which modules the selected role has access to */
function RoleAccessSummary({
  roleId,
  roles,
  modules,
}: {
  roleId: string;
  roles: RoleOption[];
  modules: { id: string; label: string }[];
}) {
  const role = roles.find((r) => r.id === roleId);
  if (!role) return null;
  const moduleIds = role.moduleIds ?? [];
  const hasAll = moduleIds.includes('*');
  const labels = hasAll
    ? ['All modules']
    : moduleIds.map((id) => modules.find((m) => m.id === id)?.label ?? id);
  if (labels.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        This role has access to
      </p>
      <p className="text-sm text-slate-700">{labels.join(', ')}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserManagement() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const { data, isLoading, isError, error } = useUsersList();
  const roleLabels = useRoleLabels();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const users = data?.data ?? [];

  const columns = [
    { key: 'fullName', label: 'Full name', render: (u: UserRecord) => <span className="font-medium text-slate-800">{u.fullName}</span> },
    { key: 'email', label: 'Email', render: (u: UserRecord) => u.email },
    { key: 'role', label: 'Role', render: (u: UserRecord) => <span className="capitalize">{getRoleLabel(u.role, roleLabels)}</span> },
    { key: 'createdAt', label: 'Created', render: (u: UserRecord) => formatDate(u.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (u: UserRecord) => (
        <Button variant="outline" onClick={() => setEditingUser(u)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">User management</h1>
        <Button onClick={() => setCreateOpen(true)}>Create user</Button>
      </div>

      <Card>
        {isError ? (
          <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
        ) : (
          <DataTable<UserRecord>
            columns={columns}
            data={users}
            rowKey={(u) => u._id}
            isLoading={isLoading}
            emptyMessage="No users yet."
          />
        )}
      </Card>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
          mutation={createMutation}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => setEditingUser(null)}
          mutation={updateMutation}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSuccess,
  mutation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useCreateUser>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('user');
  const [error, setError] = useState<string | null>(null);
  const { data: rolesConfig } = useRolesConfig();
  const roles = rolesConfig?.roles ?? [];
  const modules = rolesConfig?.modules ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    mutation.mutate(
      { fullName: fullName.trim(), email: email.trim(), password, role: role || undefined, phone: phone.trim() || undefined },
      {
        onSuccess,
        onError: (err) => setError(err.message),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-user-title" className="text-lg font-semibold text-slate-800">
            Create user
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
            label="Full name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={mutation.isPending}
            required
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={mutation.isPending}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            disabled={mutation.isPending}
            showPasswordToggle
            required
          />
          <Input
            label="Phone (optional, for SMS)"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            disabled={mutation.isPending}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {roles.length > 0
                ? roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))
                : (
                    <>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                      {/* <option value="content_writer">Content writer</option> */}
                      {/* <option value="sales_manager">Sales manager</option> */}
                      <option value="technician">Technician</option>
                    </>
                  )}
            </select>
            <RoleAccessSummary roleId={role} roles={roles} modules={modules} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create user
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSuccess,
  mutation,
}: {
  user: UserRecord;
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useUpdateUser>;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [role, setRole] = useState<string>(user.role ?? 'user');
  const [error, setError] = useState<string | null>(null);
  const { data: rolesConfig } = useRolesConfig();
  const roles = rolesConfig?.roles ?? [];
  const modules = rolesConfig?.modules ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    mutation.mutate(
      { id: user._id, payload: { fullName: fullName.trim(), role: role || undefined, phone: phone.trim() || undefined } },
      { onSuccess, onError: (err: Error) => setError(err.message) }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-user-title" className="text-lg font-semibold text-slate-800">
            Edit user
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
            label="Full name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={mutation.isPending}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
          </div>
          <Input
            label="Phone (optional, for SMS)"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            disabled={mutation.isPending}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {roles.length > 0
                ? roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))
                : (
                    <>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                      {/* <option value="content_writer">Content writer</option> */}
                      {/* <option value="sales_manager">Sales manager</option> */}
                      <option value="technician">Technician</option>
                    </>
                  )}
            </select>
            <RoleAccessSummary roleId={role} roles={roles} modules={modules} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
