import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEye, FiDownload, FiPlus, FiTrash2, FiEdit2, FiSearch, FiX } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import {
  useTaxInvoicesList,
  useTaxInvoice,
  useCreateTaxInvoice,
  useUpdateTaxInvoice,
  useDeleteTaxInvoice,
  getTaxInvoicePreviewApi,
  getNextDocumentNumberApi,
  listLineItemSuggestionsApi,
  downloadTaxInvoicePdfApi,
  uploadInvoiceSignaturesApi,
  taxInvoicesQueryKey,
} from '../api/taxInvoices';
import { useLeadsList } from '../api/leads';
import { GstinLookupButton, type GstinLookupResponse } from '../components/GstinLookupButton';
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
  uploadBankQrImageApi,
} from '../api/bankAccounts';
import {
  useSignaturePresets,
  useCreateSignaturePreset,
  useUpdateSignaturePreset,
  useDeleteSignaturePreset,
  uploadSignaturePresetImageApi,
} from '../api/signaturePresets';
import { useCurrentUser } from '../api/auth';
import type { TaxInvoice, TaxInvoiceLineItem, TaxInvoiceLineItemSuggestion } from '../types/taxInvoice';
import type { Lead } from '../types/lead';
import type { TaxDocumentKind } from '../types/taxDocumentKind';
import { DOCUMENT_KIND_OPTIONS } from '../types/taxDocumentKind';
import type { BankAccount } from '../types/bankAccount';
import type { SignaturePreset, SignaturePresetSlot } from '../types/signaturePreset';

/** Line row in the editor: qty/price may be '' while the number input is cleared. */
type InvoiceLineFormRow = Omit<TaxInvoiceLineItem, 'qty' | 'price'> & {
  qty: number | '';
  price: number | '';
};

