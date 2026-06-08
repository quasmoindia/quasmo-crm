import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { DataTable } from '../../components/DataTable';
import {
  downloadPayrollExport,
  useCreateAdjustment,
  useDeleteAdjustment,
  usePayrollAdjustments,
  usePayrollEmployeeDetail,
  usePayrollReport,
} from '../../api/attendance';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type { AdjustmentType, PayrollDayDetail, PayrollRow } from '../../types/attendance';

function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function AttendancePayroll() {
  const { canExport, canManageEmployees } = useAttendancePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [department, setDepartment] = useState('');
  const [exporting, setExporting] = useState(false);
  const [payslipRow, setPayslipRow] = useState<PayrollRow | null>(null);
  const [detailRow, setDetailRow] = useState<PayrollRow | null>(null);
  const { data, isLoading } = usePayrollReport({ dateFrom, dateTo, department: department || undefined });

  const month = dateFrom.slice(0, 7);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadPayrollExport({ dateFrom, dateTo, department: department || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const totals = data?.totals;
  const policy = data?.policy;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
          <p className="text-sm text-slate-500">
            Daily worked hours (rounded to 15 min) up to {policy?.standardHoursPerDay ?? 8}h are paid at the
            normal rate; beyond that is
            {policy?.overtimeEnabled === false ? ' also normal (OT off)' : ` overtime at ${policy?.overtimeMultiplier ?? 1.5}×`}
            . Deductions &amp; rates are set in Settings.
          </p>
        </div>
        {canExport && (
          <Button onClick={handleExport} loading={exporting}>
            <FiDownload className="size-4" /> Export CSV
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Employees" value={String(totals?.employees ?? 0)} />
        <SummaryTile label="Gross" value={inr(totals?.gross ?? 0)} />
        <SummaryTile label="Deductions" value={inr(totals?.totalDeductions ?? 0)} />
        <SummaryTile label="Net payout" value={inr(totals?.netPay ?? 0)} accent />
      </div>

      <Card>
        <DataTable<PayrollRow>
          columns={[
            { key: 'code', label: 'Code', render: (r) => <span className="font-medium">{r.employeeCode}</span> },
            { key: 'name', label: 'Name', render: (r) => r.fullName },
            { key: 'days', label: 'Days', render: (r) => r.daysPresent },
            { key: 'worked', label: 'Worked', render: (r) => hoursLabel(r.totalMinutes) },
            {
              key: 'ot',
              label: 'OT',
              render: (r) =>
                r.overtimeHours > 0 ? <span className="text-amber-700">{hoursLabel(Math.round(r.overtimeHours * 60))}</span> : '—',
            },
            { key: 'gross', label: 'Gross', render: (r) => inr(r.gross) },
            { key: 'ded', label: 'Deductions', render: (r) => (r.totalDeductions > 0 ? <span className="text-rose-600">−{inr(r.totalDeductions)}</span> : '—') },
            { key: 'net', label: 'Net pay', render: (r) => <span className="font-semibold">{inr(r.netPay)}</span> },
          ]}
          data={data?.rows ?? []}
          rowKey={(r) => r.employeeId}
          isLoading={isLoading}
          emptyMessage="No payroll data for this period."
          renderActions={(r) => (
            <div className="flex gap-3">
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setDetailRow(r)}>
                Details
              </button>
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setPayslipRow(r)}>
                Payslip
              </button>
            </div>
          )}
        />
      </Card>

      {detailRow && (
        <PayrollDetailModal
          employeeId={detailRow.employeeId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setDetailRow(null)}
        />
      )}

      {payslipRow && (
        <PayslipModal
          row={payslipRow}
          month={month}
          period={`${dateFrom} to ${dateTo}`}
          canEdit={canManageEmployees}
          overtimeMultiplier={policy?.overtimeMultiplier ?? 1.5}
          onClose={() => setPayslipRow(null)}
        />
      )}
    </div>
  );
}

const DAY_TYPE_META: Record<PayrollDayDetail['type'], { label: string; cls: string }> = {
  worked: { label: 'Worked', cls: 'bg-emerald-100 text-emerald-800' },
  paid_holiday: { label: 'Paid holiday', cls: 'bg-violet-100 text-violet-800' },
  unpaid_holiday: { label: 'Holiday (unpaid)', cls: 'bg-slate-100 text-slate-600' },
  paid_leave: { label: 'Paid leave', cls: 'bg-sky-100 text-sky-800' },
  unpaid_leave: { label: 'Unpaid leave', cls: 'bg-slate-200 text-slate-700' },
  week_off: { label: 'Weekly off (paid)', cls: 'bg-indigo-100 text-indigo-800' },
  week_off_unpaid: { label: 'Weekly off', cls: 'bg-slate-100 text-slate-600' },
  absent: { label: 'Absent', cls: 'bg-rose-100 text-rose-700' },
};

function mins(m: number) {
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function PayrollDetailModal({
  employeeId,
  dateFrom,
  dateTo,
  onClose,
}: {
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const { data, isLoading } = usePayrollEmployeeDetail(employeeId, { dateFrom, dateTo });

  const perDayFormula = (() => {
    if (!data) return '';
    const { payType, payRate } = data.employee;
    const std = data.policy.standardHoursPerDay;
    if (payType === 'hourly') return `Hourly: ₹${payRate}/hr × hours worked. Per standard day = ₹${payRate} × ${std}h = ${inr(payRate * std)}.`;
    if (payType === 'daily') return `Daily: ₹${payRate}/day. Per hour = ₹${payRate} ÷ ${std}h = ${inr(round2(payRate / std))}/hr.`;
    const perDay = round2(payRate / data.policy.daysInFromMonth);
    return `Monthly: ₹${payRate} ÷ ${data.policy.daysInFromMonth} days = ${inr(perDay)}/day. Per hour = ${inr(perDay)} ÷ ${std}h = ${inr(round2(perDay / std))}/hr.`;
  })();

  const s = data?.summary;

  const earnings = s
    ? [
        { label: 'Regular wages', value: s.regularAmount },
        { label: `Overtime (${data!.policy.overtimeMultiplier}×)`, value: s.overtimeAmount },
        { label: `Paid leave (${s.paidLeaveDays}d)`, value: s.paidLeaveAmount },
        { label: `Weekly off (${data!.employee.payType === 'monthly' ? s.weekOffDays : 0}d)`, value: s.weeklyOffAmount },
        { label: `Holidays (${s.holidayDays}d)`, value: s.holidayAmount },
        { label: 'Bonus', value: s.bonus },
      ].filter((x) => x.value > 0)
    : [];

  const deductions = s
    ? [
        { label: 'Provident Fund (PF)', value: s.pf },
        { label: 'ESI', value: s.esi },
        { label: 'Professional Tax', value: s.pt },
        { label: 'Advance recovery', value: s.advance },
        { label: 'Other deduction', value: s.otherDeduction },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        {isLoading || !data || !s ? (
          <p className="text-slate-500">Loading breakdown…</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{data.employee.fullName}</h3>
                <p className="text-sm text-slate-500">
                  {data.employee.employeeCode} · {data.dateFrom} to {data.dateTo}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600">
                {data.employee.payType} · ₹{data.employee.payRate}
              </span>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">How it's calculated</p>
              <p className="mt-1">{perDayFormula}</p>
              <p className="mt-1">
                Each day's worked hours (rounded to 15 min) up to {data.policy.standardHoursPerDay}h are paid at the
                normal rate; beyond that is {data.policy.overtimeEnabled ? `overtime × ${data.policy.overtimeMultiplier}` : 'also normal (OT off)'}.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-6">
              <Stat label="Worked" value={`${s.workedDays}d`} />
              <Stat label="Holidays" value={`${s.holidayDays}d`} />
              <Stat label="Paid leave" value={`${s.paidLeaveDays}d`} />
              <Stat label="Weekly off" value={`${s.weekOffDays}d`} />
              <Stat label="Unpaid" value={`${s.unpaidLeaveDays}d`} />
              <Stat label="Absent" value={`${s.absentDays}d`} />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Day</th>
                    <th className="py-1.5 pr-2">Status</th>
                    <th className="py-1.5 pr-2 text-right">Worked</th>
                    <th className="py-1.5 pr-2 text-right">Reg</th>
                    <th className="py-1.5 pr-2 text-right">OT</th>
                    <th className="py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => {
                    const meta = DAY_TYPE_META[d.type];
                    return (
                      <tr key={d.date} className="border-b border-slate-100">
                        <td className="py-1.5 pr-2 whitespace-nowrap">{d.date.slice(5)}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{d.day}</td>
                        <td className="py-1.5 pr-2">
                          <span className={`rounded px-1.5 py-0.5 ${meta.cls}`}>{meta.label}</span>
                          {d.note ? <span className="ml-1 capitalize text-slate-400">{d.note}</span> : null}
                        </td>
                        <td className="py-1.5 pr-2 text-right">{d.workedMinutes ? mins(d.workedMinutes) : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{d.regularMinutes ? mins(d.regularMinutes) : '—'}</td>
                        <td className="py-1.5 pr-2 text-right text-amber-700">{d.otMinutes ? mins(d.otMinutes) : '—'}</td>
                        <td className="py-1.5 text-right font-medium">{d.amount ? inr(d.amount) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Earnings</h4>
                <dl className="space-y-1 text-sm">
                  {earnings.length === 0 && <p className="text-slate-400">—</p>}
                  {earnings.map((e) => (
                    <div key={e.label} className="flex justify-between">
                      <dt className="text-slate-500">{e.label}</dt>
                      <dd>{inr(e.value)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <dt>Gross + bonus</dt>
                    <dd>{inr(s.gross + s.bonus)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Deductions</h4>
                <dl className="space-y-1 text-sm">
                  {deductions.length === 0 && <p className="text-slate-400">—</p>}
                  {deductions.map((d) => (
                    <div key={d.label} className="flex justify-between">
                      <dt className="text-slate-500">{d.label}</dt>
                      <dd className="text-rose-600">−{inr(d.value)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <dt>Total deductions</dt>
                    <dd className="text-rose-600">−{inr(s.totalDeductions)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <span className="font-semibold text-emerald-800">Net pay</span>
              <span className="text-xl font-bold text-emerald-700">{inr(s.netPay)}</span>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function PayslipModal({
  row,
  month,
  period,
  canEdit,
  overtimeMultiplier,
  onClose,
}: {
  row: PayrollRow;
  month: string;
  period: string;
  canEdit: boolean;
  overtimeMultiplier: number;
  onClose: () => void;
}) {
  const { data: adjData } = usePayrollAdjustments({ month, employeeId: row.employeeId }, canEdit);
  const createAdj = useCreateAdjustment();
  const deleteAdj = useDeleteAdjustment();
  const [type, setType] = useState<AdjustmentType>('bonus');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const addAdjustment = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    await createAdj.mutateAsync({ employeeId: row.employeeId, month, type, amount: amt, note: note.trim() || undefined });
    setAmount('');
    setNote('');
  };

  const earnings = [
    { label: 'Regular wages', value: row.regularAmount },
    { label: `Overtime (${overtimeMultiplier}×)`, value: row.overtimeAmount },
    { label: `Paid leave (${row.paidLeaveDays}d)`, value: row.paidLeaveAmount },
    { label: `Weekly off (${row.weeklyOffDays}d)`, value: row.weeklyOffAmount },
    { label: `Holidays (${row.holidayDays}d)`, value: row.holidayAmount },
    { label: 'Bonus', value: row.bonus },
  ].filter((x) => x.value > 0);

  const deductions = [
    { label: 'Provident Fund (PF)', value: row.pf },
    { label: 'ESI', value: row.esi },
    { label: 'Professional Tax', value: row.pt },
    { label: 'Advance recovery', value: row.advance },
    { label: 'Other deduction', value: row.otherDeduction },
  ].filter((x) => x.value > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{row.fullName}</h3>
            <p className="text-sm text-slate-500">
              {row.employeeCode} · {period}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600">{row.payType}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Days present</p>
            <p className="font-semibold">{row.daysPresent}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Worked / OT hours</p>
            <p className="font-semibold">
              {row.regularHours}h <span className="text-amber-700">+ {row.overtimeHours}h OT</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Earnings</h4>
            <dl className="space-y-1 text-sm">
              {earnings.length === 0 && <p className="text-slate-400">—</p>}
              {earnings.map((e) => (
                <div key={e.label} className="flex justify-between">
                  <dt className="text-slate-500">{e.label}</dt>
                  <dd>{inr(e.value)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <dt>Total earnings</dt>
                <dd>{inr(row.gross + row.bonus)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Deductions</h4>
            <dl className="space-y-1 text-sm">
              {deductions.length === 0 && <p className="text-slate-400">—</p>}
              {deductions.map((d) => (
                <div key={d.label} className="flex justify-between">
                  <dt className="text-slate-500">{d.label}</dt>
                  <dd className="text-rose-600">−{inr(d.value)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <dt>Total deductions</dt>
                <dd className="text-rose-600">−{inr(row.totalDeductions)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
          <span className="font-semibold text-emerald-800">Net pay</span>
          <span className="text-xl font-bold text-emerald-700">{inr(row.netPay)}</span>
        </div>

        {canEdit && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-700">Adjustments for {month}</h4>
            <p className="mb-3 text-xs text-slate-400">Bonus adds to pay; advance &amp; deduction reduce net pay.</p>
            <div className="space-y-2">
              {(adjData?.data ?? []).map((a) => (
                <div key={a._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <span>
                    <span className="capitalize">{a.type}</span> · {inr(a.amount)}
                    {a.note ? <span className="text-slate-400"> · {a.note}</span> : null}
                  </span>
                  <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => deleteAdj.mutate(a._id)}>
                    Remove
                  </button>
                </div>
              ))}
              {(adjData?.data ?? []).length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
                <option value="bonus">Bonus</option>
                <option value="advance">Advance</option>
                <option value="deduction">Deduction</option>
              </select>
              <input className="rounded-lg border border-slate-300 px-2 py-2 text-sm" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className="col-span-2 rounded-lg border border-slate-300 px-2 py-2 text-sm sm:col-span-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button onClick={addAdjustment} loading={createAdj.isPending}>Add</Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
