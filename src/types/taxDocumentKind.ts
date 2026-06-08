export type TaxDocumentKind = 'tax_invoice' | 'proforma' | 'quotation' | 'purchase_order';

export const DOCUMENT_KIND_OPTIONS: { value: TaxDocumentKind; label: string }[] = [
  { value: 'tax_invoice', label: 'Tax invoice' },
  { value: 'proforma', label: 'Proforma invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'purchase_order', label: 'Purchase order' },
];

export function isPurchaseOrder(kind: TaxDocumentKind | string | undefined): boolean {
  return kind === 'purchase_order';
}

/** Labels that differ for purchase orders vs invoices / quotes. */
export function documentKindUiLabels(kind: TaxDocumentKind | string | undefined) {
  const po = isPurchaseOrder(kind);
  return {
    docNo: po ? 'Purchase order no. (auto)' : 'Document / invoice no. (auto)',
    date: po ? 'Order date' : 'Invoice date',
    partySection: po ? 'Purchase order to / Shipped to' : 'Billed to / Shipped to',
    partyName: po ? 'Purchase order to — name' : 'Billed to — name',
    partyColumn: po ? 'PO to' : 'Billed to',
    shipSameAsBill: po
      ? 'Ship-to same as purchase order to (GSTIN, name, address)'
      : 'Ship-to same as bill-to (GSTIN, name, address)',
    showBankDetails: !po,
    leadHint: po
      ? 'pick a row to fill purchase-order-to / ship-to from that lead'
      : 'pick a row to fill bill-to / ship-to from that lead',
  };
}