function lineNumericValue(v: number | ''): number {
  if (v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Full invoice editor state (line items allow empty qty/price while typing). */
type TaxInvoiceEditorForm = {
  documentKind: TaxDocumentKind;
  leadId: string;
  bankAccountId: string;
  signaturePresetId: string;
  shipSameAsBill: boolean;
  sellerGstin: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhonesText: string;
  sellerEmailsText: string;
  copyLabel: string;
  invoiceNo: string;
  invoiceDate: string;
  placeOfSupply: string;
  transport: string;
  vehicleNo: string;
  paymentTerms: string;
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
  remarks: string;
  items: InvoiceLineFormRow[];
  gstRate: number;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  bankUpiId: string;
  bankQrUrl: string;
  termsAndConditions: string;
  amountInWords: string;
  issuerSignatureUrl: string;
  issuerStampUrl: string;
  issuerDigitalSignatureUrl: string;
};

const EMPTY_LINE: InvoiceLineFormRow = {
  description: '',
  hsnSac: '',
  qty: 1,
  unit: 'Pcs.',
  price: 0,
};

const DEFAULT_FORM: TaxInvoiceEditorForm = {
  documentKind: 'tax_invoice' as TaxDocumentKind,
  leadId: '' as string,
  bankAccountId: '' as string,
  signaturePresetId: '' as string,
  shipSameAsBill: false,
  sellerGstin: '06AAAFQ0374K1ZA',
  sellerName: 'QUALITY SCIENTIFIC & MECHANICAL WORKS',
  sellerAddress: 'PLOT NO. 84 HSIDC INDUSTRIAL AREA AMBALA',
  sellerPhonesText: '9215617707\n8926666632',
  sellerEmailsText: 'quasmo.mechanical@gmail.com\nqualitynd@yahoo.com',
  copyLabel: 'Original Copy',
  invoiceNo: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  placeOfSupply: '',
  transport: '',
  vehicleNo: '',
  paymentTerms: '',
  ewayBillNo: '',
  dateOfRemoval: '',
  freight: '',
  billedToName: '',
  billedToAddress: '',
  billedToGstin: '',
  shippedToName: '',
  shippedToAddress: '',
  shippedToContact: '',
  shippedToGstin: '',
  contractNo: '',
  remarks: '',
  items: [{ ...EMPTY_LINE, description: '', hsnSac: '90118000', qty: 1, unit: 'Pcs.', price: 0 }],
  gstRate: 18,
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  bankBranch: '',
  bankUpiId: '',
  bankQrUrl: '',
  termsAndConditions:
    'E. & O.E.\nGoods once sold will not be taken back.\nInterest @18% p.a. will be charged if the payment is not made within due date.\nSubject to Ambala jurisdiction.',
  amountInWords: '',
  issuerSignatureUrl: '',
  issuerStampUrl: '',
  issuerDigitalSignatureUrl: '',
};

type SigSlot = 'signature' | 'stamp' | 'digitalSignature';

const SIG_SLOTS: { key: SigSlot; label: string; help: string }[] = [
  { key: 'signature', label: 'Signature image', help: 'Scanned or photo of wet signature' },
  { key: 'stamp', label: 'Stamp image', help: 'Company stamp' },
  { key: 'digitalSignature', label: 'Digital signature', help: 'e.g. .png from DSC or signing app' },
];

function splitLines(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function formatLeadPickSummary(lead: Pick<Lead, 'name' | 'phone' | 'gstNumber' | 'company'>) {
  const bits = [lead.name];
  if (lead.phone?.trim()) bits.push(lead.phone.trim());
  if (lead.gstNumber?.trim()) bits.push(`GST ${lead.gstNumber.trim()}`);
  if (lead.company?.trim()) bits.push(`· ${lead.company.trim()}`);
  return bits.join(' · ');
}

function effectiveGstRate(inv: Pick<TaxInvoice, 'gstRate' | 'igstRate'>) {
  return inv.gstRate ?? inv.igstRate ?? 18;
}

/** Normalize stored removal date for <input type="date"> (YYYY-MM-DD) */
function dateRemovalToInput(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    const mo = String(parseInt(m[2], 10)).padStart(2, '0');
    const d = String(parseInt(m[1], 10)).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return '';
}

function kindLabel(kind: string | undefined) {
  return DOCUMENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Tax invoice';
}

function invoiceToForm(inv: TaxInvoice): TaxInvoiceEditorForm {
  const bid = inv.bankAccountId;
  const bankIdStr = typeof bid === 'object' && bid?._id ? bid._id : (bid as string) || '';
  const sid = inv.signaturePresetId;
  const presetIdStr = typeof sid === 'object' && sid?._id ? sid._id : (sid as string) || '';
  const sameShip =
    inv.billedToName === inv.shippedToName &&
    inv.billedToAddress === inv.shippedToAddress &&
    inv.billedToGstin === inv.shippedToGstin;

  return {
    documentKind: (inv.documentKind ?? 'tax_invoice') as TaxDocumentKind,
    leadId: typeof inv.leadId === 'object' && inv.leadId?._id ? inv.leadId._id : (inv.leadId as string) || '',
    bankAccountId: bankIdStr,
    signaturePresetId: presetIdStr,
    shipSameAsBill: sameShip,
    sellerGstin: inv.sellerGstin,
    sellerName: inv.sellerName,
    sellerAddress: inv.sellerAddress,
    sellerPhonesText: (inv.sellerPhones ?? []).join('\n'),
    sellerEmailsText: (inv.sellerEmails ?? []).join('\n'),
    copyLabel: inv.copyLabel,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate?.slice(0, 10) ?? DEFAULT_FORM.invoiceDate,
    placeOfSupply: inv.placeOfSupply,
    transport: inv.transport,
    vehicleNo: inv.vehicleNo,
    paymentTerms: inv.paymentTerms ?? '',
    ewayBillNo: inv.ewayBillNo,
    dateOfRemoval: dateRemovalToInput(inv.dateOfRemoval),
    freight: inv.freight,
    billedToName: inv.billedToName,
    billedToAddress: inv.billedToAddress,
    billedToGstin: inv.billedToGstin,
    shippedToName: inv.shippedToName,
    shippedToAddress: inv.shippedToAddress,
    shippedToContact: inv.shippedToContact,
    shippedToGstin: inv.shippedToGstin,
    contractNo: inv.contractNo,
    remarks: inv.remarks ?? '',
    items: inv.items?.length ? inv.items.map((i) => ({ ...i })) : [{ ...EMPTY_LINE }],
    gstRate: effectiveGstRate(inv),
    bankName: inv.bankName,
    bankAccountNo: inv.bankAccountNo,
    bankIfsc: inv.bankIfsc,
    bankBranch: inv.bankBranch,
    bankUpiId: inv.bankUpiId ?? '',
    bankQrUrl: inv.bankQrUrl ?? '',
    termsAndConditions: inv.termsAndConditions,
    amountInWords: inv.amountInWords ?? '',
    issuerSignatureUrl: inv.issuerSignatureUrl ?? '',
    issuerStampUrl: inv.issuerStampUrl ?? '',
    issuerDigitalSignatureUrl: inv.issuerDigitalSignatureUrl ?? '',
  };
}

function formToPayload(
  f: TaxInvoiceEditorForm,
  opts?: { clearLeadIfEmpty?: boolean; omitInvoiceNo?: boolean }
): Record<string, unknown> {
  const leadPayload =
    opts?.clearLeadIfEmpty ? (f.leadId.trim() ? f.leadId.trim() : null) : f.leadId.trim() || undefined;
  const bankPayload = opts?.clearLeadIfEmpty
    ? f.bankAccountId.trim()
      ? f.bankAccountId.trim()
      : null
    : f.bankAccountId.trim() || undefined;
  const signaturePresetPayload = opts?.clearLeadIfEmpty
    ? f.signaturePresetId.trim()
      ? f.signaturePresetId.trim()
      : null
    : f.signaturePresetId.trim() || undefined;
  return {
    documentKind: f.documentKind,
    leadId: leadPayload,
    bankAccountId: bankPayload,
    signaturePresetId: signaturePresetPayload,
    sellerGstin: f.sellerGstin,
    sellerName: f.sellerName,
    sellerAddress: f.sellerAddress,
    sellerPhones: splitLines(f.sellerPhonesText),
    sellerEmails: splitLines(f.sellerEmailsText),
    copyLabel: f.copyLabel,
    ...(opts?.omitInvoiceNo ? {} : { invoiceNo: f.invoiceNo.trim() }),
    invoiceDate: f.invoiceDate,
    placeOfSupply: f.placeOfSupply,
    transport: f.transport,
    vehicleNo: f.vehicleNo,
    paymentTerms: f.paymentTerms,
    ewayBillNo: f.ewayBillNo,
    dateOfRemoval: f.dateOfRemoval,
    freight: f.freight,
    billedToName: f.billedToName,
    billedToAddress: f.billedToAddress,
    billedToGstin: f.billedToGstin,
    shippedToName: f.shippedToName,
    shippedToAddress: f.shippedToAddress,
    shippedToContact: f.shippedToContact,
    shippedToGstin: f.shippedToGstin,
    contractNo: f.contractNo,
    remarks: f.remarks,
    items: f.items.map((i) => ({
      description: i.description,
      hsnSac: i.hsnSac,
      qty: lineNumericValue(i.qty),
      unit: i.unit || 'Pcs.',
      price: lineNumericValue(i.price),
      amount: i.amount,
    })),
    gstRate: Number(f.gstRate) || 0,
    bankName: f.bankName,
    bankAccountNo: f.bankAccountNo,
    bankIfsc: f.bankIfsc,
    bankBranch: f.bankBranch,
    bankUpiId: f.bankUpiId,
    bankQrUrl: f.bankQrUrl,
    termsAndConditions: f.termsAndConditions,
    amountInWords: f.amountInWords.trim() || undefined,
    issuerStampUrl: f.issuerStampUrl.trim(),
    issuerSignatureUrl: f.issuerSignatureUrl.trim(),
    issuerDigitalSignatureUrl: f.issuerDigitalSignatureUrl.trim(),
  };
}

function formatMoney(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TaxInvoiceManagement() {
  const { data: auth } = useCurrentUser();
  const isAdmin = auth?.user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [banksModalOpen, setBanksModalOpen] = useState(false);
  const [signaturesModalOpen, setSignaturesModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useTaxInvoicesList({
    search: searchQuery || undefined,
    page,
    limit: 15,
  });

  const createMut = useCreateTaxInvoice();
  const updateMut = useUpdateTaxInvoice();
  const deleteMut = useDeleteTaxInvoice();

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = [
    {
      key: 'kind',
      label: 'Type',
      render: (r: TaxInvoice) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {kindLabel(r.documentKind)}
        </span>
      ),
    },
    { key: 'invoiceNo', label: 'Doc #', render: (r: TaxInvoice) => <span className="font-medium">{r.invoiceNo}</span> },
    {
      key: 'date',
      label: 'Date',
      render: (r: TaxInvoice) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '—'),
    },
    {
      key: 'lead',
      label: 'Lead',
      render: (r: TaxInvoice) => {
        const l = r.leadId;
        if (l && typeof l === 'object' && l !== null && 'name' in l) {
          const name = (l as { name?: string }).name?.trim();
          if (name) return <span className="text-slate-800">{name}</span>;
        }
        return <span className="text-slate-400">—</span>;
      },
    },
    { key: 'billedTo', label: 'Billed to', render: (r: TaxInvoice) => r.billedToName || '—' },
    {
      key: 'total',
      label: 'Grand total',
      render: (r: TaxInvoice) => <span className="font-mono text-sm">₹ {formatMoney(r.grandTotal ?? 0)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r: TaxInvoice) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="text-indigo-600 hover:text-indigo-800" onClick={() => setPreviewId(r._id)}>
            <FiEye className="mr-0.5 inline size-4" aria-hidden />
            Preview
          </button>
          <button
            type="button"
            className="text-slate-700 hover:text-slate-900"
            disabled={pdfLoadingId === r._id}
            onClick={async () => {
              setPdfLoadingId(r._id);
              try {
                const { blob, filename } = await downloadTaxInvoicePdfApi(r._id);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                alert((e as Error).message);
              } finally {
                setPdfLoadingId(null);
              }
            }}
          >
            <FiDownload className="mr-0.5 inline size-4" aria-hidden />
            PDF
          </button>
          <button type="button" className="text-indigo-600 hover:text-indigo-800" onClick={() => { setEditingId(r._id); setEditorOpen(true); }}>
            <FiEdit2 className="mr-0.5 inline size-4" aria-hidden />
            Edit
          </button>
          {isAdmin && (
            <button type="button" className="text-red-600 hover:text-red-800" onClick={() => { if (confirm('Delete this invoice?')) void deleteMut.mutateAsync(r._id); }}>
              <FiTrash2 className="inline size-4" aria-hidden />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tax invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create GST-style tax invoices, preview, and download PDF. Email / WhatsApp sharing can be added later.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setBanksModalOpen(true)}>
            Manage banks
          </Button>
          <Button variant="outline" onClick={() => setSignaturesModalOpen(true)}>
            Manage signatures
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setEditorOpen(true);
            }}
          >
            <FiPlus className="mr-1.5 inline size-4" aria-hidden />
            New document
          </Button>
        </div>
      </div>

      <Card>
        {isError ? (
          <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
        ) : (
          <DataTable<TaxInvoice>
            columns={columns}
            data={invoices}
            rowKey={(r) => r._id}
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search invoice #, party, contract…',
              onSearchSubmit: () => {
                setSearchQuery(searchInput);
                setPage(1);
              },
            }}
            pagination={
              pagination
                ? {
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    limit: pagination.limit,
                    onPageChange: setPage,
                  }
                : undefined
            }
            isLoading={isLoading}
            emptyMessage="No invoices yet. Create one to match your printed tax invoice layout."
          />
        )}
      </Card>

      {editorOpen && (
        <InvoiceEditorModal
          invoiceId={editingId}
          onClose={() => {
            setEditorOpen(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setEditorOpen(false);
            setEditingId(null);
          }}
          createMut={createMut}
          updateMut={updateMut}
        />
      )}

      {banksModalOpen && (
        <BanksManageModal isAdmin={isAdmin} onClose={() => setBanksModalOpen(false)} />
      )}

      {signaturesModalOpen && (
        <SignaturesManageModal isAdmin={isAdmin} onClose={() => setSignaturesModalOpen(false)} />
      )}

      {previewId && (
        <PreviewModal
          id={previewId}
          onClose={() => setPreviewId(null)}
          onDownloadPdf={async () => {
            setPdfLoadingId(previewId);
            try {
              const { blob, filename } = await downloadTaxInvoicePdfApi(previewId);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setPdfLoadingId(null);
            }
          }}
          pdfLoading={pdfLoadingId === previewId}
        />
      )}
    </div>
  );
}

function PreviewModal({
  id,
  onClose,
  onDownloadPdf,
  pdfLoading,
}: {
  id: string;
  onClose: () => void;
  onDownloadPdf: () => Promise<void>;
  pdfLoading: boolean;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setErr(null);
    void getTaxInvoicePreviewApi(id)
      .then((r) => {
        if (!cancelled) setHtml(r.html);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-800">Invoice preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void onDownloadPdf()} loading={pdfLoading} disabled={!html}>
              <FiDownload className="mr-1.5 inline size-4" aria-hidden />
              Download PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          {err && <p className="text-center text-red-600">{err}</p>}
          {!err && !html && <p className="text-center text-slate-500">Loading preview…</p>}
          {html && (
            <iframe title="Invoice preview" className="h-[75vh] w-full rounded border border-slate-200 bg-white" srcDoc={html} />
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceEditorModal({
  invoiceId,
  onClose,
  onSaved,
  createMut,
  updateMut,
}: {
  invoiceId: string | null;
  onClose: () => void;
  onSaved: () => void;
  createMut: ReturnType<typeof useCreateTaxInvoice>;
  updateMut: ReturnType<typeof useUpdateTaxInvoice>;
}) {
  const qc = useQueryClient();
  const { data: existing, isLoading: loadingExisting } = useTaxInvoice(invoiceId);
  const [leadQuery, setLeadQuery] = useState('');
  const [leadMenuOpen, setLeadMenuOpen] = useState(false);
  const leadComboRef = useRef<HTMLDivElement>(null);
  const debouncedLeadSearch = useDebouncedValue(leadQuery.trim(), 320);
  const { data: leadsData, isFetching: leadsFetching } = useLeadsList({
    search: debouncedLeadSearch || undefined,
    limit: 50,
    page: 1,
  });
  const leadSearchResults = leadsData?.data ?? [];
  const { data: banksRes } = useBankAccounts();
  const banks = banksRes?.data ?? [];
  const { data: sigPresetsRes } = useSignaturePresets();
  const signaturePresets = sigPresetsRes?.data ?? [];

  const [f, setF] = useState<TaxInvoiceEditorForm>(() => ({ ...DEFAULT_FORM }));

  const [lineDescFocusRow, setLineDescFocusRow] = useState<number | null>(null);
  const lineDescBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineDescTextareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [lineSuggestPopoverRect, setLineSuggestPopoverRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const [sigFiles, setSigFiles] = useState<Record<SigSlot, File | null>>({
    signature: null,
    stamp: null,
    digitalSignature: null,
  });
  const [sigRemove, setSigRemove] = useState<Record<SigSlot, boolean>>({
    signature: false,
    stamp: false,
    digitalSignature: false,
  });
  const [sigPreviewUrls, setSigPreviewUrls] = useState<Partial<Record<SigSlot, string>>>({});
  const [bankQrUploading, setBankQrUploading] = useState(false);

  const debouncedLineDescForSuggest = useDebouncedValue(
    lineDescFocusRow != null && f.items[lineDescFocusRow] != null ? f.items[lineDescFocusRow].description : '',
    280
  );

  const { data: lineSuggestionsRes, isFetching: lineSuggestionsLoading } = useQuery({
    queryKey: [...taxInvoicesQueryKey, 'lineItemSuggestions', debouncedLineDescForSuggest],
    queryFn: () =>
      listLineItemSuggestionsApi({
        q: debouncedLineDescForSuggest.trim() ? debouncedLineDescForSuggest : undefined,
        limit: 20,
      }),
    enabled: lineDescFocusRow !== null,
    staleTime: 20_000,
  });
  const lineSuggestions = lineSuggestionsRes?.data ?? [];

  const lineSuggestPopoverOpen =
    lineDescFocusRow !== null && (lineSuggestionsLoading || lineSuggestions.length > 0);

  useLayoutEffect(() => {
    if (!lineSuggestPopoverOpen) {
      setLineSuggestPopoverRect(null);
      return;
    }
    const row = lineDescFocusRow;
    if (row == null) {
      setLineSuggestPopoverRect(null);
      return;
    }
    const el = lineDescTextareaRefs.current[row];
    if (!el) {
      setLineSuggestPopoverRect(null);
      return;
    }

    const update = () => {
      const r = el.getBoundingClientRect();
      const gap = 6;
      const maxH = Math.min(280, Math.max(100, window.innerHeight - r.bottom - gap - 12));
      const width = Math.max(240, r.width);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setLineSuggestPopoverRect({
        top: r.bottom + gap,
        left,
        width,
        maxHeight: maxH,
      });
    };

    update();

    const scrollRoots: (Element | Window)[] = [window];
    let p: HTMLElement | null = el.parentElement;
    while (p) {
      const st = getComputedStyle(p);
      if (/(auto|scroll|overlay)/.test(st.overflowY) || /(auto|scroll|overlay)/.test(st.overflowX)) {
        scrollRoots.push(p);
      }
      p = p.parentElement;
    }

    for (const t of scrollRoots) {
      t.addEventListener('scroll', update, true);
    }
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      for (const t of scrollRoots) {
        t.removeEventListener('scroll', update, true);
      }
    };
  }, [lineSuggestPopoverOpen, lineDescFocusRow, lineSuggestionsLoading, lineSuggestions.length]);

  useEffect(() => {
    return () => {
      if (lineDescBlurTimerRef.current) clearTimeout(lineDescBlurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const urls: string[] = [];
    const next: Partial<Record<SigSlot, string>> = {};
    for (const slot of SIG_SLOTS) {
      const file = sigFiles[slot.key];
      if (file) {
        const u = URL.createObjectURL(file);
        next[slot.key] = u;
        urls.push(u);
      }
    }
    setSigPreviewUrls(next);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [sigFiles]);

  useEffect(() => {
    if (invoiceId && existing) {
      setF(invoiceToForm(existing));
      setSigFiles({ signature: null, stamp: null, digitalSignature: null });
      setSigRemove({ signature: false, stamp: false, digitalSignature: false });
      setLeadQuery('');
      setLeadMenuOpen(false);
    } else if (!invoiceId) {
      setF({
        ...DEFAULT_FORM,
        documentKind: 'tax_invoice',
        bankAccountId: '',
        signaturePresetId: '',
        shipSameAsBill: false,
        invoiceNo: '',
        items: [{ ...EMPTY_LINE, hsnSac: '90118000' }],
      });
      setSigFiles({ signature: null, stamp: null, digitalSignature: null });
      setSigRemove({ signature: false, stamp: false, digitalSignature: false });
      setLeadQuery('');
      setLeadMenuOpen(false);
    }
  }, [invoiceId, existing]);

  useEffect(() => {
    if (!leadMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = leadComboRef.current;
      if (el && !el.contains(e.target as Node)) setLeadMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [leadMenuOpen]);

  /** New documents: show next auto number per document type (server assigns on create). */
  useEffect(() => {
    if (invoiceId) return;
    let cancelled = false;
    void getNextDocumentNumberApi(f.documentKind).then((r) => {
      if (!cancelled) setF((prev) => ({ ...prev, invoiceNo: r.nextNumber }));
    });
    return () => {
      cancelled = true;
    };
  }, [invoiceId, f.documentKind]);

  const linkedLeadSummary = useMemo(() => {
    if (!f.leadId) return null;
    const fromList = leadSearchResults.find((l) => l._id === f.leadId);
    if (fromList) return formatLeadPickSummary(fromList);
    const lid = existing?.leadId;
    if (lid && typeof lid === 'object' && '_id' in lid && lid._id === f.leadId) {
      return formatLeadPickSummary(lid as Lead);
    }
    return 'Linked lead';
  }, [f.leadId, leadSearchResults, existing?.leadId]);

  const busy = createMut.isPending || updateMut.isPending;

  function setField<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function patchBilledTo(patch: Partial<Pick<typeof f, 'billedToName' | 'billedToAddress' | 'billedToGstin'>>) {
    setF((prev) => {
      const next = { ...prev, ...patch };
      if (prev.shipSameAsBill) {
        if (patch.billedToName !== undefined) next.shippedToName = patch.billedToName;
        if (patch.billedToAddress !== undefined) next.shippedToAddress = patch.billedToAddress;
        if (patch.billedToGstin !== undefined) next.shippedToGstin = patch.billedToGstin;
      }
      return next;
    });
  }

  function partyNameFromGstLookup(d: GstinLookupResponse): string {
    return d.company?.trim() || d.tradeName?.trim() || d.legalName?.trim() || '';
  }

  function applyGstLookupToBilledTo(d: GstinLookupResponse) {
    const partyName = partyNameFromGstLookup(d);
    patchBilledTo({
      billedToGstin: d.gstin,
      ...(partyName ? { billedToName: partyName } : {}),
      ...(d.address?.trim() ? { billedToAddress: d.address.trim() } : {}),
    });
  }

  function applyGstLookupToShippedTo(d: GstinLookupResponse) {
    const partyName = partyNameFromGstLookup(d);
    setF((prev) => ({
      ...prev,
      shippedToGstin: d.gstin,
      ...(partyName ? { shippedToName: partyName } : {}),
      ...(d.address?.trim() ? { shippedToAddress: d.address.trim() } : {}),
    }));
  }

  function applyLead(lead: Lead) {
    const addr = [lead.company, lead.address].filter(Boolean).join('\n');
    setF((prev) => {
      const billedToName = lead.name;
      const billedToAddress = addr || prev.billedToAddress;
      const billedToGstin = lead.gstNumber ?? prev.billedToGstin;
      const base = {
        ...prev,
        leadId: lead._id,
        billedToName,
        billedToAddress,
        billedToGstin,
        shippedToContact: lead.phone ?? prev.shippedToContact,
      };
      if (prev.shipSameAsBill) {
        return {
          ...base,
          shippedToName: billedToName,
          shippedToAddress: billedToAddress,
          shippedToGstin: billedToGstin,
        };
      }
      return {
        ...base,
        shippedToName: lead.name,
        shippedToAddress: addr || prev.shippedToAddress,
        shippedToGstin: lead.gstNumber ?? prev.shippedToGstin,
      };
    });
  }

  function updateItem(index: number, patch: Partial<InvoiceLineFormRow>) {
    setF((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function cancelLineDescBlur() {
    if (lineDescBlurTimerRef.current) {
      clearTimeout(lineDescBlurTimerRef.current);
      lineDescBlurTimerRef.current = null;
    }
  }

  function handleLineDescFocus(rowIndex: number) {
    cancelLineDescBlur();
    setLineDescFocusRow(rowIndex);
  }

  function handleLineDescBlur() {
    if (lineDescBlurTimerRef.current) clearTimeout(lineDescBlurTimerRef.current);
    lineDescBlurTimerRef.current = setTimeout(() => {
      setLineDescFocusRow(null);
      lineDescBlurTimerRef.current = null;
    }, 200);
  }

  function applyLineItemSuggestion(rowIndex: number, s: TaxInvoiceLineItemSuggestion) {
    cancelLineDescBlur();
    const u = s.unit?.trim() ? s.unit.trim() : 'Pcs.';
    updateItem(rowIndex, {
      description: s.description,
      hsnSac: s.hsnSac ?? '',
      unit: u,
      price: Number(s.price) || 0,
    });
    setLineDescFocusRow(null);
  }

  function addRow() {
    setF((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_LINE }] }));
  }

  function removeRow(i: number) {
    setLineDescFocusRow((cur) => {
      if (cur === null) return null;
      if (cur === i) return null;
      if (cur > i) return cur - 1;
      return cur;
    });
    setF((prev) => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter((_, j) => j !== i) : prev.items }));
  }

  const previewTotals = useMemo(() => {
    let taxable = 0;
    let qty = 0;
    for (const it of f.items) {
      const line = it.amount != null ? it.amount : lineNumericValue(it.qty) * lineNumericValue(it.price);
      taxable += line;
      qty += lineNumericValue(it.qty);
    }
    taxable = Math.round(taxable * 100) / 100;
    const gst = Math.round((taxable * (Number(f.gstRate) || 0)) / 100 * 100) / 100;
    const grand = Math.round((taxable + gst) * 100) / 100;
    return { taxable, gst, grand, qty };
  }, [f.items, f.gstRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = formToPayload(f, { clearLeadIfEmpty: !!invoiceId, omitInvoiceNo: !invoiceId });
    if (invoiceId && !String((payload.invoiceNo as string) ?? '').trim()) {
      alert('Document number is missing');
      return;
    }
    const sigClears: Record<string, string> = {};
    if (invoiceId) {
      if (sigRemove.signature) sigClears.issuerSignatureUrl = '';
      if (sigRemove.stamp) sigClears.issuerStampUrl = '';
      if (sigRemove.digitalSignature) sigClears.issuerDigitalSignatureUrl = '';
    }
    const body = { ...payload, ...sigClears };
    try {
      let targetId = invoiceId;
      if (invoiceId) {
        await updateMut.mutateAsync({ id: invoiceId, body });
      } else {
        const { leadId, bankAccountId, signaturePresetId, ...rest } = body;
        const created = await createMut.mutateAsync({
          ...rest,
          ...(leadId ? { leadId } : {}),
          ...(bankAccountId ? { bankAccountId } : {}),
          ...(signaturePresetId ? { signaturePresetId } : {}),
        });
        targetId = created._id;
      }
      const hasSigUpload =
        !!sigFiles.signature || !!sigFiles.stamp || !!sigFiles.digitalSignature;
      if (hasSigUpload && targetId) {
        await uploadInvoiceSignaturesApi(targetId, {
          signature: sigFiles.signature ?? undefined,
          stamp: sigFiles.stamp ?? undefined,
          digitalSignature: sigFiles.digitalSignature ?? undefined,
        });
        void qc.invalidateQueries({ queryKey: taxInvoicesQueryKey });
        void qc.invalidateQueries({ queryKey: [...taxInvoicesQueryKey, targetId] });
      }
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function issuerUrlField(slot: SigSlot): keyof typeof f {
    if (slot === 'signature') return 'issuerSignatureUrl';
    if (slot === 'stamp') return 'issuerStampUrl';
    return 'issuerDigitalSignatureUrl';
  }

  function displaySrc(slot: SigSlot): string | null {
    if (sigPreviewUrls[slot]) return sigPreviewUrls[slot]!;
    if (sigRemove[slot]) return null;
    const u = String(f[issuerUrlField(slot)] ?? '').trim();
    return u || null;
  }

  if (invoiceId && loadingExisting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
        <div className="rounded-lg bg-white p-8" onClick={(e) => e.stopPropagation()}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {invoiceId ? `Edit ${kindLabel(f.documentKind).toLowerCase()}` : 'New document'}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Seller (your company)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="GSTIN" value={f.sellerGstin} onChange={(e) => setField('sellerGstin', e.target.value)} disabled={busy} />
              <Input label="Copy label" value={f.copyLabel} onChange={(e) => setField('copyLabel', e.target.value)} disabled={busy} />
              <div className="sm:col-span-2">
                <Input label="Legal name" value={f.sellerName} onChange={(e) => setField('sellerName', e.target.value)} disabled={busy} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  value={f.sellerAddress}
                  onChange={(e) => setField('sellerAddress', e.target.value)}
                  disabled={busy}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phones (one per line)</label>
                <textarea
                  value={f.sellerPhonesText}
                  onChange={(e) => setField('sellerPhonesText', e.target.value)}
                  disabled={busy}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Emails (one per line)</label>
                <textarea
                  value={f.sellerEmailsText}
                  onChange={(e) => setField('sellerEmailsText', e.target.value)}
                  disabled={busy}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Optional: link a lead</h3>
            <p className="mb-3 max-w-xl text-xs text-slate-500">
              Search by <strong className="font-medium text-slate-600">name</strong>,{' '}
              <strong className="font-medium text-slate-600">phone</strong>, or{' '}
              <strong className="font-medium text-slate-600">GSTIN</strong>, then pick a row to fill bill-to / ship-to from that lead.
            </p>
            <div ref={leadComboRef} className="relative max-w-xl">
              {f.leadId ? (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">
                  <span className="min-w-0 flex-1 font-medium">{linkedLeadSummary}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setField('leadId', '');
                      setLeadQuery('');
                      setLeadMenuOpen(false);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-300/80 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100/50 disabled:opacity-50"
                  >
                    <FiX className="size-3.5" aria-hidden />
                    Clear link
                  </button>
                </div>
              ) : null}
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  autoComplete="off"
                  value={leadQuery}
                  onChange={(e) => {
                    setLeadQuery(e.target.value);
                    setLeadMenuOpen(true);
                  }}
                  onFocus={() => setLeadMenuOpen(true)}
                  disabled={busy}
                  placeholder="Type to search leads…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-slate-50"
                />
              </div>
              {leadMenuOpen && (
                <ul
                  className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-200/60"
                  role="listbox"
                >
                  {leadsFetching && leadSearchResults.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-slate-500">Searching…</li>
                  ) : null}
                  {!leadsFetching && leadSearchResults.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-slate-500">
                      {debouncedLeadSearch.trim()
                        ? 'No leads match that search.'
                        : 'No leads yet, or type a name, phone, or GSTIN to search.'}
                    </li>
                  ) : null}
                  {leadSearchResults.map((l) => (
                    <li key={l._id} role="option">
                      <button
                        type="button"
                        disabled={busy}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          applyLead(l);
                          setLeadQuery('');
                          setLeadMenuOpen(false);
                        }}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-indigo-50 disabled:opacity-50"
                      >
                        <span className="font-medium text-slate-900">{l.name}</span>
                        <span className="text-xs text-slate-600">
                          {[l.phone, l.gstNumber, l.company].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">Document type</label>
            <p className="mb-2 text-xs text-slate-500">Same layout; only the title on the PDF changes (Tax invoice / Proforma / Quotation).</p>
            <select
              value={f.documentKind}
              onChange={(e) => setField('documentKind', e.target.value as TaxDocumentKind)}
              disabled={busy}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {DOCUMENT_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            <h3 className="sm:col-span-2 text-sm font-semibold text-slate-700">Document details</h3>
            <div className="max-w-xl">
              <Input
                label="Document / invoice no. (auto)"
                value={f.invoiceNo}
                readOnly
                onChange={() => {}}
                className="cursor-default bg-slate-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                {invoiceId
                  ? 'This number cannot be changed.'
                  : 'Format: company prefix / type code / running number (e.g. QSMW/TI/01, QSMW/PF/01). Updates when you change document type; the server sets the final value when you create.'}
              </p>
            </div>
            <Input label="Invoice date" type="date" value={f.invoiceDate} onChange={(e) => setField('invoiceDate', e.target.value)} disabled={busy} />
            <Input label="Place of supply" value={f.placeOfSupply} onChange={(e) => setField('placeOfSupply', e.target.value)} disabled={busy} placeholder="e.g. Tamilnadu (33)" />
            <Input label="Transport" value={f.transport} onChange={(e) => setField('transport', e.target.value)} disabled={busy} />
            <Input label="Vehicle no." value={f.vehicleNo} onChange={(e) => setField('vehicleNo', e.target.value)} disabled={busy} />
            <Input label="Payment terms" value={f.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)} disabled={busy} placeholder="e.g. Net 30, Advance" />
            <Input label="E-Way bill no." value={f.ewayBillNo} onChange={(e) => setField('ewayBillNo', e.target.value)} disabled={busy} />
            <Input label="Date of removal" type="date" value={f.dateOfRemoval} onChange={(e) => setField('dateOfRemoval', e.target.value)} disabled={busy} />
            <Input label="Freight" value={f.freight} onChange={(e) => setField('freight', e.target.value)} disabled={busy} placeholder="e.g. PAID" />
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            <h3 className="sm:col-span-2 text-sm font-semibold text-slate-700">Billed to / Shipped to</h3>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={f.shipSameAsBill}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setF((prev) => {
                      if (checked) {
                        return {
                          ...prev,
                          shipSameAsBill: true,
                          shippedToName: prev.billedToName,
                          shippedToAddress: prev.billedToAddress,
                          shippedToGstin: prev.billedToGstin,
                        };
                      }
                      return { ...prev, shipSameAsBill: false };
                    });
                  }}
                  disabled={busy}
                  className="rounded border-slate-300"
                />
                Ship-to same as bill-to (GSTIN, name, address)
              </label>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-600">
                GSTIN first — use look up to pull legal name and address (same as leads), or type manually below.
              </p>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">GSTIN / UIN</label>
                  <input
                    value={f.billedToGstin}
                    onChange={(e) => patchBilledTo({ billedToGstin: e.target.value })}
                    disabled={busy}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    placeholder="e.g. 06AAAFQ0374K1ZA"
                  />
                </div>
                <GstinLookupButton
                  gstin={f.billedToGstin}
                  disabled={busy}
                  fullWidthOnMobile
                  onSuccess={applyGstLookupToBilledTo}
                />
              </div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Billed to — name</label>
              <input
                value={f.billedToName}
                onChange={(e) => patchBilledTo({ billedToName: e.target.value })}
                disabled={busy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="mb-1 mt-2 block text-sm font-medium text-slate-700">Address</label>
              <textarea
                value={f.billedToAddress}
                onChange={(e) => patchBilledTo({ billedToAddress: e.target.value })}
                disabled={busy}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-600">
                {f.shipSameAsBill
                  ? 'Ship-to matches bill-to (GST, name, address). Uncheck above to edit ship-to separately.'
                  : 'GSTIN first — look up to fill name and address, or type manually.'}
              </p>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">GSTIN / UIN</label>
                  <input
                    value={f.shippedToGstin}
                    onChange={(e) => setField('shippedToGstin', e.target.value)}
                    disabled={busy || f.shipSameAsBill}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50"
                    placeholder="e.g. 06AAAFQ0374K1ZA"
                  />
                </div>
                <GstinLookupButton
                  gstin={f.shippedToGstin}
                  disabled={busy || f.shipSameAsBill}
                  fullWidthOnMobile
                  onSuccess={applyGstLookupToShippedTo}
                />
              </div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Shipped to — name</label>
              <input
                value={f.shippedToName}
                onChange={(e) => setField('shippedToName', e.target.value)}
                disabled={busy || f.shipSameAsBill}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              <label className="mb-1 mt-2 block text-sm font-medium text-slate-700">Address</label>
              <textarea
                value={f.shippedToAddress}
                onChange={(e) => setField('shippedToAddress', e.target.value)}
                disabled={busy || f.shipSameAsBill}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              <Input label="Contact" value={f.shippedToContact} onChange={(e) => setField('shippedToContact', e.target.value)} disabled={busy} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Contract / reference no." value={f.contractNo} onChange={(e) => setField('contractNo', e.target.value)} disabled={busy} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Remarks" value={f.remarks} onChange={(e) => setField('remarks', e.target.value)} disabled={busy} />
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Line items</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Focus description for suggestions from past invoices (fills HSN, unit, price when you pick one).
                </p>
              </div>
              <Button type="button" variant="outline" className="py-1.5 text-xs" onClick={addRow} disabled={busy}>
                Add row
              </Button>
            </div>
            <div className="space-y-3 overflow-x-auto">
              {f.items.map((row, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="text-xs text-slate-500">Description</label>
                    <textarea
                      ref={(el) => {
                        lineDescTextareaRefs.current[i] = el;
                      }}
                      value={row.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      onFocus={() => handleLineDescFocus(i)}
                      onBlur={handleLineDescBlur}
                      disabled={busy}
                      rows={2}
                      autoComplete="off"
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500">HSN/SAC</label>
                    <input
                      value={row.hsnSac}
                      onChange={(e) => updateItem(i, { hsnSac: e.target.value })}
                      disabled={busy}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs text-slate-500">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={row.qty === '' ? '' : row.qty}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') updateItem(i, { qty: '' });
                        else {
                          const n = Number(v);
                          if (!Number.isNaN(n)) updateItem(i, { qty: n });
                        }
                      }}
                      onBlur={() => {
                        if (row.qty === '') updateItem(i, { qty: 0 });
                      }}
                      disabled={busy}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs text-slate-500">Unit</label>
                    <input
                      value={row.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      disabled={busy}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500">Price</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={row.price === '' ? '' : row.price}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') updateItem(i, { price: '' });
                        else {
                          const n = Number(v);
                          if (!Number.isNaN(n)) updateItem(i, { price: n });
                        }
                      }}
                      onBlur={() => {
                        if (row.price === '') updateItem(i, { price: 0 });
                      }}
                      disabled={busy}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2">
                    <button type="button" onClick={() => removeRow(i)} className="text-sm text-red-600 hover:underline" disabled={busy}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>Taxable: <strong className="text-slate-800">₹ {formatMoney(previewTotals.taxable)}</strong></span>
              <span>GST ({f.gstRate}%): <strong className="text-slate-800">₹ {formatMoney(previewTotals.gst)}</strong></span>
              <span>Grand: <strong className="text-slate-900">₹ {formatMoney(previewTotals.grand)}</strong></span>
            </div>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            <Input
              label="GST %"
              type="number"
              step="any"
              value={String(f.gstRate)}
              onChange={(e) => setField('gstRate', Number(e.target.value) || 0)}
              disabled={busy}
            />
            <div className="sm:col-span-2">
              <Input
                label="Amount in words (optional — auto if empty)"
                value={f.amountInWords}
                onChange={(e) => setField('amountInWords', e.target.value)}
                disabled={busy}
                placeholder="Rupees … Only"
              />
            </div>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            <h3 className="sm:col-span-2 text-sm font-semibold text-slate-700">Bank details</h3>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Select saved bank</label>
              <p className="mb-2 text-xs text-slate-500">Choose a pre-saved account (use &quot;Manage banks&quot; on the list page to add more), or enter details manually below.</p>
              <select
                value={f.bankAccountId}
                onChange={(e) => {
                  const id = e.target.value;
                  const b = banks.find((x) => x._id === id);
                  setF((prev) => ({
                    ...prev,
                    bankAccountId: id,
                    bankName: b?.bankName ?? prev.bankName,
                    bankAccountNo: b?.accountNo ?? prev.bankAccountNo,
                    bankIfsc: b?.ifsc ?? prev.bankIfsc,
                    bankBranch: b?.branch ?? prev.bankBranch,
                    bankUpiId: b?.upiId ?? prev.bankUpiId,
                    bankQrUrl: b?.qrUrl ?? prev.bankQrUrl,
                  }));
                }}
                disabled={busy}
                className="w-full max-w-lg rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Enter manually below —</option>
                {banks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.label} — {b.bankName}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Bank name" value={f.bankName} onChange={(e) => setField('bankName', e.target.value)} disabled={busy} />
            <Input label="Account no." value={f.bankAccountNo} onChange={(e) => setField('bankAccountNo', e.target.value)} disabled={busy} />
            <Input label="IFSC" value={f.bankIfsc} onChange={(e) => setField('bankIfsc', e.target.value)} disabled={busy} />
            <Input label="Branch" value={f.bankBranch} onChange={(e) => setField('bankBranch', e.target.value)} disabled={busy} />
            <Input
              label="UPI ID"
              value={f.bankUpiId}
              onChange={(e) => setField('bankUpiId', e.target.value)}
              disabled={busy}
              placeholder="e.g. merchant@paytm"
            />
            <div className="sm:col-span-2 space-y-2">
              <Input
                label="UPI QR image URL"
                value={f.bankQrUrl}
                onChange={(e) => setField('bankQrUrl', e.target.value)}
                disabled={busy}
                placeholder="https://… or upload below"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Or upload QR image</label>
                <p className="mb-2 text-xs text-slate-500">PNG / JPG / WebP. Stored on ImageKit when configured.</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  disabled={busy || bankQrUploading}
                  className="w-full max-w-md text-sm file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-indigo-700"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (!file) return;
                    setBankQrUploading(true);
                    try {
                      const { url } = await uploadBankQrImageApi(file);
                      setField('bankQrUrl', url);
                    } catch (err) {
                      alert((err as Error).message);
                    } finally {
                      setBankQrUploading(false);
                    }
                  }}
                />
                {bankQrUploading ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
              </div>
              {f.bankQrUrl.trim() && /^https?:\/\//i.test(f.bankQrUrl.trim()) ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <img
                    src={f.bankQrUrl.trim()}
                    alt="UPI QR preview"
                    className="h-24 w-24 rounded border border-slate-200 bg-white object-contain p-1"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => setField('bankQrUrl', '')}
                  >
                    Remove QR image
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Signatory images (optional)</h3>
            <p className="mb-4 text-xs text-slate-500">
              Choose a saved set from <strong>Manage signatures</strong> (like banks), or upload images for this document only. The PDF shows your
              stamp/signature above <strong>Authorised Signatory</strong> — no empty dashed box.
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Select saved signature set</label>
              <select
                value={f.signaturePresetId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setF((prev) => ({ ...prev, signaturePresetId: '' }));
                    return;
                  }
                  const p = signaturePresets.find((x) => String(x._id) === id);
                  setF((prev) =>
                    p
                      ? {
                          ...prev,
                          signaturePresetId: id,
                          issuerStampUrl: String(p.issuerStampUrl ?? ''),
                          issuerSignatureUrl: String(p.issuerSignatureUrl ?? ''),
                          issuerDigitalSignatureUrl: String(p.issuerDigitalSignatureUrl ?? ''),
                        }
                      : { ...prev, signaturePresetId: id }
                  );
                }}
                disabled={busy}
                className="w-full max-w-lg rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— None / enter manually below —</option>
                {signaturePresets.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mb-3 text-xs text-slate-500">Override per document (optional):</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {SIG_SLOTS.map(({ key, label, help }) => (
                <div key={key} className="rounded-md border border-slate-200 bg-white p-3">
                  <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
                  <p className="mb-2 text-[11px] text-slate-500">{help}</p>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-indigo-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSigFiles((prev) => ({ ...prev, [key]: file }));
                      setSigRemove((prev) => ({ ...prev, [key]: false }));
                      e.target.value = '';
                    }}
                  />
                  {displaySrc(key) && (
                    <div className="mt-2">
                      <img
                        src={displaySrc(key)!}
                        alt=""
                        className="max-h-20 max-w-full rounded border border-slate-100 object-contain"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        className="mt-1 text-xs text-red-600 hover:underline"
                        onClick={() => {
                          setSigFiles((prev) => ({ ...prev, [key]: null }));
                          if (invoiceId && String(f[issuerUrlField(key)] ?? '').trim()) {
                            setSigRemove((prev) => ({ ...prev, [key]: true }));
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">Terms & conditions</label>
            <textarea
              value={f.termsAndConditions}
              onChange={(e) => setField('termsAndConditions', e.target.value)}
              disabled={busy}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </section>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {invoiceId ? 'Save changes' : 'Create document'}
            </Button>
          </div>
        </form>
        {lineSuggestPopoverOpen &&
          lineSuggestPopoverRect != null &&
          lineDescFocusRow !== null &&
          createPortal(
            <div
              role="listbox"
              aria-label="Line item suggestions from past invoices"
              className="fixed z-[200] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-left shadow-xl ring-1 ring-black/5"
              style={{
                top: lineSuggestPopoverRect.top,
                left: lineSuggestPopoverRect.left,
                width: lineSuggestPopoverRect.width,
                maxHeight: lineSuggestPopoverRect.maxHeight,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {lineSuggestionsLoading && (
                <div className="px-3 py-2 text-xs text-slate-500">Loading suggestions…</div>
              )}
              {!lineSuggestionsLoading &&
                lineSuggestions.map((s, si) => (
                  <button
                    key={`${si}-${s.description.slice(0, 40)}`}
                    type="button"
                    role="option"
                    className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-indigo-50"
                    onMouseDown={() => applyLineItemSuggestion(lineDescFocusRow, s)}
                  >
                    <span className="text-sm font-medium text-slate-800">{s.description}</span>
                    <span className="text-xs text-slate-500">
                      HSN {s.hsnSac || '—'} · {s.unit || 'Pcs.'} · ₹
                      {Number(s.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}

function BanksManageModal({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { data, isLoading } = useBankAccounts({ includeInactive: true });
  const createMut = useCreateBankAccount();
  const updateMut = useUpdateBankAccount();
  const deleteMut = useDeleteBankAccount();

  /** When set, the bottom form is in “update” mode and fields are filled from that bank. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [formQrUploading, setFormQrUploading] = useState(false);
  const [rowQrUploadingId, setRowQrUploadingId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const saving = createMut.isPending || updateMut.isPending;
  const formDisabled = saving || formQrUploading;

  function resetToAddMode() {
    setEditingId(null);
    setLabel('');
    setBankName('');
    setAccountNo('');
    setIfsc('');
    setBranch('');
    setUpiId('');
    setQrUrl('');
  }

  /** Prefill the same fields used for “Add bank” from the saved account. */
  function startEdit(b: BankAccount) {
    setEditingId(b._id);
    setLabel(String(b.label ?? ''));
    setBankName(String(b.bankName ?? ''));
    setAccountNo(String(b.accountNo ?? ''));
    setIfsc(String(b.ifsc ?? ''));
    setBranch(String(b.branch ?? ''));
    setUpiId(String(b.upiId ?? '').trim());
    setQrUrl(String(b.qrUrl ?? '').trim());
  }

  useEffect(() => {
    if (!editingId) return;
    if (!rows.some((r) => r._id === editingId)) {
      resetToAddMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to list / edited id
  }, [rows, editingId]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !bankName.trim() || !accountNo.trim() || !ifsc.trim()) {
      alert('Label, bank name, account number and IFSC are required.');
      return;
    }
    const payload = {
      label: label.trim(),
      bankName: bankName.trim(),
      accountNo: accountNo.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      branch: branch.trim(),
      upiId: upiId.trim(),
      qrUrl: qrUrl.trim(),
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, body: payload },
        {
          onSuccess: () => resetToAddMode(),
          onError: (err: Error) => alert(err.message),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => resetToAddMode(),
        onError: (err: Error) => alert(err.message),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Saved bank accounts</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          These appear in the document editor so you can fill bank details in one click. Anyone with invoice access can add or edit; only admins can delete.
        </p>

        {isLoading ? (
          <p className="py-4 text-center text-slate-500">Loading…</p>
        ) : (
          <ul className="mb-6 max-h-[min(52vh,380px)] space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {rows.length === 0 ? (
              <li className="text-sm text-slate-500">No banks yet. Add one below.</li>
            ) : (
              rows.map((b: BankAccount) => (
                <li
                  key={b._id}
                  className={`flex items-start justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0 ${
                    editingId === b._id ? 'rounded-lg ring-2 ring-indigo-400 ring-offset-2' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{b.label}</p>
                    <p className="text-slate-600">{b.bankName}</p>
                    <p className="text-xs text-slate-500">
                      A/c {b.accountNo} · IFSC {b.ifsc}
                      {b.branch ? ` · ${b.branch}` : ''}
                      {b.upiId?.trim() ? ` · UPI ${b.upiId.trim()}` : ''}
                    </p>
                    {b.qrUrl?.trim() ? (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={b.qrUrl.trim()} alt="" className="h-14 w-14 rounded border border-slate-200 bg-white object-contain p-0.5" />
                        <span className="text-[11px] text-slate-400">QR set</span>
                      </div>
                    ) : null}
                    <div className="mt-2">
                      <label className="sr-only" htmlFor={`bank-qr-${b._id}`}>
                        Quick upload QR for {b.label}
                      </label>
                      <input
                        id={`bank-qr-${b._id}`}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        disabled={rowQrUploadingId === b._id || saving || formQrUploading}
                        className="max-w-[220px] text-[11px] file:mr-1 file:rounded file:border-0 file:bg-indigo-50 file:px-1.5 file:py-0.5 file:text-indigo-700"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.target.value = '';
                          if (!file) return;
                          setRowQrUploadingId(b._id);
                          try {
                            const { url } = await uploadBankQrImageApi(file);
                            await updateMut.mutateAsync({ id: b._id, body: { qrUrl: url } });
                          } catch (err) {
                            alert((err as Error).message);
                          } finally {
                            setRowQrUploadingId(null);
                          }
                        }}
                      />
                      {rowQrUploadingId === b._id ? (
                        <span className="ml-2 text-[11px] text-slate-500">Uploading…</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
                      title="Load into form to update"
                      onClick={() => startEdit(b)}
                      disabled={formDisabled}
                    >
                      <FiEdit2 className="size-4" aria-hidden />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete bank "${b.label}"?`)) void deleteMut.mutateAsync(b._id);
                        }}
                        disabled={deleteMut.isPending}
                      >
                        <FiTrash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">{editingId ? 'Update bank' : 'Add bank'}</p>
            {editingId ? (
              <p className="mt-1 text-xs text-slate-500">
                The fields below are filled from the account you selected (same as when adding a bank). Change anything you need, then click{' '}
                <strong>Update bank</strong>.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Fill in the details, or click the pencil on a saved account above to load it here and update.</p>
            )}
          </div>
          <Input
            label="Label (dropdown text)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. HDFC Current"
            disabled={formDisabled}
          />
          <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={formDisabled} />
          <Input label="Account number" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} disabled={formDisabled} />
          <Input label="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value)} disabled={formDisabled} />
          <Input label="Branch (optional)" value={branch} onChange={(e) => setBranch(e.target.value)} disabled={formDisabled} />
          <Input
            label="UPI ID (optional)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            disabled={formDisabled}
            placeholder="e.g. merchant@paytm"
          />
          <Input
            label="UPI QR image URL (optional)"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            disabled={formDisabled}
            placeholder="https://… or upload below"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Or upload QR image (optional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              disabled={formDisabled}
              className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-indigo-700"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = '';
                if (!file) return;
                setFormQrUploading(true);
                try {
                  const { url } = await uploadBankQrImageApi(file);
                  setQrUrl(url);
                } catch (err) {
                  alert((err as Error).message);
                } finally {
                  setFormQrUploading(false);
                }
              }}
            />
            {formQrUploading ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
            {qrUrl.trim() && /^https?:\/\//i.test(qrUrl.trim()) ? (
              <div className="mt-2 flex items-center gap-2">
                <img src={qrUrl.trim()} alt="" className="h-16 w-16 rounded border border-slate-200 object-contain bg-white p-0.5" />
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setQrUrl('')} disabled={formDisabled}>
                  Clear QR
                </button>
              </div>
            ) : null}
          </div>
          {(createMut.isError || updateMut.isError) && (
            <p className="text-sm text-red-600">
              {((editingId ? updateMut.error : createMut.error) as Error)?.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetToAddMode} disabled={saving}>
                Cancel edit
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Update bank' : 'Add bank'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SIG_PRESET_SLOTS: { slot: SignaturePresetSlot; title: string; help: string }[] = [
  { slot: 'stamp', title: 'Stamp image', help: 'Company round stamp (optional)' },
  { slot: 'signature', title: 'Signature image', help: 'Wet/scanned signature (optional)' },
  { slot: 'digitalSignature', title: 'Digital signature', help: 'DSC / signing app PNG (optional)' },
];

function SignaturesManageModal({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { data, isLoading } = useSignaturePresets({ includeInactive: true });
  const createMut = useCreateSignaturePreset();
  const updateMut = useUpdateSignaturePreset();
  const deleteMut = useDeleteSignaturePreset();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [issuerStampUrl, setIssuerStampUrl] = useState('');
  const [issuerSignatureUrl, setIssuerSignatureUrl] = useState('');
  const [issuerDigitalSignatureUrl, setIssuerDigitalSignatureUrl] = useState('');
  const [slotUploading, setSlotUploading] = useState<SignaturePresetSlot | null>(null);

  const rows = data?.data ?? [];
  const saving = createMut.isPending || updateMut.isPending;
  const formDisabled = saving || !!slotUploading;

  function resetToAddMode() {
    setEditingId(null);
    setLabel('');
    setIssuerStampUrl('');
    setIssuerSignatureUrl('');
    setIssuerDigitalSignatureUrl('');
  }

  function startEdit(p: SignaturePreset) {
    setEditingId(p._id);
    setLabel(p.label ?? '');
    setIssuerStampUrl(String(p.issuerStampUrl ?? ''));
    setIssuerSignatureUrl(String(p.issuerSignatureUrl ?? ''));
    setIssuerDigitalSignatureUrl(String(p.issuerDigitalSignatureUrl ?? ''));
  }

  useEffect(() => {
    if (!editingId) return;
    if (!rows.some((r) => r._id === editingId)) {
      resetToAddMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, editingId]);

  function setUrlForSlot(slot: SignaturePresetSlot, url: string) {
    if (slot === 'stamp') setIssuerStampUrl(url);
    else if (slot === 'signature') setIssuerSignatureUrl(url);
    else setIssuerDigitalSignatureUrl(url);
  }

  function urlForSlot(slot: SignaturePresetSlot): string {
    if (slot === 'stamp') return issuerStampUrl;
    if (slot === 'signature') return issuerSignatureUrl;
    return issuerDigitalSignatureUrl;
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      alert('Label is required.');
      return;
    }
    const body = {
      label: label.trim(),
      issuerStampUrl: issuerStampUrl.trim(),
      issuerSignatureUrl: issuerSignatureUrl.trim(),
      issuerDigitalSignatureUrl: issuerDigitalSignatureUrl.trim(),
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, body },
        {
          onSuccess: () => resetToAddMode(),
          onError: (err: Error) => alert(err.message),
        }
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => resetToAddMode(),
        onError: (err: Error) => alert(err.message),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Saved signature sets</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Use these in the document editor from the &quot;Select saved signature set&quot; dropdown. Anyone with invoice access can add or edit; only
          admins can delete.
        </p>

        {isLoading ? (
          <p className="py-4 text-center text-slate-500">Loading…</p>
        ) : (
          <ul className="mb-6 max-h-[min(40vh,280px)] space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {rows.length === 0 ? (
              <li className="text-sm text-slate-500">No presets yet. Add one below.</li>
            ) : (
              rows.map((p: SignaturePreset) => (
                <li
                  key={p._id}
                  className={`flex items-start justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0 ${
                    editingId === p._id ? 'rounded-lg ring-2 ring-indigo-400 ring-offset-2' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{p.label}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {p.issuerStampUrl?.trim() ? (
                        <img src={p.issuerStampUrl.trim()} alt="" className="h-12 w-12 rounded border border-slate-200 bg-white object-contain p-0.5" />
                      ) : null}
                      {p.issuerSignatureUrl?.trim() ? (
                        <img src={p.issuerSignatureUrl.trim()} alt="" className="h-12 w-12 rounded border border-slate-200 bg-white object-contain p-0.5" />
                      ) : null}
                      {p.issuerDigitalSignatureUrl?.trim() ? (
                        <img
                          src={p.issuerDigitalSignatureUrl.trim()}
                          alt=""
                          className="h-12 w-12 rounded border border-slate-200 bg-white object-contain p-0.5"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
                      title="Load into form to update"
                      onClick={() => startEdit(p)}
                      disabled={formDisabled}
                    >
                      <FiEdit2 className="size-4" aria-hidden />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete preset "${p.label}"?`)) void deleteMut.mutateAsync(p._id);
                        }}
                        disabled={deleteMut.isPending}
                      >
                        <FiTrash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">{editingId ? 'Update signature set' : 'Add signature set'}</p>
            {editingId ? (
              <p className="mt-1 text-xs text-slate-500">
                Fields are filled from the selected preset. At least a label is required; add images via URL or upload.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Create a named set, then pick it when editing an invoice.</p>
            )}
          </div>
          <Input label="Label (dropdown text)" value={label} onChange={(e) => setLabel(e.target.value)} disabled={formDisabled} placeholder="e.g. Default signatory" />
          {SIG_PRESET_SLOTS.map(({ slot, title, help }) => (
            <div key={slot} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-1 text-sm font-medium text-slate-800">{title}</p>
              <p className="mb-2 text-[11px] text-slate-500">{help}</p>
              <Input
                label="Image URL (optional)"
                value={urlForSlot(slot)}
                onChange={(e) => setUrlForSlot(slot, e.target.value)}
                disabled={formDisabled}
                placeholder="https://…"
              />
              <div className="mt-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Or upload</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  disabled={formDisabled}
                  className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-indigo-700"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (!file) return;
                    setSlotUploading(slot);
                    try {
                      const { url } = await uploadSignaturePresetImageApi(file, slot);
                      setUrlForSlot(slot, url);
                    } catch (err) {
                      alert((err as Error).message);
                    } finally {
                      setSlotUploading(null);
                    }
                  }}
                />
                {slotUploading === slot ? <p className="mt-1 text-[11px] text-slate-500">Uploading…</p> : null}
              </div>
              {urlForSlot(slot).trim() && /^https?:\/\//i.test(urlForSlot(slot).trim()) ? (
                <div className="mt-2 flex items-center gap-2">
                  <img src={urlForSlot(slot).trim()} alt="" className="h-14 w-14 rounded border border-slate-200 bg-white object-contain p-0.5" />
                  <button type="button" className="text-xs text-red-600 hover:underline" disabled={formDisabled} onClick={() => setUrlForSlot(slot, '')}>
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {(createMut.isError || updateMut.isError) && (
            <p className="text-sm text-red-600">{((editingId ? updateMut.error : createMut.error) as Error)?.message}</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetToAddMode} disabled={saving}>
                Cancel edit
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Update signature set' : 'Add signature set'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
