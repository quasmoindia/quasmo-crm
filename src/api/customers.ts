import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import type { Customer, CreateCustomerPayload } from '../types/customer';

const CUSTOMERS_BASE = '/customers';

export function useCustomersList(params?: { search?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => get<{ data: Customer[]; pagination: any }>(CUSTOMERS_BASE, { params: queryParams }),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => post<Customer>(CUSTOMERS_BASE, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useConvertLeadToCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => post<Customer>(`${CUSTOMERS_BASE}/convert-lead`, { leadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCustomerPayload> }) =>
      patch<Customer>(`${CUSTOMERS_BASE}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`${CUSTOMERS_BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
