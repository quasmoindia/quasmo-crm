import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiCamera, FiUpload } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { SearchableSelect } from '../../components/SearchableSelect';
import { SelfieCapture } from '../../components/attendance/SelfieCapture';
import {
  useCreateEmployee,
  useEmployee,
  useLinkableUsers,
  useShiftsList,
  useSitesList,
  useUpdateEmployee,
  useUploadEmployeePhoto,
  useUploadEmployeeDocument,
} from '../../api/attendance';

export function AttendanceEmployeeForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  const employeeId = isNew ? undefined : id;
  const navigate = useNavigate();
  const { data: existing } = useEmployee(employeeId);
  const { data: shifts } = useShiftsList();
  const { data: sites } = useSitesList();
  const { data: linkableUsers, isLoading: usersLoading } = useLinkableUsers();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const uploadPhoto = useUploadEmployeePhoto();
  const uploadDoc = useUploadEmployeeDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    department: '',
    designation: '',
    shiftId: '',
    defaultWorkSiteId: '',
    userId: '',
    status: 'active' as 'active' | 'inactive',
    payType: 'hourly' as 'hourly' | 'daily' | 'monthly',
    payRate: '',
    dateOfJoining: '',
    dateOfBirth: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    bloodGroup: '',
    maritalStatus: '' as '' | 'single' | 'married' | 'other',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
    uanNumber: '',
    esicNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    pfApplicable: true,
    esiApplicable: true,
    ptApplicable: true,
  });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aadhaarFrontDoc, setAadhaarFrontDoc] = useState<File | null>(null);
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState<File | null>(null);
  const [panDoc, setPanDoc] = useState<File | null>(null);
  const [aadhaarFrontDocUrl, setAadhaarFrontDocUrl] = useState<string | null>(null);
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState<string | null>(null);
  const [panDocUrl, setPanDocUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    const dateInput = (v?: string) => (v ? v.slice(0, 10) : '');
    setForm({
      fullName: existing.fullName,
      phone: existing.phone ?? '',
      email: existing.email ?? '',
      department: existing.department ?? '',
      designation: existing.designation ?? '',
      shiftId: typeof existing.shiftId === 'object' ? existing.shiftId?._id ?? '' : existing.shiftId ?? '',
      defaultWorkSiteId:
        typeof existing.defaultWorkSiteId === 'object'
          ? existing.defaultWorkSiteId?._id ?? ''
          : existing.defaultWorkSiteId ?? '',
      userId: typeof existing.userId === 'object' ? existing.userId?._id ?? '' : existing.userId ?? '',
      status: existing.status,
      payType: existing.payType ?? 'hourly',
      payRate: existing.payRate != null ? String(existing.payRate) : '',
      dateOfJoining: dateInput(existing.dateOfJoining),
      dateOfBirth: dateInput(existing.dateOfBirth),
      gender: existing.gender ?? '',
      bloodGroup: existing.bloodGroup ?? '',
      maritalStatus: existing.maritalStatus ?? '',
      address: existing.address ?? '',
      aadhaarNumber: existing.aadhaarNumber ?? '',
      panNumber: existing.panNumber ?? '',
      uanNumber: existing.uanNumber ?? '',
      esicNumber: existing.esicNumber ?? '',
      bankAccountNumber: existing.bankAccountNumber ?? '',
      bankIfsc: existing.bankIfsc ?? '',
      bankName: existing.bankName ?? '',
      emergencyContactName: existing.emergencyContactName ?? '',
      emergencyContactPhone: existing.emergencyContactPhone ?? '',
      emergencyContactRelation: existing.emergencyContactRelation ?? '',
      pfApplicable: existing.pfApplicable ?? true,
      esiApplicable: existing.esiApplicable ?? true,
      ptApplicable: existing.ptApplicable ?? true,
    });
    if (existing.referencePhotoUrl) setPhotoPreview(existing.referencePhotoUrl);
    setAadhaarFrontDocUrl(existing.aadhaarFrontDocUrl ?? null);
    setAadhaarBackDocUrl(existing.aadhaarBackDocUrl ?? null);
    setPanDocUrl(existing.panDocUrl ?? null);
  }, [existing]);

  const setBlob = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setShowCamera(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBlob(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      shiftId: form.shiftId || undefined,
      defaultWorkSiteId: form.defaultWorkSiteId || undefined,
      payRate: form.payRate === '' ? 0 : Number(form.payRate),
      gender: form.gender || undefined,
      maritalStatus: form.maritalStatus || undefined,
      dateOfJoining: form.dateOfJoining || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
    };
    try {
      let targetId = employeeId;
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        targetId = created._id;
      } else if (employeeId) {
        await updateMutation.mutateAsync({ id: employeeId, payload });
      }
      if (photoBlob && targetId) {
        await uploadPhoto.mutateAsync({ id: targetId, photo: photoBlob });
      }
      if (aadhaarFrontDoc && targetId) {
        await uploadDoc.mutateAsync({ id: targetId, type: 'aadhaar_front', file: aadhaarFrontDoc });
      }
      if (aadhaarBackDoc && targetId) {
        await uploadDoc.mutateAsync({ id: targetId, type: 'aadhaar_back', file: aadhaarBackDoc });
      }
      if (panDoc && targetId) {
        await uploadDoc.mutateAsync({ id: targetId, type: 'pan', file: panDoc });
      }
      navigate('/dashboard/attendance/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    }
  };

  const saving =
    createMutation.isPending || updateMutation.isPending || uploadPhoto.isPending || uploadDoc.isPending;

  const rateLabel = form.payType === 'hourly' ? 'Rate / hour' : form.payType === 'daily' ? 'Rate / day' : 'Salary / month';

  const userOptions = (linkableUsers?.data ?? []).map((u) => {
    const takenByOther = u.linkedEmployee && u.linkedEmployee.id !== employeeId;
    return {
      value: u._id,
      label: u.fullName + (takenByOther ? ' (already linked)' : ''),
      meta: [
        u.email,
        u.phone,
        takenByOther ? `Linked to ${u.linkedEmployee!.fullName} (${u.linkedEmployee!.employeeCode})` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl pb-24">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Add employee' : 'Edit employee'}</h1>
          <p className="text-sm text-slate-500">Only the name is required — fill the rest as available.</p>
        </div>
        <div className="hidden gap-3 sm:flex">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/attendance/employees')}>Cancel</Button>
          <Button type="submit" loading={saving}>Save employee</Button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="space-y-6">
        <Card>
          <SectionTitle title="Basic details" />
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {photoPreview ? (
                  <img src={photoPreview} alt="Employee" className="h-full w-full object-cover" />
                ) : (
                  <FiCamera className="text-slate-300" size={34} />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCamera((v) => !v)}>
                  <FiCamera className="size-4" /> {showCamera ? 'Close' : 'Camera'}
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FiUpload className="size-4" /> Upload
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
              <p className="max-w-32 text-center text-xs text-slate-400">Reference for attendance selfies.</p>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <Input label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </div>
          </div>
          {showCamera && <SelfieCapture className="mt-4" onCapture={setBlob} />}
        </Card>

        <Card>
          <SectionTitle title="Job & pay" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Shift" value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}>
              <option value="">Default shift</option>
              {(shifts?.data ?? []).map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </SelectField>
            <SelectField label="Work site" value={form.defaultWorkSiteId} onChange={(e) => setForm({ ...form, defaultWorkSiteId: e.target.value })}>
              <option value="">Select site</option>
              {(sites?.data ?? []).map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </SelectField>
            <SelectField label="Pay type" value={form.payType} onChange={(e) => setForm({ ...form, payType: e.target.value as 'hourly' | 'daily' | 'monthly' })}>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </SelectField>
            <Input label={rateLabel} type="number" value={form.payRate} onChange={(e) => setForm({ ...form, payRate: e.target.value })} />
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="App access"
            optional
            hint="Link a CRM user account so this employee can punch attendance from the mobile app for themselves."
          />
          <div className="max-w-md">
            <SearchableSelect
              label="Linked app user"
              value={form.userId}
              onChange={(value) => setForm({ ...form, userId: value })}
              options={userOptions}
              loading={usersLoading}
              placeholder="Not linked"
              searchPlaceholder="Search by name, email or phone..."
              emptyText="No app users found"
            />
            <p className="mt-2 text-xs text-slate-400">
              The employee logs into the mobile app with this user's email and password to mark their own attendance.
              Leave empty if they don't punch from a phone.
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Employment & personal" optional />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Date of joining" type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            <Input label="Blood group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. O+" />
            <SelectField label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </SelectField>
            <SelectField label="Marital status" value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value as typeof form.maritalStatus })}>
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="other">Other</option>
            </SelectField>
            <div className="sm:col-span-2 lg:col-span-3">
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Identity documents" optional />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Input label="Aadhaar number" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <DocUpload label="Aadhaar front" currentUrl={aadhaarFrontDocUrl} file={aadhaarFrontDoc} onPick={setAadhaarFrontDoc} onClear={() => setAadhaarFrontDoc(null)} />
                <DocUpload label="Aadhaar back" currentUrl={aadhaarBackDocUrl} file={aadhaarBackDoc} onPick={setAadhaarBackDoc} onClear={() => setAadhaarBackDoc(null)} />
              </div>
            </div>
            <div className="space-y-3">
              <Input label="PAN number" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
              <DocUpload label="PAN card scan" currentUrl={panDocUrl} file={panDoc} onPick={setPanDoc} onClear={() => setPanDoc(null)} />
            </div>
            <Input label="UAN (PF) number" value={form.uanNumber} onChange={(e) => setForm({ ...form, uanNumber: e.target.value })} />
            <Input label="ESIC number" value={form.esicNumber} onChange={(e) => setForm({ ...form, esicNumber: e.target.value })} />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle title="Bank details" optional />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Account number" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
              </div>
              <Input label="IFSC" value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} />
              <Input label="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Emergency contact" optional />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Contact name" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
              </div>
              <Input label="Contact phone" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
              <Input label="Relationship" value={form.emergencyContactRelation} onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })} placeholder="e.g. Spouse" />
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle title="Statutory deductions" hint="Applies the company-wide PF/ESI/PT rules (set in Settings). Untick to exempt this employee." />
          <div className="flex flex-wrap gap-3">
            {([
              ['pfApplicable', 'Provident Fund (PF)'],
              ['esiApplicable', 'ESI'],
              ['ptApplicable', 'Professional Tax'],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  form[key] ? 'border-[#305dff] bg-blue-50 text-slate-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate('/dashboard/attendance/employees')}>Cancel</Button>
        <Button type="submit" loading={saving}>Save employee</Button>
      </div>
    </form>
  );
}

function SectionTitle({ title, optional, hint }: { title: string; optional?: boolean; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-slate-800">
        {title}
        {optional && <span className="ml-2 text-xs font-normal text-slate-400">Optional</span>}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function DocUpload({
  label,
  currentUrl,
  file,
  onPick,
  onClear,
}: {
  label: string;
  currentUrl: string | null;
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hasFile = Boolean(file || currentUrl);
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600">{label}</p>
          {file ? (
            <p className="truncate text-xs text-slate-500" title={file.name}>{file.name}</p>
          ) : currentUrl ? (
            <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-[#305dff] hover:underline">
              View uploaded file
            </a>
          ) : (
            <p className="text-xs text-slate-400">PNG, JPG or PDF</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {file && (
            <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-rose-600">
              Remove
            </button>
          )}
          <Button type="button" variant="outline" onClick={() => ref.current?.click()}>
            <FiUpload className="size-4" /> {hasFile ? 'Replace' : 'Upload'}
          </Button>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
    </label>
  );
}
