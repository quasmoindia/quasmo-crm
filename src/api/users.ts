import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import type { UserRecord, UsersListResponse, CreateUserPayload, UpdateUserPayload } from '../types/user';

const USERS_BASE = '/users';

export const usersQueryKey = ['users'];

export function listUsersApi() {
  return get<UsersListResponse>(USERS_BASE);
}

export function createUserApi(payload: CreateUserPayload) {
  return post<UserRecord>(USERS_BASE, payload);
}

export function updateUserApi(id: string, payload: UpdateUserPayload) {
  return patch<UserRecord>(`${USERS_BASE}/${id}`, payload);
}

export function deleteUserApi(id: string) {
  return del<void>(`${USERS_BASE}/${id}`);
}

export function useUsersList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: listUsersApi,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUserApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}
