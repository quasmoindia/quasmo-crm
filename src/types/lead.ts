/** Sales pipeline including quotations & invoices */
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'proposal'
  | 'closed'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'referral'
  | 'cold_call'
  | 'campaign'
  | 'indiamart'
  | 'other';

export type LeadDocumentSentType = 'quotation' | 'invoice' | 'proforma' | 'other';

export interface LeadUser {
  _id: string;
  fullName: string;
  email?: string;
}

/** Logged when a quotation, invoice, etc. is sent to the lead */
export interface LeadDocumentSent {
  _id: string;
  type: LeadDocumentSentType;
  reference?: string;
  amount?: string;
  notes?: string;
  sentAt: string;
  sentBy?: LeadUser | string | null;
}

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  /** Registered / business address */
  address?: string;
  /** GSTIN / tax ID */
  gstNumber?: string;
  status: LeadStatus;
  source?: LeadSource;
  notes?: string;
  externalSource?: 'indiamart';
  externalId?: string;
  inquiryMeta?: {
    queryType?: string;
    queryTime?: string;
    subject?: string;
    product?: string;
    mcat?: string;
    city?: string;
    state?: string;
    pincode?: string;
    catalog?: string;
    formName?: string;
    pageUrl?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    raw?: { message?: string };
  };
  documentsSent?: LeadDocumentSent[];
  /** Uploaded file URLs (PDF, images, Office, etc.) */
  attachments?: string[];
  assignedTo?: LeadUser | null;
  createdBy: LeadUser;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResponse {
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateLeadPayload {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateLeadPayload {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  /** Send empty string to clear stored address */
  address?: string;
  gstNumber?: string;
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  assignedTo?: string | null;
}

export interface AddLeadDocumentPayload {
  type: LeadDocumentSentType;
  reference?: string;
  amount?: string;
  notes?: string;
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed', label: 'Closed (won)' },
  { value: 'lost', label: 'Lost' },
];

/** Tailwind classes for status badge (bg-* text-*) */
export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-blue-100 text-blue-800',
  proposal: 'bg-amber-100 text-amber-800',
  closed: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-slate-200 text-slate-700',
};

export const LEAD_DOCUMENT_TYPE_OPTIONS: { value: LeadDocumentSentType; label: string }[] = [
  { value: 'quotation', label: 'Quotation' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'proforma', label: 'Proforma' },
  { value: 'other', label: 'Other' },
];

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'indiamart', label: 'IndiaMART' },
  { value: 'other', label: 'Other' },
];

/** Tailwind classes for source badge (bg, text, ring) */
export const LEAD_SOURCE_STYLES: Record<LeadSource, string> = {
  website: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  referral: 'bg-teal-50 text-teal-800 ring-teal-200/80',
  cold_call: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  campaign: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200/80',
  indiamart: 'bg-orange-50 text-orange-900 ring-orange-200/80',
  other: 'bg-slate-100 text-slate-600 ring-slate-200/80',
};

export function getLeadSourceLabel(source: LeadSource | undefined): string {
  if (!source) return 'Not set';
  return LEAD_SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
}

export function resolveLeadSource(lead: Pick<Lead, 'source' | 'externalSource'>): LeadSource | undefined {
  if (lead.source) return lead.source;
  if (lead.externalSource === 'indiamart') return 'indiamart';
  return undefined;
}
