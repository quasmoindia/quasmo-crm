import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '../utils/api';

export interface RoleRecord {
  _id: string;
  name: string;
  label: string;
  moduleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RolesListResponse {
  data: RoleRecord[];
}

export interface CreateRolePayload {
  name: string;
  label: string;
  moduleIds: string[];
}

export interface UpdateRolePayload {
  label?: string;
  moduleIds?: string[];
}

const ROLES_BASE = '/roles';

export const rolesQueryKey = ['roles'];

export function listRolesApi() {
  return get<RolesListResponse>(ROLES_BASE);
}

export function createRoleApi(payload: CreateRolePayload) {
  return post<RoleRecord>(ROLES_BASE, payload);
}

export function updateRoleApi(id: string, payload: UpdateRolePayload) {
  return patch<RoleRecord>(`${ROLES_BASE}/${id}`, payload);
}

export function useRolesList() {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: listRolesApi,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      queryClient.invalidateQueries({ queryKey: ['config', 'roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      updateRoleApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      queryClient.invalidateQueries({ queryKey: ['config', 'roles'] });
    },
  });
}
