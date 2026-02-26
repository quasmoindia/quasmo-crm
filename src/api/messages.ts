import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../utils/api';

const MESSAGES_BASE = '/messages';

export interface MessageRecord {
  _id: string;
  fromUser: { _id: string; fullName?: string; email?: string };
  toUserId?: string;
  toPhone: string;
  direction: 'outbound' | 'inbound';
  body: string;
  createdAt: string;
}

export interface MessagesThreadResponse {
  data: MessageRecord[];
}

export function getThreadApi(toUserId: string) {
  return get<MessagesThreadResponse>(`${MESSAGES_BASE}?toUserId=${encodeURIComponent(toUserId)}`);
}

export function sendMessageApi(payload: { toUserId: string; body: string }) {
  return post<MessageRecord>(`${MESSAGES_BASE}/send`, payload);
}

export function messagesThreadKey(toUserId: string) {
  return ['messages', 'thread', toUserId] as const;
}

export function useMessagesThread(toUserId: string | null) {
  return useQuery({
    queryKey: messagesThreadKey(toUserId ?? ''),
    queryFn: () => getThreadApi(toUserId!),
    enabled: Boolean(toUserId),
  });
}

export function useSendMessage(toUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessageApi({ toUserId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesThreadKey(toUserId) });
    },
  });
}
