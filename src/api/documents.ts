import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type { DocumentsListResponse, ManagedDocument, DocumentCategory, DocumentModule } from '../types/document';

const DOCUMENTS_BASE = '/documents';

export function useDocumentsList(params?: {
  search?: string;
  category?: DocumentCategory | 'all';
  module?: DocumentModule | 'all';
  page?: number;
  limit?: number;
}) {
  const queryParams: Record<string, string> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.category) queryParams.category = params.category;
  if (params?.module) queryParams.module = params.module;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => get<DocumentsListResponse>(DOCUMENTS_BASE, { params: queryParams }),
  });
}

export async function uploadDocumentApi(payload: {
  file: File;
  category: DocumentCategory | 'all';
  module: DocumentModule | 'all';
  tags?: string;
}) {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${DOCUMENTS_BASE}/upload`;
  const form = new FormData();
  form.append('file', payload.file);
  form.append('category', payload.category === 'all' ? 'other' : payload.category);
  form.append('module', payload.module === 'all' ? 'other' : payload.module);
  form.append('tags', payload.tags ?? '');

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as ManagedDocument;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocumentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { category?: DocumentCategory | 'all'; module?: DocumentModule | 'all'; tags?: string };
    }) =>
      patch<ManagedDocument>(`${DOCUMENTS_BASE}/${id}`, {
        ...payload,
        category: payload.category === 'all' ? 'other' : payload.category,
        module: payload.module === 'all' ? 'other' : payload.module,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${DOCUMENTS_BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
