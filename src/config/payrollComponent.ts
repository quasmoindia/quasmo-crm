import type { AdjustmentAppliesTo, PayComponent, PayrollRow } from '../types/attendance';

export const PAY_COMPONENT_OPTIONS: { id: PayComponent; label: string }[] = [
  { id: 'all', label: 'Regular + OT' },
  { id: 'regular', label: 'Regular only' },
  { id: 'overtime', label: 'OT only' },
];

export const PAY_COMPONENT_HINTS: Record<PayComponent, string> = {
  all: 'Combined payout — regular wages, leave, holidays, and overtime together.',
  regular: 'Regular payroll run — working hours and fixed credits only. Pay OT on a separate date.',
  overtime: 'Overtime payroll run — OT hours only, typically paid on a different date.',
};

export const APPLIES_TO_LABELS: Record<AdjustmentAppliesTo, string> = {
  all: 'All runs',
  regular: 'Regular run',
  overtime: 'OT run',
};

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function payComponentLabel(component: PayComponent) {
  return PAY_COMPONENT_OPTIONS.find((option) => option.id === component)?.label ?? component;
}

export function defaultAppliesTo(component: PayComponent): AdjustmentAppliesTo {
  if (component === 'regular' || component === 'overtime') return component;
  return 'all';
}

export function rowHasPayData(row: PayrollRow, component: PayComponent) {
  if (component === 'overtime') return row.overtimeAmount > 0 || row.overtimeHours > 0;
  if (component === 'regular') {
    return (
      row.regularAmount > 0 ||
      row.paidLeaveAmount > 0 ||
      row.weeklyOffAmount > 0 ||
      row.holidayAmount > 0 ||
      row.bonus > 0
    );
  }
  return row.netPay > 0 || row.gross > 0;
}

export function buildEarningsLines(
  source: {
    regularAmount: number;
    overtimeAmount: number;
    paidLeaveDays: number;
    paidLeaveAmount: number;
    weeklyOffDays?: number;
    weekOffDays?: number;
    weeklyOffAmount: number;
    holidayDays: number;
    holidayAmount: number;
    bonus: number;
  },
  component: PayComponent,
  overtimeMultiplier = 1.5
) {
  const lines: { label: string; value: number }[] = [];
  const weeklyOffDays = source.weeklyOffDays ?? source.weekOffDays ?? 0;
  if (component !== 'overtime') {
    if (source.regularAmount > 0) lines.push({ label: 'Regular wages', value: source.regularAmount });
    if (source.paidLeaveAmount > 0) {
      lines.push({ label: `Paid leave (${source.paidLeaveDays}d)`, value: source.paidLeaveAmount });
    }
    if (source.weeklyOffAmount > 0) {
      lines.push({ label: `Weekly off (${weeklyOffDays}d)`, value: source.weeklyOffAmount });
    }
    if (source.holidayAmount > 0) {
      lines.push({ label: `Holidays (${source.holidayDays}d)`, value: source.holidayAmount });
    }
    if (source.bonus > 0) lines.push({ label: 'Bonus', value: source.bonus });
  }
  if (component !== 'regular' && source.overtimeAmount > 0) {
    lines.push({ label: `Overtime (${overtimeMultiplier}×)`, value: source.overtimeAmount });
  }
  return lines;
}

export function buildDeductionLines(
  source: Pick<PayrollRow, 'pf' | 'esi' | 'pt' | 'advance' | 'otherDeduction'>,
  component: PayComponent
) {
  const lines: { label: string; value: number }[] = [];
  if (component !== 'overtime') {
    if (source.pf > 0) lines.push({ label: 'Provident Fund (PF)', value: source.pf });
    if (source.pt > 0) lines.push({ label: 'Professional Tax', value: source.pt });
    if (source.advance > 0) lines.push({ label: 'Advance recovery', value: source.advance });
    if (source.otherDeduction > 0) lines.push({ label: 'Other deduction', value: source.otherDeduction });
  }
  if (source.esi > 0) lines.push({ label: 'ESI', value: source.esi });
  return lines;
}
