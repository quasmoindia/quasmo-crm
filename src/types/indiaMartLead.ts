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

export type IndiaMartDuplicateStatus = 'new' | 'imported' | 'phone_duplicate';

export interface IndiaMartDuplicateInfo {
  rowKey: string;
  status: IndiaMartDuplicateStatus;
  leadId?: string;
  leadName?: string;
  matchedBy?: 'externalId' | 'phone';
}

export interface IndiaMartImportDetail {
  rowKey: string;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
  leadId?: string;
  leadName?: string;
}

export interface IndiaMartImportResult {
  created: number;
  skipped: number;
  failed: number;
  details: IndiaMartImportDetail[];
}

export interface IndiaMartCheckDuplicatesResult {
  duplicates: Record<string, IndiaMartDuplicateInfo>;
}

function str(value: unknown): string {
  if (value == null || value === '' || value === '<nil>') return '';
  return String(value).trim();
}

export function indiaMartRowKey(row: IndiaMartLead): string {
  const id = str(row.UNIQUE_QUERY_ID);
  if (id) return id;
  return [str(row.SENDER_MOBILE), str(row.QUERY_TIME), str(row.QUERY_PRODUCT_NAME)].join('|');
}

export function isIndiaMartImportable(status: IndiaMartDuplicateStatus | undefined): boolean {
  return status === 'new' || status === undefined;
}
