import { useState } from 'react';
import { FiCopy, FiPlus, FiSlash, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import {
  useCreateKioskDevice,
  useDeleteKioskDevice,
  useUpdateKioskDevice,
  useKioskDevices,
  useRegenerateKioskDevice,
  useRevokeKioskDevice,
  useSitesList,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { KioskDevice, KioskDeviceMode, WorkSite } from '../../types/attendance';

function siteName(workSiteId: KioskDevice['workSiteId']): string {
  if (typeof workSiteId === 'string') return workSiteId;
  return workSiteId?.name ?? 'Unknown site';
}

function setupLinkFor(rawToken: string): string {
  return `${window.location.origin}/attendance/kiosk-setup#token=${rawToken}`;
}

export function KioskDevices() {
  const { data: devicesData, isLoading } = useKioskDevices();
  const { data: sitesData } = useSitesList();
  // Delete is admin-only, matching the backend gate on the route.
  const { isAdmin } = useAttendancePermissions();
  const createDevice = useCreateKioskDevice();
  const updateDevice = useUpdateKioskDevice();
  const deleteDevice = useDeleteKioskDevice();
  const revokeDevice = useRevokeKioskDevice();
  const regenerateDevice = useRegenerateKioskDevice();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [workSiteId, setWorkSiteId] = useState('');
  const [mode, setMode] = useState<KioskDeviceMode>('simple');
  const [error, setError] = useState('');
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KioskDevice | null>(null);

  const devices = devicesData?.data ?? [];
  const sites: WorkSite[] = sitesData?.data ?? [];

  const resetForm = () => {
    setName('');
    setWorkSiteId('');
    setError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !workSiteId) {
      setError('Name and work site are required');
      return;
    }
    try {
      const result = await createDevice.mutateAsync({ name: name.trim(), workSiteId, mode });
      setRawToken(result.rawToken);
      resetForm();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this device? It will be signed out on its next request and must be paired again.')) {
      return;
    }
    await revokeDevice.mutateAsync(id);
  };

  const handleRegenerate = async (id: string) => {
    if (!window.confirm('Regenerate this device\'s token? The old setup link/token will stop working immediately.')) {
      return;
    }
    const result = await regenerateDevice.mutateAsync(id);
    setRawToken(result.rawToken);
  };

  const copySetupLink = async () => {
    if (!rawToken) return;
    await navigator.clipboard.writeText(setupLinkFor(rawToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Kiosk devices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pair a shared tablet at a worksite's entry gate so any employee there can punch in/out by tapping
            their own photo — no per-employee login needed.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <FiPlus className="size-4" /> New device
          </Button>
        )}
      </div>

      {showForm && (
        <Card title="New kiosk device">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Device name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main gate tablet" />
            <label className="block text-sm font-medium text-slate-700">
              Work site
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
                value={workSiteId}
                onChange={(e) => setWorkSiteId(e.target.value)}
              >
                <option value="">Select a site…</option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-700">Kiosk type</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ModeOption
                selected={mode === 'simple'}
                onSelect={() => setMode('simple')}
                title="Simple kiosk"
                body="Employees tap their photo to punch. No camera recognition, nothing extra to download."
              />
              <ModeOption
                selected={mode === 'face'}
                onSelect={() => setMode('face')}
                title="Face recognition kiosk"
                body="Camera identifies enrolled employees automatically. Tapping a name stays available as a fallback."
              />
            </div>
          </fieldset>

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex gap-3">
            <Button onClick={() => void handleCreate()} loading={createDevice.isPending}>
              Create device
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-slate-500">No kiosk devices yet. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Work site</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last used</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d._id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{d.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{siteName(d.workSiteId)}</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() =>
                          void updateDevice.mutateAsync({
                            id: d._id,
                            payload: { mode: d.mode === 'face' ? 'simple' : 'face' },
                          })
                        }
                        title="Switch kiosk type"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          d.mode === 'face'
                            ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {d.mode === 'face' ? 'Face recognition' : 'Simple'}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {d.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => void handleRegenerate(d._id)}>
                          <FiRefreshCw className="size-3.5" /> Regenerate
                        </Button>
                        {d.isActive && (
                          <Button variant="outline" className="px-2 py-1 text-xs text-rose-600" onClick={() => void handleRevoke(d._id)}>
                            <FiSlash className="size-3.5" /> Revoke
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            className="border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(d)}
                          >
                            <FiTrash2 className="size-3.5" /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Delete kiosk device</h3>
            <p className="mt-2 text-sm text-slate-600">
              Permanently remove <span className="font-medium">{deleteTarget.name}</span>? The tablet
              will stop working immediately and must be paired again from scratch.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Punches already recorded on this device are kept — attendance records store the work
              site, not the device.
            </p>
            {deleteTarget.isActive && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                This device is still active. If it is genuinely in service, Revoke keeps it in the
                list for audit instead of removing it.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteDevice.isPending}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteDevice.isPending}
                onClick={async () => {
                  try {
                    await deleteDevice.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setError((err as Error).message);
                    setDeleteTarget(null);
                  }
                }}
              >
                Delete device
              </Button>
            </div>
          </div>
        </div>
      )}

      {rawToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Device paired — set it up now</h3>
            <p className="mt-2 text-sm text-slate-600">
              This setup link is shown <strong>once</strong>. Open it on the gate tablet's browser to pair it — it
              will stay signed in until you revoke it.
            </p>
            <div className="mt-4 break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-800">
              {setupLinkFor(rawToken)}
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => void copySetupLink()}>
                <FiCopy className="size-4" /> {copied ? 'Copied!' : 'Copy link'}
              </Button>
              <Button variant="outline" onClick={() => setRawToken(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeOption({
  selected,
  onSelect,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border-2 p-3 text-left transition-colors ${
        selected ? 'border-[#305dff] bg-[#305dff]/5' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs text-slate-500">{body}</span>
    </button>
  );
}
