import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type { BankAccount, BankAccountsListResponse } from '../types/bankAccount';

const BASE = '/bank-accounts';

/** Upload QR image (ImageKit); use returned URL as `qrUrl` or `bankQrUrl`. */
export async function uploadBankQrImageApi(file: File): Promise<{ url: string }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${BASE.replace(/^\//, '')}/upload-qr-image`;
  const url = `${base}/${path}`;
  const form = new FormData();
  form.append('qr', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'QR upload failed');
  return data as { url: string };
}

export const bankAccountsQueryKey = ['bankAccounts'];

export function listBankAccountsApi(opts?: { includeInactive?: boolean }) {
  const q = opts?.includeInactive ? '?active=false' : '';
  return get<BankAccountsListResponse>(`${BASE}${q}`);
}

export function createBankAccountApi(body: {
  label: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch?: string;
  upiId?: string;
  qrUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return post<BankAccount>(BASE, body);
}

export function updateBankAccountApi(
  id: string,
  body: Partial<{
    label: string;
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
    upiId: string;
    qrUrl: string;
    sortOrder: number;
    isActive: boolean;
  }>
) {
  return patch<BankAccount>(`${BASE}/${id}`, body);
}

export function deleteBankAccountApi(id: string) {
  return del<{ message: string }>(`${BASE}/${id}`);
}

export function useBankAccounts(opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive ?? false;
  return useQuery({
    queryKey: [...bankAccountsQueryKey, includeInactive],
    queryFn: () => listBankAccountsApi({ includeInactive }),
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBankAccountApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsQueryKey }),
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateBankAccountApi>[1] }) =>
      updateBankAccountApi(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsQueryKey }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBankAccountApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsQueryKey }),
  });
}
