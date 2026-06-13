import { useState } from 'react';
import { FiMapPin, FiNavigation } from 'react-icons/fi';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { DataTable } from '../DataTable';
import { useCreateSite, useDeleteSite, useSitesList, useUpdateSite } from '../../api/attendance';
import type { WorkSite } from '../../types/attendance';

type WorkSitesSettingsCardProps = {
  canEdit: boolean;
  isAdmin?: boolean;
  maxGpsAccuracyMeters: number;
};

export function WorkSitesSettingsCard({ canEdit, isAdmin, maxGpsAccuracyMeters }: WorkSitesSettingsCardProps) {
  const { data, isLoading } = useSitesList();
  const createMutation = useCreateSite();
  const updateMutation = useUpdateSite();
  const deleteMutation = useDeleteSite();
  const [editing, setEditing] = useState<WorkSite | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkSite | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: '150',
  });

  const openNew = () => {
    setEditing({ _id: '', name: '', latitude: 0, longitude: 0, radiusMeters: 150, isActive: true } as WorkSite);
    setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: '150' });
    setGeoError(null);
  };

  const openEdit = (site: WorkSite) => {
    setEditing(site);
    setForm({
      name: site.name,
      address: site.address ?? '',
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      radiusMeters: String(site.radiusMeters),
    });
    setGeoError(null);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
        setLocating(false);
      },
      () => {
        setGeoError('Could not get GPS. Allow location access and try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const save = async () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setGeoError('Name, latitude, and longitude are required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      latitude: lat,
      longitude: lng,
      radiusMeters: parseInt(form.radiusMeters, 10) || 150,
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
          <h2 className="font-semibold text-slate-800">Work sites & geofences</h2>
          <p className="mt-1 text-sm text-slate-500">
            Locations are loaded dynamically for punch checks. GPS accuracy must be ≤{' '}
            <strong>{maxGpsAccuracyMeters}m</strong> (configured in policies above).
          </p>
        </div>
        {canEdit && <Button onClick={openNew}>Add site</Button>}
      </div>
      <DataTable<WorkSite>
        columns={[
          { key: 'name', label: 'Name', render: (s) => s.name },
          { key: 'address', label: 'Address', render: (s) => s.address ?? '—' },
          { key: 'coords', label: 'Lat / Lng', render: (s) => `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}` },
          { key: 'radius', label: 'Radius (m)', render: (s) => s.radiusMeters },
        ]}
        data={data?.data ?? []}
        rowKey={(s) => s._id}
        isLoading={isLoading}
        emptyMessage="No work sites yet. Add your factory location."
        renderActions={(s) =>
          canEdit ? (
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => openEdit(s)}>
                Edit
              </button>
              {isAdmin && (
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <FiMapPin className="text-[#305dff]" />
              {editing._id ? 'Edit work site' : 'New work site'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input label="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Button type="button" variant="outline" fullWidth loading={locating} onClick={useCurrentLocation}>
                <FiNavigation className="size-4" />
                Use current location (GPS)
              </Button>
              {geoError && <p className="text-xs text-rose-600">{geoError}</p>}
              <Input label="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              <Input label="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              <Input
                label="Geofence radius (meters)"
                value={form.radiusMeters}
                onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={save} loading={createMutation.isPending || updateMutation.isPending}>
                Save site
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
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
            <h3 className="text-lg font-semibold text-slate-800">Delete work site</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-medium">{deleteTarget.name}</span>? Employees assigned to this site must be
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
