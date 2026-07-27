import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { DataTable } from '../../components/DataTable';
import {
  downloadBulkPayslipsPdf,
  downloadPayrollExport,
  downloadPayslipPdf,
  triggerBlobDownload,
  useCreateAdjustment,
  useDeleteAdjustment,
  usePayrollAdjustments,
  usePayrollEmployeeDetail,
  usePayrollReport,
} from '../../api/attendance';
import {
  APPLIES_TO_LABELS,
  PAY_COMPONENT_HINTS,
  PAY_COMPONENT_OPTIONS,
  buildDeductionLines,
  buildEarningsLines,
  defaultAppliesTo,
  payComponentLabel,
  rowHasPayData,
} from '../../config/payrollComponent';
import { useAttendancePermissions } from '../../hooks/useAttendancePermissions';
import type {
  AdjustmentAppliesTo,
  AdjustmentType,
  PayComponent,
  PayrollRow,
} from '../../types/attendance';
import { DAY_TYPE_META } from '../../components/attendance/dayTypeMeta';

function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function AttendancePayroll({ embedded = false }: { embedded?: boolean }) {
  const { canExport, canManageEmployees } = useAttendancePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [payComponent, setPayComponent] = useState<PayComponent>('regular');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [payslipRow, setPayslipRow] = useState<PayrollRow | null>(null);
  const [detailRow, setDetailRow] = useState<PayrollRow | null>(null);
  const [downloadingPayslips, setDownloadingPayslips] = useState(false);
  const [payslipRowDownloadingId, setPayslipRowDownloadingId] = useState<string | null>(null);
  const [payslipDownloadError, setPayslipDownloadError] = useState<string | null>(null);
  const { data, isLoading, error } = usePayrollReport({
    dateFrom,
    dateTo,
    department: department || undefined,
    payComponent,
  });

  const month = dateFrom.slice(0, 7);
  const invalidRange = dateFrom > dateTo;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((row) => {
      if (!rowHasPayData(row, payComponent)) return false;
      if (!query) return true;
      return (
        row.fullName.toLowerCase().includes(query) ||
        row.employeeCode.toLowerCase().includes(query) ||
        row.department.toLowerCase().includes(query)
      );
    });
  }, [data?.rows, payComponent, search]);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await downloadPayrollExport({
        dateFrom,
        dateTo,
        department: department || undefined,
        payComponent,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${payComponent}-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Payroll export failed. Try again or check your permissions.');
    } finally {
      setExporting(false);
    }
  };

  const handleBulkPayslips = async () => {
    setDownloadingPayslips(true);
    setPayslipDownloadError(null);
    try {
      const blob = await downloadBulkPayslipsPdf({
        employeeIds: filteredRows.map((r) => r.employeeId),
        dateFrom,
        dateTo,
        payComponent,
      });
      triggerBlobDownload(blob, `payslips-${payComponent}-${dateFrom}-${dateTo}.pdf`);
    } catch (e) {
      setPayslipDownloadError(e instanceof Error ? e.message : 'Failed to generate payslips');
    } finally {
      setDownloadingPayslips(false);
    }
  };

  const handleRowPayslip = async (row: PayrollRow) => {
    setPayslipRowDownloadingId(row.employeeId);
    setPayslipDownloadError(null);
    try {
      const blob = await downloadPayslipPdf(row.employeeId, { dateFrom, dateTo, payComponent });
      triggerBlobDownload(blob, `payslip-${row.employeeCode}-${dateFrom}.pdf`);
    } catch (e) {
      setPayslipDownloadError(e instanceof Error ? e.message : 'Failed to generate payslip');
    } finally {
      setPayslipRowDownloadingId(null);
    }
  };

  const totals = data?.totals;
  const policy = data?.policy;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
            <p className="text-sm text-slate-500">
              Daily worked hours (rounded to 15 min) up to {policy?.standardHoursPerDay ?? 8}h are paid at the
              normal rate; beyond that is
              {policy?.overtimeEnabled === false ? ' also normal (OT off)' : ` overtime at ${policy?.overtimeMultiplier ?? 1.5}×`}
              . Deductions &amp; rates are set in Settings.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Daily worked hours (rounded to 15 min) up to {policy?.standardHoursPerDay ?? 8}h are paid at the
            normal rate; beyond that is
            {policy?.overtimeEnabled === false ? ' also normal (OT off)' : ` overtime at ${policy?.overtimeMultiplier ?? 1.5}×`}
            . Deductions &amp; rates are set in Settings.
          </p>
        )}
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleBulkPayslips()} loading={downloadingPayslips}>
              <FiFileText className="size-4" /> Download payslips (PDF)
            </Button>
            <Button onClick={handleExport} loading={exporting}>
              <FiDownload className="size-4" /> Export CSV
            </Button>
          </div>
        )}
      </div>
      {payslipDownloadError && <p className="mb-3 text-sm text-rose-600">{payslipDownloadError}</p>}

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">Pay run type</p>
        <div className="flex flex-wrap gap-2">
          {PAY_COMPONENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPayComponent(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                payComponent === option.id
                  ? 'bg-[#305dff] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">{PAY_COMPONENT_HINTS[payComponent]}</p>
      </Card>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code, department" />
        </div>
        {invalidRange ? <p className="mt-3 text-sm text-rose-600">Start date must be on or before the end date.</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">Could not load payroll. Refresh the page or try another period.</p> : null}
        {exportError ? <p className="mt-3 text-sm text-rose-600">{exportError}</p> : null}
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="In this run" value={String(filteredRows.length)} />
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
          data={filteredRows}
          rowKey={(r) => r.employeeId}
          isLoading={isLoading}
          emptyMessage={
            (data?.rows ?? []).length === 0
              ? 'No payroll data for this period.'
              : payComponent === 'overtime'
                ? 'No overtime amounts found for this period.'
                : payComponent === 'regular'
                  ? 'No regular wages found for this period.'
                  : 'No employees match this pay run or search.'
          }
          renderActions={(r) => (
            <div className="flex gap-3">
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setDetailRow(r)}>
                Details
              </button>
              <button type="button" className="text-sm text-[#305dff] hover:underline" onClick={() => setPayslipRow(r)}>
                Payslip
              </button>
              <button
                type="button"
                className="text-sm text-[#305dff] hover:underline disabled:opacity-50"
                disabled={payslipRowDownloadingId === r.employeeId}
                onClick={() => void handleRowPayslip(r)}
              >
                {payslipRowDownloadingId === r.employeeId ? 'Generating…' : 'PDF'}
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
          payComponent={payComponent}
          onClose={() => setDetailRow(null)}
        />
      )}

      {payslipRow && (
        <PayslipModal
          row={payslipRow}
          month={month}
          period={`${dateFrom} to ${dateTo}`}
          payComponent={payComponent}
          canEdit={canManageEmployees}
          overtimeMultiplier={policy?.overtimeMultiplier ?? 1.5}
          onClose={() => setPayslipRow(null)}
        />
      )}
    </div>
  );
}

