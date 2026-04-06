import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../utils/api';
import type { HexaUserRecord, HexaUsersListResponse, CreateHexaUserPayload } from '../types/hexaUser';

const HEXA_USERS_BASE = '/hexa-users';

export const hexaUsersQueryKey = ['hexa-users'];

export function listHexaUsersApi() {
  return get<HexaUsersListResponse>(HEXA_USERS_BASE);
}

export function createHexaUserApi(payload: CreateHexaUserPayload) {
  return post<HexaUserRecord>(HEXA_USERS_BASE, payload);
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
