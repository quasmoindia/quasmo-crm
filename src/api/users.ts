import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../utils/api';
import type { UserRecord, UsersListResponse, CreateUserPayload } from '../types/user';

const USERS_BASE = '/users';

export const usersQueryKey = ['users'];

export function listUsersApi() {
  return get<UsersListResponse>(USERS_BASE);
}

export function createUserApi(payload: CreateUserPayload) {
  return post<UserRecord>(USERS_BASE, payload);
}

export function useUsersList() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: listUsersApi,
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
