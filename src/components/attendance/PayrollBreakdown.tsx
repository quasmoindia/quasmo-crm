import { usePayrollEmployeeDetail } from '../../api/attendance';
import {
  buildDeductionLines,
  buildEarningsLines,
  inr,
  payComponentLabel,
  round2,
} from '../../config/payrollComponent';
import type { PayComponent } from '../../types/attendance';
import { DAY_TYPE_META } from './dayTypeMeta';

function mins(m: number) {
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Read-only pay run for one employee over one date range: how the rate is derived, the
 * day-by-day table, earnings vs deductions, and net pay.
 *
 * Shared by the Payroll page's detail modal and the Payroll tab on an employee's profile,
 * so both always explain a payslip the same way.
 */
export function PayrollBreakdown({
  employeeId,
  dateFrom,
  dateTo,
  payComponent,
  showEmployeeHeader = true,
  includeUnpaidDays = false,
}: {
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  payComponent: PayComponent;
  /** Off when the surrounding page already names the employee. */
  showEmployeeHeader?: boolean;
  /** List absent / unpaid-leave / no-punch-out days as zero-amount rows too. */
  includeUnpaidDays?: boolean;
}) {
  const { data, isLoading, error } = usePayrollEmployeeDetail(employeeId, {
    dateFrom,
    dateTo,
    payComponent,
    includeUnpaidDays,
  });

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

  if (isLoading || !data || !s) {
    return error ? (
      <p className="py-6 text-center text-sm text-rose-600">Could not load payroll breakdown.</p>
    ) : (
      <p className="py-6 text-center text-sm text-slate-500">Loading breakdown…</p>
    );
  }

  const earnings = buildEarningsLines(s, payComponent, data.policy.overtimeMultiplier);
  const deductions = buildDeductionLines(s, payComponent);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {showEmployeeHeader && (
            <h3 className="text-lg font-semibold text-slate-900">{data.employee.fullName}</h3>
          )}
          <p className="text-sm text-slate-500">
            {showEmployeeHeader ? `${data.employee.employeeCode} · ` : ''}
            {data.dateFrom} to {data.dateTo}
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
                  {includeUnpaidDays ? 'No days in this period.' : 'No payable days in this pay run.'}
                </td>
              </tr>
            ) : (
              data.days.map((d) => {
                const meta = DAY_TYPE_META[d.type];
                return (
                  <tr key={d.date} className={`border-b border-slate-100 ${d.amount ? '' : 'bg-slate-50/60'}`}>
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
    </>
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
