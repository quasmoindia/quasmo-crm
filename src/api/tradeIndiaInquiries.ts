import { useQuery } from '@tanstack/react-query';
import { get } from '../utils/api';
import type { TradeIndiaInquiryFetchResult, TradeIndiaStatus } from '../types/tradeIndiaInquiry';

const BASE = '/tradeindia-inquiries';
export const tradeIndiaQueryKey = ['tradeindia-inquiries'];

export function fetchTradeIndiaInquiriesApi(params: {
  from_date: string;
  to_date: string;
  limit?: number;
  page_no?: number;
}) {
  const queryParams: Record<string, string> = {
    from_date: params.from_date,
    to_date: params.to_date,
  };
  if (params.limit != null) queryParams.limit = String(params.limit);
  if (params.page_no != null) queryParams.page_no = String(params.page_no);
  return get<TradeIndiaInquiryFetchResult>(BASE, { params: queryParams });
}

export function useTradeIndiaStatus() {
  return useQuery({
    queryKey: [...tradeIndiaQueryKey, 'status'],
    queryFn: () => get<TradeIndiaStatus>(`${BASE}/status`),
    staleTime: 60_000,
  });
}

export function useTradeIndiaInquiries(
  params: { from_date: string; to_date: string; limit?: number; page_no?: number },
  enabled: boolean
) {
  return useQuery({
    queryKey: [...tradeIndiaQueryKey, params],
    queryFn: () => fetchTradeIndiaInquiriesApi(params),
    enabled: enabled && Boolean(params.from_date && params.to_date),
    retry: false,
  });
}
