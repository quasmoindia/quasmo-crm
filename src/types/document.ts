export type DocumentCategory = 'invoice' | 'contract' | 'quotation' | 'report' | 'certificate' | 'other';
export type DocumentModule =
  | 'users'
  | 'roles'
  | 'complaints'
  | 'leads'
  | 'invoices'
  | 'products'
  | 'customers'
  | 'orders'
  | 'expenses'
  | 'documents'
  | 'other';

export interface ManagedDocument {
  _id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  extension?: string;
  displayType: string;
  category: DocumentCategory;
  module: DocumentModule;
  tags: string[];
  uploadedBy?: { _id: string; fullName: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsListResponse {
  data: ManagedDocument[];
  stats: {
    total: number;
    pdf: number;
    images: number;
    other: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'contract', label: 'Contract' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'report', label: 'Report' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

export const DOCUMENT_MODULE_OPTIONS: { value: DocumentModule; label: string }[] = [
  { value: 'users', label: 'User management' },
  { value: 'roles', label: 'Role management' },
  { value: 'complaints', label: 'Complaint management' },
  { value: 'leads', label: 'Lead management' },
  { value: 'invoices', label: 'Tax invoices' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
  { value: 'orders', label: 'Order Management' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'documents', label: 'Documents' },
  { value: 'other', label: 'Other' },
];