function mins(m: number) {
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function PayrollDetailModal({
  employeeId,
  dateFrom,
  dateTo,
  payComponent,
  onClose,
}: {
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  payComponent: PayComponent;
  onClose: () => void;
}) {
  const { data, isLoading, error } = usePayrollEmployeeDetail(employeeId, { dateFrom, dateTo, payComponent });

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
    ? buildEarningsLines(s, payComponent, data!.policy.overtimeMultiplier)
    : [];

  const deductions = s ? buildDeductionLines(s, payComponent) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        {isLoading || !data || !s ? (
          error ? <p className="text-rose-600">Could not load payroll breakdown.</p> : <p className="text-slate-500">Loading breakdown…</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{data.employee.fullName}</h3>
                <p className="text-sm text-slate-500">
                  {data.employee.employeeCode} · {data.dateFrom} to {data.dateTo}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {payComponentLabel(payComponent)}
                </span>
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
                  {data.days.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No payable days in this pay run.
                      </td>
                    </tr>
                  ) : (
                    data.days.map((d) => {
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
                    })
                  )}
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
  payComponent,
  canEdit,
  overtimeMultiplier,
  onClose,
}: {
  row: PayrollRow;
  month: string;
  period: string;
  payComponent: PayComponent;
  canEdit: boolean;
  overtimeMultiplier: number;
  onClose: () => void;
}) {
  const { data: adjData } = usePayrollAdjustments({ month, employeeId: row.employeeId }, canEdit);
  const createAdj = useCreateAdjustment();
  const deleteAdj = useDeleteAdjustment();
  const [type, setType] = useState<AdjustmentType>('bonus');
  const [appliesTo, setAppliesTo] = useState<AdjustmentAppliesTo>('all');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setAppliesTo(defaultAppliesTo(payComponent));
  }, [payComponent]);

  const visibleAdjustments = useMemo(() => {
    const items = adjData?.data ?? [];
    if (payComponent === 'all') return items;
    return items.filter((adj) => !adj.appliesTo || adj.appliesTo === 'all' || adj.appliesTo === payComponent);
  }, [adjData?.data, payComponent]);

  const addAdjustment = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    try {
      await createAdj.mutateAsync({
        employeeId: row.employeeId,
        month,
        type,
        amount: amt,
        note: note.trim() || undefined,
        appliesTo,
      });
      setAmount('');
      setNote('');
    } catch {
      // mutation error surfaced by react-query if needed
    }
  };

  const earnings = buildEarningsLines(row, payComponent, overtimeMultiplier);
  const deductions = buildDeductionLines(row, payComponent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{row.fullName}</h3>
            <p className="text-sm text-slate-500">
              {row.employeeCode} · {period}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {payComponentLabel(payComponent)}
            </span>
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
            <p className="mb-3 text-xs text-slate-400">
              Bonus adds to pay; advance &amp; deduction reduce net pay. Choose which payroll run each item applies to.
            </p>
            <div className="space-y-2">
              {visibleAdjustments.map((a) => (
                <div key={a._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <span>
                    <span className="capitalize">{a.type}</span> · {inr(a.amount)}
                    <span className="text-slate-400"> · {APPLIES_TO_LABELS[a.appliesTo ?? 'all']}</span>
                    {a.note ? <span className="text-slate-400"> · {a.note}</span> : null}
                  </span>
                  <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => deleteAdj.mutate(a._id)}>
                    Remove
                  </button>
                </div>
              ))}
              {visibleAdjustments.length === 0 && <p className="text-sm text-slate-400">None for this pay run yet.</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
                <option value="bonus">Bonus</option>
                <option value="advance">Advance</option>
                <option value="deduction">Deduction</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value as AdjustmentAppliesTo)}
              >
                <option value="all">All runs</option>
                <option value="regular">Regular run</option>
                <option value="overtime">OT run</option>
              </select>
              <input className="rounded-lg border border-slate-300 px-2 py-2 text-sm" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-2 py-2 text-sm" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
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
