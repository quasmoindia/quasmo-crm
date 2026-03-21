import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type { TaxInvoice, TaxInvoicesListResponse } from '../types/taxInvoice';

const BASE = '/invoices';

export const taxInvoicesQueryKey = ['taxInvoices'];

export function taxInvoicesListKey(params: { search?: string; page?: number; limit?: number; leadId?: string }) {
  return [...taxInvoicesQueryKey, 'list', params] as const;
}

export function taxInvoicesByLeadKey(leadId: string) {
  return [...taxInvoicesQueryKey, 'byLead', leadId] as const;
}

export function listTaxInvoicesApi(params: {
  search?: string;
  page?: number;
  limit?: number;
  leadId?: string;
}) {
  const sp = new URLSearchParams();
  if (params.search?.trim()) sp.set('search', params.search.trim());
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.leadId?.trim()) sp.set('leadId', params.leadId.trim());
  const q = sp.toString();
  return get<TaxInvoicesListResponse>(q ? `${BASE}?${q}` : BASE);
}

export function getTaxInvoiceApi(id: string) {
  return get<TaxInvoice>(`${BASE}/${id}`);
}

export function getTaxInvoicePreviewApi(id: string) {
  return get<{ html: string }>(`${BASE}/${id}/preview`);
}

export async function downloadTaxInvoicePdfApi(id: string): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${BASE.replace(/^\//, '')}/${id}/pdf`;
  const url = `${base}/${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? 'PDF download failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? `Tax_Invoice_${id}.pdf`;
  return { blob, filename };
}

export function createTaxInvoiceApi(body: Record<string, unknown>) {
  return post<TaxInvoice>(BASE, body);
}

export function updateTaxInvoiceApi(id: string, body: Record<string, unknown>) {
  return patch<TaxInvoice>(`${BASE}/${id}`, body);
}

export function deleteTaxInvoiceApi(id: string) {
  return del<{ message: string }>(`${BASE}/${id}`);
}

export type UploadInvoiceSignaturesInput = {
  signature?: File;
  stamp?: File;
  digitalSignature?: File;
};

export async function uploadInvoiceSignaturesApi(
  id: string,
  files: UploadInvoiceSignaturesInput
): Promise<{ invoice: TaxInvoice; uploaded: number; errors?: string[] }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${BASE.replace(/^\//, '')}/${id}/signatures`;
  const url = `${base}/${path}`;
  const form = new FormData();
  if (files.signature) form.append('signature', files.signature);
  if (files.stamp) form.append('stamp', files.stamp);
  if (files.digitalSignature) form.append('digitalSignature', files.digitalSignature);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Signature upload failed');
  return data as { invoice: TaxInvoice; uploaded: number; errors?: string[] };
}

export function useTaxInvoicesList(params: { search?: string; page?: number; limit?: number; leadId?: string }) {
  return useQuery({
    queryKey: taxInvoicesListKey(params),
    queryFn: () => listTaxInvoicesApi(params),
  });
}

/** Invoices linked to a CRM lead (document created with this lead selected). */
export function useTaxInvoicesByLead(leadId: string | null) {
  return useQuery({
    queryKey: leadId ? taxInvoicesByLeadKey(leadId) : [...taxInvoicesQueryKey, 'byLead', 'none'],
    queryFn: () => listTaxInvoicesApi({ leadId: leadId!, limit: 50, page: 1 }),
    enabled: !!leadId,
  });
}

export function useTaxInvoice(id: string | null) {
  return useQuery({
    queryKey: [...taxInvoicesQueryKey, id],
    queryFn: () => getTaxInvoiceApi(id!),
    enabled: !!id,
  });
}

export function useCreateTaxInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTaxInvoiceApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: taxInvoicesQueryKey }),
  });
}

export function useUpdateTaxInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      updateTaxInvoiceApi(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: taxInvoicesQueryKey });
      qc.invalidateQueries({ queryKey: [...taxInvoicesQueryKey, variables.id] });
    },
  });
}

export function useDeleteTaxInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTaxInvoiceApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: taxInvoicesQueryKey }),
  });
}
