export type TaxDocumentKind = 'tax_invoice' | 'proforma' | 'quotation';

export const DOCUMENT_KIND_OPTIONS: { value: TaxDocumentKind; label: string }[] = [
  { value: 'tax_invoice', label: 'Tax invoice' },
  { value: 'proforma', label: 'Proforma invoice' },
  { value: 'quotation', label: 'Quotation' },
];
