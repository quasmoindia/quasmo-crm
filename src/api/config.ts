import { useQuery } from '@tanstack/react-query';
import { get } from '../utils/api';
import type { RolesConfigResponse } from '../types/user';

export function getRolesConfigApi() {
  return get<RolesConfigResponse>('/config/roles');
}

export function useRolesConfig() {
  return useQuery({
    queryKey: ['config', 'roles'],
    queryFn: getRolesConfigApi,
  });
}
