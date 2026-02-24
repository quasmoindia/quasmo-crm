export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high';

export interface ComplaintUser {
  _id: string;
  fullName: string;
  email: string;
}

export interface Complaint {
  _id: string;
  user: ComplaintUser | string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  productModel?: string;
  serialNumber?: string;
  orderReference?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintsListResponse {
  data: Complaint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateComplaintPayload {
  subject: string;
  description: string;
  priority?: ComplaintPriority;
  productModel?: string;
  serialNumber?: string;
  orderReference?: string;
}

export interface UpdateComplaintPayload {
  subject?: string;
  description?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  productModel?: string;
  serialNumber?: string;
  orderReference?: string;
  internalNotes?: string;
}

export const STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const PRIORITY_OPTIONS: { value: ComplaintPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
