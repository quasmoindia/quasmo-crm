/** 4-stage pipeline for microscope sales: New → Contacted → Proposal → Closed */
export type LeadStatus = 'new' | 'contacted' | 'proposal' | 'closed';

export type LeadSource = 'website' | 'referral' | 'cold_call' | 'campaign' | 'other';

export interface LeadUser {
  _id: string;
  fullName: string;
  email?: string;
}

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: LeadStatus;
  source?: LeadSource;
  notes?: string;
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
  phone: string;
  email?: string;
  company?: string;
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
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  assignedTo?: string | null;
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed', label: 'Closed' },
];

/** Tailwind classes for status badge (bg-* text-*) */
export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-blue-100 text-blue-800',
  proposal: 'bg-amber-100 text-amber-800',
  closed: 'bg-emerald-100 text-emerald-800',
};

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'other', label: 'Other' },
];
