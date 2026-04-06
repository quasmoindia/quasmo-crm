import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import type {
  HexaUserRecord,
  HexaUsersListResponse,
  CreateHexaUserPayload,
  UpdateHexaUserPayload,
} from '../types/hexaUser';

const HEXA_USERS_BASE = '/hexa-users';

export const hexaUsersQueryKey = ['hexa-users'];

export function listHexaUsersApi() {
  return get<HexaUsersListResponse>(HEXA_USERS_BASE);
}

export function createHexaUserApi(payload: CreateHexaUserPayload) {
  return post<HexaUserRecord>(HEXA_USERS_BASE, payload);
}

export function updateHexaUserApi(id: string, payload: UpdateHexaUserPayload) {
  const body: UpdateHexaUserPayload = {
    fullName: payload.fullName,
    email: payload.email,
  };
  if (payload.password?.trim()) body.password = payload.password;
  return patch<HexaUserRecord>(`${HEXA_USERS_BASE}/${id}`, body);
}

export function deleteHexaUserApi(id: string) {
  return del<void>(`${HEXA_USERS_BASE}/${id}`);
}

export function useHexaUsersList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: hexaUsersQueryKey,
    queryFn: listHexaUsersApi,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateHexaUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHexaUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hexaUsersQueryKey });
    },
  });
}

export function useUpdateHexaUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateHexaUserPayload }) =>
      updateHexaUserApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hexaUsersQueryKey });
    },
  });
}

export function useDeleteHexaUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHexaUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hexaUsersQueryKey });
    },
  });
}
