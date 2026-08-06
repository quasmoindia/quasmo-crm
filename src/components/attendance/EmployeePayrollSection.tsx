import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFileText } from 'react-icons/fi';
import { Button } from '../Button';
import { Card } from '../Card';
import { downloadPayslipPdf, triggerBlobDownload } from '../../api/attendance';
import { PAY_COMPONENT_HINTS, PAY_COMPONENT_OPTIONS } from '../../config/payrollComponent';
import type { PayComponent } from '../../types/attendance';
import { PayrollBreakdown } from './PayrollBreakdown';
import { currentMonth, monthLabel, monthRange, shiftMonth, todayIso } from './monthUtils';

/**
 * One employee's pay run for a chosen month: what they earned, what was deducted, and the
 * payslip PDF. Read-only — bonuses and advances are still managed on the Payroll page.
 */
export function EmployeePayrollSection({
  employeeId,
  employeeCode,
}: {
  employeeId: string;
  employeeCode: string;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [payComponent, setPayComponent] = useState<PayComponent>('regular');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Never ask the backend for days that haven't happened yet.
  const { dateFrom, dateTo } = useMemo(() => {
    const range = monthRange(month);
    const today = todayIso();
    return { dateFrom: range.dateFrom, dateTo: range.dateTo > today ? today : range.dateTo };
  }, [month]);

  const isFutureMonth = dateFrom > todayIso();

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadPayslipPdf(employeeId, { dateFrom, dateTo, payComponent });
      triggerBlobDownload(blob, `payslip-${employeeCode}-${month}.pdf`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate payslip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Previous month"
          >
            <FiChevronLeft className="size-4" />
          </button>
          <span className="min-w-36 text-center font-semibold text-slate-800">{monthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Next month"
          >
            <FiChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {PAY_COMPONENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPayComponent(option.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  option.id === payComponent ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" loading={downloading} disabled={isFutureMonth} onClick={() => void handleDownload()}>
            <FiFileText className="size-4" /> Payslip PDF
          </Button>
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-400">{PAY_COMPONENT_HINTS[payComponent]}</p>
      {downloadError && <p className="mb-3 text-sm text-rose-600">{downloadError}</p>}

      {isFutureMonth ? (
        <p className="py-6 text-center text-sm text-slate-400">This month hasn't started yet.</p>
      ) : (
        <PayrollBreakdown
          employeeId={employeeId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          payComponent={payComponent}
          showEmployeeHeader={false}
          includeUnpaidDays
        />
      )}
    </Card>
  );
}
