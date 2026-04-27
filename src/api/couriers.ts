import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '../utils/api';
import type { Courier, CreateCourierPayload } from '../types/courier';

const COURIERS_BASE = '/couriers';

export function useCouriersList() {
  return useQuery({
    queryKey: ['couriers'],
    queryFn: () => get<{ data: Courier[] }>(COURIERS_BASE),
  });
}

export function useCreateCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCourierPayload) => post<Courier>(COURIERS_BASE, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });
}

export function useUpdateCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCourierPayload> }) =>
      patch<Courier>(`${COURIERS_BASE}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });
}
