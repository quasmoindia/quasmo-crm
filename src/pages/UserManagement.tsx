import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useUsersList, useCreateUser, useUpdateUser, useDeleteUser } from '../api/users';
import { useHexaUsersList, useCreateHexaUser, useUpdateHexaUser, useDeleteHexaUser } from '../api/hexaUsers';
import { useRolesConfig } from '../api/config';
import type { UserRecord, RoleOption } from '../types/user';
import type { HexaUserRecord } from '../types/hexaUser';
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

type UserTab = 'crm' | 'hexa';

export function UserManagement() {
  const [tab, setTab] = useState<UserTab>('crm');
  const [createOpen, setCreateOpen] = useState(false);
  const [hexaCreateOpen, setHexaCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingHexaUser, setEditingHexaUser] = useState<HexaUserRecord | null>(null);
  const { data, isLoading, isError, error } = useUsersList({ enabled: tab === 'crm' });
  const {
    data: hexaData,
    isLoading: hexaLoading,
    isError: hexaIsError,
    error: hexaError,
  } = useHexaUsersList({ enabled: tab === 'hexa' });
  const roleLabels = useRoleLabels();
  const createMutation = useCreateUser();
  const createHexaMutation = useCreateHexaUser();
  const updateHexaMutation = useUpdateHexaUser();
  const deleteHexaMutation = useDeleteHexaUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.data ?? [];
  const hexaUsers = hexaData?.data ?? [];

  const columns = [
    { key: 'fullName', label: 'Full name', render: (u: UserRecord) => <span className="font-medium text-slate-800">{u.fullName}</span> },
    { key: 'email', label: 'Email', render: (u: UserRecord) => u.email },
    { key: 'phone', label: 'Phone', render: (u: UserRecord) => u.phone ?? '—' },
    { key: 'role', label: 'Role', render: (u: UserRecord) => <span className="capitalize">{getRoleLabel(u.role, roleLabels)}</span> },
    { key: 'createdAt', label: 'Created', render: (u: UserRecord) => formatDate(u.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (u: UserRecord) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditingUser(u)}>
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm(`Delete user "${u.fullName}" (${u.email})? This cannot be undone.`)) {
                deleteMutation.mutate(u._id);
              }
            }}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const hexaColumns = [
    {
      key: 'fullName',
      label: 'Full name',
      render: (u: HexaUserRecord) => <span className="font-medium text-slate-800">{u.fullName}</span>,
    },
    { key: 'email', label: 'Email', render: (u: HexaUserRecord) => u.email },
    {
      key: 'createdAt',
      label: 'Created',
      render: (u: HexaUserRecord) => formatDate(u.createdAt),
    },
    {
      key: 'actions',
      label: '',
      render: (u: HexaUserRecord) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditingHexaUser(u)}>
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm(`Delete Hexa user "${u.fullName}" (${u.email})? This cannot be undone.`)) {
                deleteHexaMutation.mutate(u._id);
              }
            }}
            disabled={deleteHexaMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User management</h1>
          <p className="mt-1 text-sm text-slate-500">
            CRM staff accounts and separate Hexa portal logins ({' '}
            <code className="rounded bg-slate-100 px-1 text-xs">HexaUser</code>).
          </p>
        </div>
        {tab === 'crm' ? (
          <Button onClick={() => setCreateOpen(true)}>Create CRM user</Button>
        ) : (
          <Button onClick={() => setHexaCreateOpen(true)}>Create Hexa user</Button>
        )}
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1">
        <button
          type="button"
          onClick={() => setTab('crm')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'crm'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          CRM team
        </button>
        <button
          type="button"
          onClick={() => setTab('hexa')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'hexa'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hexa portal
        </button>
      </div>

      <Card>
        {tab === 'crm' ? (
          isError ? (
            <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
          ) : (
            <DataTable<UserRecord>
              columns={columns}
              data={users}
              rowKey={(u) => u._id}
              isLoading={isLoading}
              emptyMessage="No CRM users yet."
            />
          )
        ) : hexaIsError ? (
          <p className="py-8 text-center text-red-600">{(hexaError as Error).message}</p>
        ) : (
          <DataTable<HexaUserRecord>
            columns={hexaColumns}
            data={hexaUsers}
            rowKey={(u) => u._id}
            isLoading={hexaLoading}
            emptyMessage="No Hexa portal users yet."
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

      {hexaCreateOpen && (
        <CreateHexaUserModal
          onClose={() => setHexaCreateOpen(false)}
          onSuccess={() => setHexaCreateOpen(false)}
          mutation={createHexaMutation}
        />
      )}

      {editingHexaUser && (
        <EditHexaUserModal
          user={editingHexaUser}
          onClose={() => setEditingHexaUser(null)}
          onSuccess={() => setEditingHexaUser(null)}
          mutation={updateHexaMutation}
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

function CreateHexaUserModal({
  onClose,
  onSuccess,
  mutation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useCreateHexaUser>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      { fullName: fullName.trim(), email: email.trim(), password },
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
      aria-labelledby="create-hexa-user-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-hexa-user-title" className="text-lg font-semibold text-slate-800">
            Create Hexa portal user
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
        <p className="mb-4 text-sm text-slate-600">
          This account uses the Hexa auth flow (mobile / portal). It is not a CRM role or module assignment.
        </p>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create Hexa user
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditHexaUserModal({
  user,
  onClose,
  onSuccess,
  mutation,
}: {
  user: HexaUserRecord;
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useUpdateHexaUser>;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required');
      return;
    }
    if (password && password.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    mutation.mutate(
      {
        id: user._id,
        payload: {
          fullName: fullName.trim(),
          email: email.trim(),
          ...(password ? { password } : {}),
        },
      },
      { onSuccess, onError: (err: Error) => setError(err.message) }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-hexa-user-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-hexa-user-title" className="text-lg font-semibold text-slate-800">
            Edit Hexa portal user
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
            label="New password (optional)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            disabled={mutation.isPending}
            showPasswordToggle
          />
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
            placeholder="10-digit mobile e.g. 9876543210"
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
            placeholder="10-digit mobile e.g. 9876543210"
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
