import { useState, useRef, useEffect } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiEye, FiUpload, FiCheckCircle, FiXCircle,
  FiDollarSign, FiTrendingUp, FiClock, FiX, FiPaperclip, FiChevronLeft,
  FiChevronRight, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useCurrentUser } from '../api/auth';
import {
  useExpensesList,
  useExpenseAnalytics,
  useCreateExpense,
  useUpdateExpense,
  useReviewExpense,
  useDeleteExpense,
  useUploadExpenseReceipt,
  uploadExpenseReceiptApi,
} from '../api/expenses';
import type {
  Expense,
  ExpenseStatus,
  ExpenseCategory,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../types/expense';
import {
  EXPENSE_STATUS_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_STATUS_STYLES,
  EXPENSE_CATEGORY_ICONS,
} from '../types/expense';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(n: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMoneyFull(n: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}


function categoryLabel(cat: ExpenseCategory) {
  return EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? cat;
}

function statusLabel(s: ExpenseStatus) {
  return EXPENSE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

function submitterName(exp: Expense): string {
  const s = exp.submittedBy;
  if (s && typeof s === 'object' && 'fullName' in s) return s.fullName;
  return '—';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, compact = false }: { status: ExpenseStatus; compact?: boolean }) {
  const icons = {
    open: <FiClock className="size-3" />,
    approved: <FiCheckCircle className="size-3" />,
    rejected: <FiXCircle className="size-3" />,
    paid: <FiDollarSign className="size-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${compact ? 'px-2 py-0 text-[11px]' : 'px-2.5 py-0.5 text-xs'} ${EXPENSE_STATUS_STYLES[status]}`}>
      {icons[status]}
      {statusLabel(status)}
    </span>
  );
}

// ─── Pagination Control ───────────────────────────────────────────────────────

function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Compute visible page numbers
  function getPages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  const BTN = 'flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
      {/* Left: rows info + per-page */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Rows</span>
          <select
            value={limit}
            onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1} className={`${BTN} text-slate-500 hover:bg-slate-100 disabled:opacity-30`} title="First">
            <FiChevronsLeft className="size-3.5" />
          </button>
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={`${BTN} text-slate-500 hover:bg-slate-100 disabled:opacity-30`} title="Prev">
            <FiChevronLeft className="size-3.5" />
          </button>

          {getPages().map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="flex h-8 w-6 items-center justify-center text-xs text-slate-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`${BTN} ${p === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}

          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={`${BTN} text-slate-500 hover:bg-slate-100 disabled:opacity-30`} title="Next">
            <FiChevronRight className="size-3.5" />
          </button>
          <button type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className={`${BTN} text-slate-500 hover:bg-slate-100 disabled:opacity-30`} title="Last">
            <FiChevronsRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${accent}`}>
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="truncate text-base font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Analytics Sidebar ────────────────────────────────────────────────────────

function AnalyticsSidebar() {
  const { data: analytics, isLoading } = useExpenseAnalytics();

  const totals = analytics?.totals;
  const catData = (analytics?.categorySummary ?? []).slice(0, 6);
  const catMax = catData.reduce((m, c) => Math.max(m, c.total), 0);

  const statusData = EXPENSE_STATUS_OPTIONS.map((o) => {
    const s = analytics?.statusSummary.find((ss) => ss._id === o.value);
    return { status: o.value as ExpenseStatus, count: s?.count ?? 0, total: s?.total ?? 0 };
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
        <KpiCard
          label="Total Submitted"
          value={formatMoney(totals?.totalAmount ?? 0)}
          sub={`${totals?.totalExpenses ?? 0} expense${(totals?.totalExpenses ?? 0) !== 1 ? 's' : ''}`}
          accent="border-slate-200"
          icon={<FiTrendingUp className="size-4 text-slate-500" />}
        />
        <KpiCard
          label="Pending"
          value={formatMoney(totals?.totalPending ?? 0)}
          accent="border-amber-200"
          icon={<FiClock className="size-4 text-amber-500" />}
        />
        <KpiCard
          label="Approved"
          value={formatMoney(totals?.totalApproved ?? 0)}
          accent="border-emerald-200"
          icon={<FiCheckCircle className="size-4 text-emerald-500" />}
        />
        <KpiCard
          label="Paid Out"
          value={formatMoney(totals?.totalPaid ?? 0)}
          accent="border-indigo-200"
          icon={<FiDollarSign className="size-4 text-indigo-500" />}
        />
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">By Status</p>
        <div className="space-y-1.5">
          {statusData.map((s) => (
            <div key={s.status} className="flex items-center justify-between gap-2">
              <StatusBadge status={s.status} compact />
              <span className="text-[11px] font-medium text-slate-600">{s.count} · {formatMoney(s.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category bars */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Top Categories</p>
        {catData.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-400">No data yet</p>
        ) : (
          <div className="space-y-2">
            {catData.map((c, i) => (
              <div key={i}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    {EXPENSE_CATEGORY_ICONS[c._id]} {categoryLabel(c._id)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">{formatMoney(c.total)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: catMax > 0 ? `${(c.total / catMax) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

function ExpenseFormModal({ expense, onClose, onSaved }: {
  expense?: Expense | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!expense;
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const uploadReceiptMut = useUploadExpenseReceipt(expense?._id ?? '__new__');

  const [title, setTitle] = useState(expense?.title ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'other');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate ? expense.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!receiptFile) { setReceiptPreview(null); return; }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const isPending = createMut.isPending || updateMut.isPending || uploadReceiptMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    if (!title.trim()) { setError('Title is required'); return; }
    if (isNaN(numAmount) || numAmount < 0) { setError('Enter a valid amount'); return; }
    if (!expenseDate) { setError('Date is required'); return; }

    try {
      let saved: Expense;
      if (isEdit && expense) {
        const payload: UpdateExpensePayload = { title: title.trim(), description: description.trim() || undefined, amount: numAmount, category, expenseDate };
        saved = await updateMut.mutateAsync({ id: expense._id, payload });
        if (receiptFile) await uploadReceiptMut.mutateAsync(receiptFile);
      } else {
        const payload: CreateExpensePayload = { title: title.trim(), description: description.trim() || undefined, amount: numAmount, category, expenseDate };
        saved = await createMut.mutateAsync(payload);
        if (receiptFile) await uploadExpenseReceiptApi(saved._id, receiptFile);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const SEL = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-slate-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/60" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Expense' : 'Submit New Expense'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><FiX className="size-5" /></button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <FiXCircle className="size-4 shrink-0" />{error}
            </div>
          )}

          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client dinner, Flight to Delhi…" disabled={isPending} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} disabled={isPending} className={SEL}>
                {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{EXPENSE_CATEGORY_ICONS[o.value]} {o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
              <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} disabled={isPending} className={SEL} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">₹</span>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={isPending} className={`${SEL} pl-7`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Any additional notes…" disabled={isPending}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-slate-50" />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Receipt</label>
            {(expense?.receiptUrl || receiptPreview) && (
              <div className="mb-2 overflow-hidden rounded-xl border border-slate-200">
                {(receiptPreview || expense?.receiptUrl)?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={receiptPreview ?? expense?.receiptUrl} alt="Receipt" className="max-h-32 w-full object-contain bg-slate-50" />
                ) : (
                  <a href={expense?.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-sm text-indigo-600 hover:bg-slate-50">
                    <FiPaperclip className="size-4" />{receiptPreview ? receiptFile?.name : 'Existing receipt'}
                  </a>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="w-full">
              <FiUpload className="mr-1.5 inline size-4" />
              {receiptFile ? receiptFile.name : expense?.receiptUrl ? 'Replace receipt' : 'Upload receipt'}
            </Button>
            <p className="mt-1 text-xs text-slate-400">Image or PDF, max 15 MB</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending} className="flex-1">{isEdit ? 'Save changes' : 'Submit expense'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ expense, initialStatus, onClose }: {
  expense: Expense;
  /** Pre-selected decision based on where the user clicked from */
  initialStatus: 'approved' | 'rejected' | 'paid';
  onClose: () => void;
}) {
  const reviewMut = useReviewExpense();
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'paid'>(initialStatus);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);


  // When expense is already approved, only allow marking as paid or rejected
  const isAlreadyApproved = expense.status === 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header with colored stripe indicating action context */}
        <div className={`flex items-center justify-between px-6 py-4 ${
          isAlreadyApproved ? 'bg-indigo-600' : 'border-b border-slate-100'
        }`}>
          <div>
            <h2 className={`font-semibold ${isAlreadyApproved ? 'text-white' : 'text-slate-900'}`}>
              {isAlreadyApproved ? '💰 Mark as Paid' : '📋 Review Expense'}
            </h2>
            {isAlreadyApproved && (
              <p className="text-xs text-white/70 mt-0.5">This expense is approved — confirm payment below</p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className={`rounded-lg p-1.5 ${isAlreadyApproved ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
            <FiX className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-slate-50 p-4 space-y-1">
            <p className="font-semibold text-slate-800">{expense.title}</p>
            <p className="text-xs text-slate-500">{formatDate(expense.expenseDate)} · {EXPENSE_CATEGORY_ICONS[expense.category]} {categoryLabel(expense.category)}</p>
            <p className="text-xl font-bold text-indigo-600">{formatMoneyFull(expense.amount, expense.currency)}</p>
            {expense.receiptUrl && (
              <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline">
                <FiPaperclip className="size-3" /> View receipt
              </a>
            )}
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          {/* Decision selector — scoped options per context */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Decision *</label>
            {isAlreadyApproved ? (
              /* Approved expense → only Paid or Reject */
              <div className="grid grid-cols-2 gap-2">
                {(['paid', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewStatus(s)}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                      reviewStatus === s
                        ? s === 'paid'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                          : 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'paid' ? '💰 Mark as Paid' : '❌ Reject'}
                  </button>
                ))}
              </div>
            ) : (
              /* Open expense → Approve or Reject */
              <div className="grid grid-cols-2 gap-2">
                {(['approved', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewStatus(s)}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                      reviewStatus === s
                        ? s === 'approved'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100'
                          : 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'approved' ? '✅ Approve' : '❌ Reject'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder={reviewStatus === 'rejected' ? 'Reason for rejection…' : 'Any remarks…'}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={reviewMut.isPending}>Cancel</Button>
            <Button
              onClick={async () => { setError(null); try { await reviewMut.mutateAsync({ id: expense._id, payload: { status: reviewStatus, reviewNote: note.trim() } }); onClose(); } catch (err) { setError((err as Error).message); } }}
              loading={reviewMut.isPending}
              className={`flex-1 ${
                reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' :
                reviewStatus === 'paid' ? 'bg-indigo-600 hover:bg-indigo-700' : ''
              }`}
            >
              {reviewStatus === 'approved' ? 'Approve' : reviewStatus === 'rejected' ? 'Reject' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ expense }: { expense: Expense }) {
  type Step = { key: string; label: string; description: string; done: boolean; active: boolean; rejected?: boolean; date?: string };

  const isRejected = expense.status === 'rejected';

  const steps: Step[] = [
    {
      key: 'open',
      label: 'Submitted',
      description: submitterName(expense),
      done: true,
      active: expense.status === 'open',
      date: expense.createdAt,
    },
    isRejected
      ? {
          key: 'rejected',
          label: 'Rejected',
          description: typeof expense.reviewedBy === 'object' && expense.reviewedBy && 'fullName' in expense.reviewedBy
            ? expense.reviewedBy.fullName : 'Admin',
          done: true,
          active: true,
          rejected: true,
          date: expense.reviewedAt ?? undefined,
        }
      : {
          key: 'approved',
          label: 'Approved',
          description: expense.status === 'approved' || expense.status === 'paid'
            ? (typeof expense.reviewedBy === 'object' && expense.reviewedBy && 'fullName' in expense.reviewedBy
                ? expense.reviewedBy.fullName : 'Admin')
            : 'Pending review',
          done: expense.status === 'approved' || expense.status === 'paid',
          active: expense.status === 'approved',
          date: expense.status === 'approved' || expense.status === 'paid' ? expense.reviewedAt ?? undefined : undefined,
        },
    ...(!isRejected ? [{
      key: 'paid',
      label: 'Paid',
      description: expense.status === 'paid' ? (expense.paidAt ? formatDate(expense.paidAt) : 'Done') : 'Awaiting payment',
      done: expense.status === 'paid',
      active: expense.status === 'paid',
      date: expense.paidAt ?? undefined,
    }] : []),
  ];

  return (
    <div className="border-t border-slate-100 px-6 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Timeline</p>
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            {/* Connector + dot row */}
            <div className="flex w-full items-center">
              {/* Left connector */}
              <div className={`h-0.5 flex-1 ${idx === 0 ? 'opacity-0' : step.done ? (step.rejected ? 'bg-red-300' : 'bg-emerald-400') : 'bg-slate-200'}`} />
              {/* Dot */}
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                step.rejected
                  ? 'border-red-400 bg-red-50'
                  : step.done
                  ? 'border-emerald-500 bg-emerald-500'
                  : step.active
                  ? 'border-indigo-500 bg-white'
                  : 'border-slate-200 bg-white'
              }`}>
                {step.rejected ? (
                  <FiXCircle className="size-3.5 text-red-500" />
                ) : step.done ? (
                  <FiCheckCircle className="size-3.5 text-white" />
                ) : (
                  <div className={`size-2 rounded-full ${step.active ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                )}
              </div>
              {/* Right connector */}
              <div className={`h-0.5 flex-1 ${idx === steps.length - 1 ? 'opacity-0' : step.done && !step.rejected && !step.active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            </div>
            {/* Label */}
            <p className={`mt-1.5 text-[11px] font-semibold ${
              step.rejected ? 'text-red-600' : step.done ? 'text-emerald-700' : step.active ? 'text-indigo-600' : 'text-slate-400'
            }`}>{step.label}</p>
            <p className="text-[10px] text-slate-400 text-center leading-tight mt-0.5">{step.description}</p>
            {step.date && (
              <p className="text-[10px] text-slate-300 mt-0.5">{formatDate(step.date)}</p>
            )}
          </div>
        ))}
      </div>
      {expense.reviewNote && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${
          isRejected ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          <span className="font-medium">Note: </span>{expense.reviewNote}
        </div>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ expense, isAdmin, onClose, onEdit, onReview, onDelete }: {
  expense: Expense; isAdmin: boolean; onClose: () => void;
  onEdit: () => void; onReview: () => void; onDelete: () => void;
}) {
  const headerColor = expense.status === 'approved' ? 'bg-emerald-600' : expense.status === 'paid' ? 'bg-indigo-600' : expense.status === 'rejected' ? 'bg-red-600' : 'bg-amber-600';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/60" onClick={(e) => e.stopPropagation()}>
        <div className={`px-6 py-4 ${headerColor}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{EXPENSE_CATEGORY_ICONS[expense.category]} {categoryLabel(expense.category)}</p>
              <h2 className="mt-0.5 text-lg font-bold text-white leading-tight">{expense.title}</h2>
              <p className="mt-0.5 text-2xl font-bold text-white">{formatMoneyFull(expense.amount, expense.currency)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"><FiX className="size-4" /></button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {/* Status timeline */}
          <StatusTimeline expense={expense} />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 px-6 py-4 text-sm">
            <div><p className="text-xs text-slate-400">Date</p><p className="font-medium text-slate-800">{formatDate(expense.expenseDate)}</p></div>
            <div><p className="text-xs text-slate-400">Submitted by</p><p className="font-medium text-slate-800">{submitterName(expense)}</p></div>
            {expense.description && (
              <div className="col-span-2"><p className="text-xs text-slate-400">Description</p><p className="font-medium text-slate-800 whitespace-pre-wrap">{expense.description}</p></div>
            )}
          </div>

          {/* Receipt */}
          {expense.receiptUrl && (
            <div className="border-t border-slate-100 px-6 pb-4 pt-3">
              <p className="mb-2 text-xs text-slate-400">Receipt</p>
              {expense.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img src={expense.receiptUrl} alt="Receipt" className="max-h-48 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain hover:opacity-90 transition-opacity" />
                </a>
              ) : (
                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-indigo-600 hover:bg-slate-50">
                  <FiPaperclip className="size-4" /> View receipt document
                </a>
              )}
            </div>
          )}

          {/* Actions footer */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-3">
            {expense.status === 'open' && <Button variant="outline" onClick={onEdit}><FiEdit2 className="mr-1 inline size-3.5" />Edit</Button>}
            {isAdmin && (expense.status === 'open' || expense.status === 'approved') && (
              <Button onClick={onReview}>
                {expense.status === 'approved'
                  ? <><FiDollarSign className="mr-1 inline size-3.5" />Mark Paid</>
                  : <><FiCheckCircle className="mr-1 inline size-3.5" />Review</>}
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete}><FiTrash2 className="inline size-3.5" /></Button>
            )}
            <Button variant="outline" onClick={onClose} className="ml-auto">Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExpenseManagement() {
  const { data: auth } = useCurrentUser();
  const isAdmin = auth?.user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [reviewExpense, setReviewExpense] = useState<Expense | null>(null);

  const deleteMut = useDeleteExpense();

  const { data, isLoading, isError, error } = useExpensesList({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    page,
    limit,
  });

  const expenses = data?.data ?? [];
  const pagination = data?.pagination;

  function openCreate() { setEditingExpense(null); setFormOpen(true); }
  function openEdit(exp: Expense) { setEditingExpense(exp); setDetailExpense(null); setFormOpen(true); }
  function handleDelete(exp: Expense) {
    if (confirm(`Delete "${exp.title}"? This cannot be undone.`)) {
      void deleteMut.mutateAsync(exp._id);
      setDetailExpense(null);
    }
  }

  const SEL = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none';
  const hasFilters = statusFilter || categoryFilter;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expense Management</h1>
          <p className="text-sm text-slate-500">Submit, track, and manage expenses with receipts.</p>
        </div>
        <Button onClick={openCreate}>
          <FiPlus className="mr-1.5 inline size-4" />New expense
        </Button>
      </div>

      {/* ── Two-column layout: sidebar analytics + main table ── */}
      <div className="flex min-h-0 flex-1 gap-5 xl:flex-row flex-col">

        {/* LEFT: Analytics sidebar */}
        <div className="shrink-0 xl:w-64 2xl:w-72">
          <AnalyticsSidebar />
        </div>

        {/* RIGHT: Table takes all remaining space */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1">
              <svg className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput); setPage(1); } }}
                placeholder="Search expenses…"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
              />
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as ExpenseStatus | ''); setPage(1); }} className={SEL}>
              <option value="">All statuses</option>
              {EXPENSE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Category filter */}
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value as ExpenseCategory | ''); setPage(1); }} className={SEL}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{EXPENSE_CATEGORY_ICONS[o.value]} {o.label}</option>)}
            </select>

            {hasFilters && (
              <button type="button" onClick={() => { setStatusFilter(''); setCategoryFilter(''); setPage(1); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200">
                <FiX className="size-3" /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto">
            {isError ? (
              <p className="py-12 text-center text-sm text-red-600">{(error as Error).message}</p>
            ) : isLoading ? (
              <div className="space-y-0 divide-y divide-slate-100">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                  <FiDollarSign className="size-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No expenses found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {hasFilters ? 'Try removing some filters.' : 'Submit your first expense to get started.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2.5">Expense</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Status</th>
                    {isAdmin && <th className="px-4 py-2.5">Submitted by</th>}
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.map((r) => (
                    <tr key={r._id} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 leading-snug">{r.title}</span>
                          {r.receiptUrl && (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View receipt"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              <FiPaperclip className="size-2.5" />Receipt
                            </a>
                          )}
                        </div>
                        {r.description && <p className="mt-0.5 truncate text-xs text-slate-400 max-w-[200px]">{r.description}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{formatDate(r.expenseDate)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm font-semibold text-slate-800">{formatMoneyFull(r.amount, r.currency)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-600">{EXPENSE_CATEGORY_ICONS[r.category]} {categoryLabel(r.category)}</span>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} compact /></td>
                      {isAdmin && <td className="px-4 py-2.5 text-xs text-slate-500">{submitterName(r)}</td>}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => setDetailExpense(r)} title="View"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                            <FiEye className="size-3.5" />
                          </button>
                          {r.status === 'open' && (
                            <button type="button" onClick={() => openEdit(r)} title="Edit"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                              <FiEdit2 className="size-3.5" />
                            </button>
                          )}
                          {isAdmin && (r.status === 'open' || r.status === 'approved') && (
                            <button type="button" onClick={() => setReviewExpense(r)} title="Review"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                              <FiCheckCircle className="size-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => handleDelete(r)} title="Delete"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                              <FiTrash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination bar (always visible at bottom of table card) */}
          {pagination && (
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {formOpen && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={() => { setFormOpen(false); setEditingExpense(null); }}
          onSaved={() => { setFormOpen(false); setEditingExpense(null); }}
        />
      )}
      {detailExpense && (
        <DetailModal
          expense={detailExpense}
          isAdmin={isAdmin}
          onClose={() => setDetailExpense(null)}
          onEdit={() => openEdit(detailExpense)}
          onReview={() => { setReviewExpense(detailExpense); setDetailExpense(null); }}
          onDelete={() => handleDelete(detailExpense)}
        />
      )}
      {reviewExpense && (
        <ReviewModal
          expense={reviewExpense}
          initialStatus={reviewExpense.status === 'approved' ? 'paid' : 'approved'}
          onClose={() => setReviewExpense(null)}
        />
      )}
    </div>
  );
}
