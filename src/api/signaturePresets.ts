import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type { SignaturePreset, SignaturePresetsListResponse, SignaturePresetSlot } from '../types/signaturePreset';

const BASE = '/signature-presets';

export const signaturePresetsQueryKey = ['signaturePresets'];

export function listSignaturePresetsApi(opts?: { includeInactive?: boolean }) {
  const q = opts?.includeInactive ? '?active=false' : '';
  return get<SignaturePresetsListResponse>(`${BASE}${q}`);
}

export async function uploadSignaturePresetImageApi(file: File, slot: SignaturePresetSlot): Promise<{ url: string }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${BASE.replace(/^\//, '')}/upload-image`;
  const url = `${base}/${path}`;
  const form = new FormData();
  form.append('image', file);
  form.append('slot', slot);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Image upload failed');
  return data as { url: string };
}

export function createSignaturePresetApi(body: {
  label: string;
  issuerStampUrl?: string;
  issuerSignatureUrl?: string;
  issuerDigitalSignatureUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return post<SignaturePreset>(BASE, body);
}

export function updateSignaturePresetApi(
  id: string,
  body: Partial<{
    label: string;
    issuerStampUrl: string;
    issuerSignatureUrl: string;
    issuerDigitalSignatureUrl: string;
    sortOrder: number;
    isActive: boolean;
  }>
) {
  return patch<SignaturePreset>(`${BASE}/${id}`, body);
}

export function deleteSignaturePresetApi(id: string) {
  return del<{ message: string }>(`${BASE}/${id}`);
}

export function useSignaturePresets(opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive ?? false;
  return useQuery({
    queryKey: [...signaturePresetsQueryKey, includeInactive],
    queryFn: () => listSignaturePresetsApi({ includeInactive }),
  });
}

export function useCreateSignaturePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSignaturePresetApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: signaturePresetsQueryKey }),
  });
}

export function useUpdateSignaturePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSignaturePresetApi>[1] }) =>
      updateSignaturePresetApi(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: signaturePresetsQueryKey }),
  });
}

export function useDeleteSignaturePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSignaturePresetApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: signaturePresetsQueryKey }),
  });
}
