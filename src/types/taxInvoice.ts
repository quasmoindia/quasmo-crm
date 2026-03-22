import type { TaxDocumentKind } from './taxDocumentKind';

export interface TaxInvoiceLineItem {
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  price: number;
  amount?: number;
}

/** Row from GET /invoices/line-item-suggestions (past invoice lines for autocomplete). */
export interface TaxInvoiceLineItemSuggestion {
  description: string;
  hsnSac: string;
  unit: string;
  price: number;
  lastUsed?: string;
}

export interface TaxInvoiceUserRef {
  _id: string;
  fullName: string;
  email?: string;
}

export interface TaxInvoiceLeadRef {
  _id: string;
  name: string;
  phone?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  email?: string;
}

export interface TaxInvoice {
  _id: string;
  leadId?: TaxInvoiceLeadRef | string | null;

  documentKind?: TaxDocumentKind;
  bankAccountId?: string | { _id: string; label?: string } | null;
  signaturePresetId?: string | { _id: string; label?: string } | null;

  sellerGstin: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhones: string[];
  sellerEmails: string[];

  copyLabel: string;

  invoiceNo: string;
  invoiceDate: string;
  placeOfSupply: string;
  /** Legacy; no longer on form/PDF */
  reverseCharge?: string;
  transport: string;

  vehicleNo: string;
  paymentTerms?: string;
  ewayBillNo: string;
  dateOfRemoval: string;
  freight: string;

  billedToName: string;
  billedToAddress: string;
  billedToGstin: string;

  shippedToName: string;
  shippedToAddress: string;
  shippedToContact: string;
  shippedToGstin: string;

  contractNo: string;
  remarks?: string;

  items: TaxInvoiceLineItem[];

  /** GST % (legacy API may still return igstRate) */
  gstRate?: number;
  igstRate?: number;
  gstAmount?: number;
  igstAmount?: number;

  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  bankUpiId?: string;
  bankQrUrl?: string;

  termsAndConditions: string;

  amountInWords?: string;

  /** Issuer images on PDF (ImageKit URLs) */
  issuerSignatureUrl?: string;
  issuerStampUrl?: string;
  issuerDigitalSignatureUrl?: string;

  taxableTotal: number;
  grandTotal: number;
  quantityTotal: number;

  createdBy: TaxInvoiceUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface TaxInvoicesListResponse {
  data: TaxInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type TaxInvoicePayload = Omit<
  TaxInvoice,
  '_id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'taxableTotal' | 'gstAmount' | 'igstAmount' | 'grandTotal' | 'quantityTotal'
> & {
  leadId?: string | null;
  invoiceDate: string;
};
