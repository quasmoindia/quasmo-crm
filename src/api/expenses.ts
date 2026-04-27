import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  Expense,
  ExpensesListResponse,
  ExpenseAnalytics,
  CreateExpensePayload,
  UpdateExpensePayload,
  ReviewExpensePayload,
  ExpenseStatus,
  ExpenseCategory,
} from '../types/expense';

const BASE = '/expenses';
export const expensesQueryKey = ['expenses'];

export function expensesListKey(params: {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  search?: string;
  submittedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return [...expensesQueryKey, 'list', params] as const;
}

export function listExpensesApi(params: {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  search?: string;
  submittedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.category) sp.set('category', params.category);
  if (params.search?.trim()) sp.set('search', params.search.trim());
  if (params.submittedBy) sp.set('submittedBy', params.submittedBy);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  const q = sp.toString();
  return get<ExpensesListResponse>(q ? `${BASE}?${q}` : BASE);
}

export function getExpenseApi(id: string) {
  return get<Expense>(`${BASE}/${id}`);
}

export function getExpenseAnalyticsApi(params?: { dateFrom?: string; dateTo?: string }) {
  const sp = new URLSearchParams();
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  const q = sp.toString();
  return get<ExpenseAnalytics>(q ? `${BASE}/analytics?${q}` : `${BASE}/analytics`);
}

export function createExpenseApi(payload: CreateExpensePayload) {
  return post<Expense>(BASE, payload);
}

export function updateExpenseApi(id: string, payload: UpdateExpensePayload) {
  return patch<Expense>(`${BASE}/${id}`, payload);
}

export function reviewExpenseApi(id: string, payload: ReviewExpensePayload) {
  return patch<Expense>(`${BASE}/${id}/review`, payload);
}

export function deleteExpenseApi(id: string) {
  return del<{ message: string }>(`${BASE}/${id}`);
}

export async function uploadExpenseReceiptApi(
  id: string,
  file: File
): Promise<{ receiptUrl: string; expense: Expense }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/${BASE.replace(/^\//, '')}/${id}/receipt`;
  const form = new FormData();
  form.append('receipt', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as { receiptUrl: string; expense: Expense };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useExpensesList(params: {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  search?: string;
  submittedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: expensesListKey(params),
    queryFn: () => listExpensesApi(params),
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: [...expensesQueryKey, id],
    queryFn: () => getExpenseApi(id!),
    enabled: !!id,
  });
}

export function useExpenseAnalytics(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: [...expensesQueryKey, 'analytics', params],
    queryFn: () => getExpenseAnalyticsApi(params),
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExpenseApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpensePayload }) =>
      updateExpenseApi(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}

export function useReviewExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewExpensePayload }) =>
      reviewExpenseApi(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}

export function useUploadExpenseReceipt(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadExpenseReceiptApi(expenseId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesQueryKey });
      qc.invalidateQueries({ queryKey: [...expensesQueryKey, expenseId] });
    },
  });
}
