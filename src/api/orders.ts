import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus,
  SaveShippingLabelPayload,
} from '../types/order';

const ORDERS_BASE = '/orders';

export function useOrdersList(params?: { status?: OrderStatus; search?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.search) queryParams.search = params.search;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => get<{ data: Order[]; pagination: any }>(ORDERS_BASE, { params: queryParams }),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => post<Order>(ORDERS_BASE, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderPayload }) =>
      patch<Order>(`${ORDERS_BASE}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        status?: OrderStatus;
        qualityCheckNotes?: string;
        packingInstructions?: string;
        courier?: string;
        trackingNumber?: string;
        dispatchDate?: string;
      };
    }) => patch<Order>(`${ORDERS_BASE}/${id}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSaveShippingLabelSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SaveShippingLabelPayload }) =>
      patch<Order>(`${ORDERS_BASE}/${id}/shipping-label`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${ORDERS_BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export async function downloadShippingLabelPdfApi(
  orderId: string
): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${ORDERS_BASE}/${orderId}/shipping-label/pdf`;
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to generate shipping label PDF'
    );
  }
  const blob = await res.blob();
  if (blob.type && blob.type !== 'application/pdf') {
    throw new Error('Unexpected response from server while generating PDF.');
  }
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? `shipping-label-${orderId}.pdf`;
  return { blob, filename };
}

export async function uploadOrderDocumentsApi(id: string, files: File[]) {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${ORDERS_BASE}/${id}/documents`;
  
  const form = new FormData();
  files.forEach((f) => form.append('documents', f));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as { uploaded: number; failed: number; urls: string[]; errors: string[] };
}

export async function removeOrderDocumentApi(id: string, url: string): Promise<Order> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const endpoint = `${base}${ORDERS_BASE}/${id}/documents?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Failed to remove document');
  }
  return data as Order;
}
