export type ExpenseStatus = 'open' | 'approved' | 'rejected' | 'paid';

export type ExpenseCategory =
  | 'travel'
  | 'food'
  | 'accommodation'
  | 'office_supplies'
  | 'utilities'
  | 'marketing'
  | 'software'
  | 'hardware'
  | 'maintenance'
  | 'salary'
  | 'miscellaneous'
  | 'other';

export interface Expense {
  _id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  receiptUrl?: string;
  expenseDate: string;
  submittedBy: { _id: string; fullName: string; email?: string } | string;
  reviewedBy?: { _id: string; fullName: string; email?: string } | string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesListResponse {
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExpenseAnalytics {
  totals: {
    totalExpenses: number;
    totalAmount: number;
    totalApproved: number;
    totalPaid: number;
    totalPending: number;
  };
  statusSummary: { _id: ExpenseStatus; count: number; total: number }[];
  categorySummary: { _id: ExpenseCategory; count: number; total: number }[];
  monthlyTrend: {
    _id: { year: number; month: number };
    count: number;
    total: number;
    approved: number;
    paid: number;
  }[];
}

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category: ExpenseCategory;
  expenseDate: string;
}

export interface UpdateExpensePayload {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  category?: ExpenseCategory;
  expenseDate?: string;
}

export interface ReviewExpensePayload {
  status: 'approved' | 'rejected' | 'paid';
  reviewNote?: string;
}

export const EXPENSE_STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'salary', label: 'Salary' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_STATUS_STYLES: Record<ExpenseStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  paid: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  travel: '✈️',
  food: '🍽️',
  accommodation: '🏨',
  office_supplies: '📎',
  utilities: '💡',
  marketing: '📢',
  software: '💻',
  hardware: '🖥️',
  maintenance: '🔧',
  salary: '💰',
  miscellaneous: '📦',
  other: '📄',
};
