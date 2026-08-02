import { FiFileText } from 'react-icons/fi';
import { Card } from '../Card';
import type { Employee } from '../../types/attendance';

/**
 * Everything captured on the employee create/edit form, read-only.
 *
 * Every field renders even when blank (as an em dash) so a viewer can tell missing data
 * apart from a section that doesn't apply.
 */
export function EmployeeProfileSection({ employee }: { employee: Employee }) {
  const shift = refName(employee.shiftId);
  const site = refName(employee.defaultWorkSiteId);
  const linkedUser =
    employee.userId && typeof employee.userId === 'object'
      ? `${employee.userId.fullName} (${employee.userId.email})`
      : '';

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Basic details" />
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 justify-center sm:block">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {employee.referencePhotoUrl ? (
                <img src={employee.referencePhotoUrl} alt={employee.fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">No photo</span>
              )}
            </div>
          </div>
          <FieldGrid>
            <Field label="Full name" value={employee.fullName} />
            <Field label="Employee code" value={employee.employeeCode} />
            <Field label="Phone" value={employee.phone} />
            <Field label="Email" value={employee.email} />
            <Field label="Department" value={employee.department} />
            <Field label="Designation" value={employee.designation} />
            <Field label="Status" value={employee.status} capitalize />
          </FieldGrid>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Job & pay" />
        <FieldGrid>
          <Field label="Shift" value={shift} />
          <Field label="Work site" value={site} />
          <Field label="Pay type" value={employee.payType} capitalize />
          <Field label={rateLabel(employee.payType)} value={employee.payRate ? `₹${employee.payRate.toLocaleString('en-IN')}` : ''} />
        </FieldGrid>
      </Card>

      <Card>
        <SectionTitle title="App access" hint="Lets this employee punch their own attendance from the mobile app." />
        <FieldGrid>
          <Field label="Linked app user" value={linkedUser || 'Not linked'} />
        </FieldGrid>
      </Card>

      <Card>
        <SectionTitle title="Employment & personal" />
        <FieldGrid>
          <Field label="Date of joining" value={fmtDate(employee.dateOfJoining)} />
          <Field label="Date of birth" value={fmtDate(employee.dateOfBirth)} />
          <Field label="Blood group" value={employee.bloodGroup} />
          <Field label="Gender" value={employee.gender} capitalize />
          <Field label="Marital status" value={employee.maritalStatus} capitalize />
          <Field label="Address" value={employee.address} className="sm:col-span-2 lg:col-span-3" />
        </FieldGrid>
      </Card>

      <Card>
        <SectionTitle title="Identity documents" />
        <FieldGrid>
          <Field label="Aadhaar number" value={employee.aadhaarNumber} />
          <Field label="PAN number" value={employee.panNumber} />
          <Field label="UAN (PF) number" value={employee.uanNumber} />
          <Field label="ESIC number" value={employee.esicNumber} />
        </FieldGrid>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <DocLink label="Aadhaar front" url={employee.aadhaarFrontDocUrl} />
          <DocLink label="Aadhaar back" url={employee.aadhaarBackDocUrl} />
          <DocLink label="PAN card" url={employee.panDocUrl} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Bank details" />
          <FieldGrid columns={2}>
            <Field label="Account number" value={employee.bankAccountNumber} />
            <Field label="IFSC" value={employee.bankIfsc} />
            <Field label="Bank name" value={employee.bankName} />
          </FieldGrid>
        </Card>

        <Card>
          <SectionTitle title="Emergency contact" />
          <FieldGrid columns={2}>
            <Field label="Contact name" value={employee.emergencyContactName} />
            <Field label="Contact phone" value={employee.emergencyContactPhone} />
            <Field label="Relationship" value={employee.emergencyContactRelation} />
          </FieldGrid>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Statutory deductions" hint="Company-wide PF/ESI/PT rules apply unless this employee is exempt." />
        <div className="flex flex-wrap gap-3">
          <StatutoryChip label="Provident Fund (PF)" applicable={employee.pfApplicable ?? true} />
          <StatutoryChip label="ESI" applicable={employee.esiApplicable ?? true} />
          <StatutoryChip label="Professional Tax" applicable={employee.ptApplicable ?? true} />
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function FieldGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: 2 | 3 }) {
  return (
    <dl className={`grid flex-1 gap-4 text-sm sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>
      {children}
    </dl>
  );
}

function Field({
  label,
  value,
  capitalize,
  className,
}: {
  label: string;
  value?: string | null;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-800 ${capitalize ? 'capitalize' : ''} ${value ? '' : 'text-slate-400'}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
        <FiFileText className="size-4" /> {label} · not uploaded
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-[#305dff] hover:text-[#305dff]"
    >
      <FiFileText className="size-4" /> {label}
    </a>
  );
}

function StatutoryChip({ label, applicable }: { label: string; applicable: boolean }) {
  return (
    <span
      className={`rounded-lg border px-3 py-2 text-sm ${
        applicable ? 'border-[#305dff] bg-blue-50 text-slate-800' : 'border-slate-200 text-slate-400 line-through'
      }`}
    >
      {label}
      <span className="ml-2 text-xs font-medium no-underline">{applicable ? 'Applicable' : 'Exempt'}</span>
    </span>
  );
}

/** Populated refs come back as objects; unpopulated ones as bare ids we can't name. */
function refName(ref?: { name?: string } | string): string {
  return ref && typeof ref === 'object' ? ref.name ?? '' : '';
}

function rateLabel(payType?: string): string {
  if (payType === 'daily') return 'Rate / day';
  if (payType === 'monthly') return 'Salary / month';
  return 'Rate / hour';
}

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : '';
}
