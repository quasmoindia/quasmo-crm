export interface IndiaMartLead {
  UNIQUE_QUERY_ID?: string;
  QUERY_TYPE?: string;
  QUERY_TIME?: string;
  SENDER_NAME?: string;
  SENDER_MOBILE?: string;
  SENDER_EMAIL?: string;
  SUBJECT?: string;
  SENDER_COMPANY?: string;
  SENDER_ADDRESS?: string;
  SENDER_CITY?: string;
  SENDER_STATE?: string;
  SENDER_PINCODE?: string;
  QUERY_PRODUCT_NAME?: string;
  QUERY_MESSAGE?: string;
  QUERY_MCAT_NAME?: string;
  [key: string]: unknown;
}

export interface IndiaMartFetchResult {
  source: 'indiamart';
  configured: boolean;
  fetchedAt: string;
  mode: 'range' | 'recent';
  request: {
    start_time?: string;
    end_time?: string;
    url: string;
  };
  contentType: string;
  apiCode: number | null;
  apiStatus: string | null;
  apiMessage: string | null;
  totalRecords: number;
  raw: unknown;
  items: IndiaMartLead[];
  itemCount: number;
}

export interface IndiaMartStatus {
  configured: boolean;
  module: string;
  api: string;
}

export const QUERY_TYPE_LABELS: Record<string, string> = {
  W: 'Direct enquiry',
  B: 'Buy lead',
  P: 'PNS call',
  BIZ: 'Catalog view',
  WA: 'WhatsApp',
};
