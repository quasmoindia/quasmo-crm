import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiFileText } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceStatusBadge';
import { useEmployee, useRecordsList } from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AttendanceRecord } from '../../types/attendance';

export function AttendanceEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageEmployees } = useAttendancePermissions();
  const { data: employee, isLoading } = useEmployee(id);
  const { data: records } = useRecordsList({ employeeId: id, limit: 30 });

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!employee) return <p className="text-slate-500">Employee not found.</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {employee.referencePhotoUrl ? (
            <img
              src={employee.referencePhotoUrl}
              alt={employee.fullName}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400">
              {employee.fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{employee.fullName}</h1>
            <p className="text-sm text-slate-500">{employee.employeeCode} · {employee.department ?? 'No department'}</p>
          </div>
        </div>
        {canManageEmployees && (
          <Button onClick={() => navigate(`/dashboard/attendance/employees/${id}/edit`)}>Edit</Button>
        )}
      </div>
      <Card className="mb-6">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Phone" value={employee.phone} />
          <Field label="Email" value={employee.email} />
          <Field label="Designation" value={employee.designation} />
          <Field label="Status" value={employee.status} capitalize />
          <Field
            label="Pay"
            value={`${employee.payType ?? 'hourly'}${employee.payRate ? ` · ₹${employee.payRate}` : ' · not set'}`}
            capitalize
          />
          <Field
            label="App login"
            value={
              employee.userId && typeof employee.userId === 'object'
                ? `${employee.userId.fullName} (${employee.userId.email})`
                : 'Not linked'
            }
          />
          <Field label="Date of joining" value={fmtDate(employee.dateOfJoining)} />
          <Field label="Date of birth" value={fmtDate(employee.dateOfBirth)} />
          <Field label="Gender" value={employee.gender} capitalize />
          <Field label="Marital status" value={employee.maritalStatus} capitalize />
          <Field label="Blood group" value={employee.bloodGroup} />
          <Field label="Address" value={employee.address} />
        </dl>
      </Card>

      {(employee.aadhaarNumber ||
        employee.panNumber ||
        employee.uanNumber ||
        employee.esicNumber ||
        employee.aadhaarFrontDocUrl ||
        employee.aadhaarBackDocUrl ||
        employee.panDocUrl) && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold text-slate-800">Identity documents</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Field label="Aadhaar" value={employee.aadhaarNumber} />
            <Field label="PAN" value={employee.panNumber} />
            <Field label="UAN (PF)" value={employee.uanNumber} />
            <Field label="ESIC" value={employee.esicNumber} />
          </dl>
          {(employee.aadhaarFrontDocUrl || employee.aadhaarBackDocUrl || employee.panDocUrl) && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {employee.aadhaarFrontDocUrl && <DocLink label="Aadhaar front" url={employee.aadhaarFrontDocUrl} />}
              {employee.aadhaarBackDocUrl && <DocLink label="Aadhaar back" url={employee.aadhaarBackDocUrl} />}
              {employee.panDocUrl && <DocLink label="PAN card" url={employee.panDocUrl} />}
            </div>
          )}
        </Card>
      )}

      {(employee.bankAccountNumber || employee.bankIfsc || employee.bankName) && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold text-slate-800">Bank details</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Field label="Account number" value={employee.bankAccountNumber} />
            <Field label="IFSC" value={employee.bankIfsc} />
            <Field label="Bank" value={employee.bankName} />
          </dl>
        </Card>
      )}

      {(employee.emergencyContactName || employee.emergencyContactPhone) && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold text-slate-800">Emergency contact</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Field label="Name" value={employee.emergencyContactName} />
            <Field label="Phone" value={employee.emergencyContactPhone} />
            <Field label="Relationship" value={employee.emergencyContactRelation} />
          </dl>
        </Card>
      )}
      <Card>
        <h2 className="mb-4 font-semibold text-slate-800">Recent attendance</h2>
        <DataTable<AttendanceRecord>
          columns={[
            { key: 'date', label: 'Date', render: (r) => r.workDate },
            { key: 'in', label: 'In', render: (r) => r.punchIn ? new Date(r.punchIn.at).toLocaleString() : '—' },
            { key: 'out', label: 'Out', render: (r) => r.punchOut ? new Date(r.punchOut.at).toLocaleString() : '—' },
            { key: 'worked', label: 'Worked (min)', render: (r) => r.workedMinutes },
            { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
          ]}
          data={records?.data ?? []}
          rowKey={(r) => r._id}
          emptyMessage="No records yet."
          renderActions={(r) => (
            <Link to={`/dashboard/attendance/records?highlight=${r._id}`} className="text-sm text-[#305dff] hover:underline">
              Details
            </Link>
          )}
        />
      </Card>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string }) {
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

function Field({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={capitalize ? 'capitalize' : undefined}>{value || '—'}</dd>
    </div>
  );
}

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : '';
}
