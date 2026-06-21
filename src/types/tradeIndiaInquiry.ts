export interface TradeIndiaInquiryRequestMeta {
  from_date: string;
  to_date: string;
  limit: number;
  page_no: number;
  url: string;
}

export interface TradeIndiaInquiryFetchResult {
  source: 'tradeindia';
  configured: boolean;
  fetchedAt: string;
  request: TradeIndiaInquiryRequestMeta;
  contentType: string;
  parseKind: 'json' | 'text';
  raw: unknown;
  rawText?: string;
  items: Record<string, unknown>[];
  itemCount: number;
  notice?: string;
}

export interface TradeIndiaStatus {
  configured: boolean;
  module: string;
  api: string;
}
