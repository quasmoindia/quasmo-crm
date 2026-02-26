export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high';

export interface ComplaintUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ComplaintComment {
  _id: string;
  author: ComplaintUser | string;
  text: string;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  user: ComplaintUser | string;
  /** User assigned to handle this complaint */
  assignedTo?: ComplaintUser | string | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  productModel?: string;
  serialNumber?: string;
  orderReference?: string;
  internalNotes?: string;
  /** ImageKit URLs – shown when status is in_progress or resolved */
  images?: string[];
  comments?: ComplaintComment[];
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
  assignedTo?: string;
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
  assignedTo?: string | null;
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
