import { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  downloadTaxInvoicePdfApi,
  uploadInvoiceSignaturesApi,
  taxInvoicesQueryKey,
} from '../api/taxInvoices';
import { useLeadsList } from '../api/leads';
import { useBankAccounts, useCreateBankAccount, useDeleteBankAccount } from '../api/bankAccounts';
import { useCurrentUser } from '../api/auth';
import type { TaxInvoice, TaxInvoiceLineItem } from '../types/taxInvoice';
import type { Lead } from '../types/lead';
import type { TaxDocumentKind } from '../types/taxDocumentKind';
import { DOCUMENT_KIND_OPTIONS } from '../types/taxDocumentKind';
import type { BankAccount } from '../types/bankAccount';

const EMPTY_LINE: TaxInvoiceLineItem = {
  description: '',
  hsnSac: '',
  qty: 1,
  unit: 'Pcs.',
  price: 0,
};

const DEFAULT_FORM = {
  documentKind: 'tax_invoice' as TaxDocumentKind,
  leadId: '' as string,
  bankAccountId: '' as string,
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
  reverseCharge: 'N',
  transport: '',
  vehicleNo: '',
  station: '',
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
  items: [{ ...EMPTY_LINE, description: '', hsnSac: '90118000', qty: 1, unit: 'Pcs.', price: 0 }] as TaxInvoiceLineItem[],
  gstRate: 18,
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  bankBranch: '',
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

function kindLabel(kind: string | undefined) {
  return DOCUMENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Tax invoice';
}

function invoiceToForm(inv: TaxInvoice): typeof DEFAULT_FORM {
  const bid = inv.bankAccountId;
  const bankIdStr = typeof bid === 'object' && bid?._id ? bid._id : (bid as string) || '';
  const sameShip =
    inv.billedToName === inv.shippedToName &&
    inv.billedToAddress === inv.shippedToAddress &&
    inv.billedToGstin === inv.shippedToGstin;

  return {
    documentKind: (inv.documentKind ?? 'tax_invoice') as TaxDocumentKind,
    leadId: typeof inv.leadId === 'object' && inv.leadId?._id ? inv.leadId._id : (inv.leadId as string) || '',
    bankAccountId: bankIdStr,
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
    reverseCharge: inv.reverseCharge,
    transport: inv.transport,
    vehicleNo: inv.vehicleNo,
    station: inv.station,
    ewayBillNo: inv.ewayBillNo,
    dateOfRemoval: inv.dateOfRemoval,
    freight: inv.freight,
    billedToName: inv.billedToName,
    billedToAddress: inv.billedToAddress,
    billedToGstin: inv.billedToGstin,
    shippedToName: inv.shippedToName,
    shippedToAddress: inv.shippedToAddress,
    shippedToContact: inv.shippedToContact,
    shippedToGstin: inv.shippedToGstin,
    contractNo: inv.contractNo,
    items: inv.items?.length ? inv.items.map((i) => ({ ...i })) : [{ ...EMPTY_LINE }],
    gstRate: effectiveGstRate(inv),
    bankName: inv.bankName,
    bankAccountNo: inv.bankAccountNo,
    bankIfsc: inv.bankIfsc,
    bankBranch: inv.bankBranch,
    termsAndConditions: inv.termsAndConditions,
    amountInWords: inv.amountInWords ?? '',
    issuerSignatureUrl: inv.issuerSignatureUrl ?? '',
    issuerStampUrl: inv.issuerStampUrl ?? '',
    issuerDigitalSignatureUrl: inv.issuerDigitalSignatureUrl ?? '',
  };
}

function formToPayload(f: typeof DEFAULT_FORM, opts?: { clearLeadIfEmpty?: boolean }): Record<string, unknown> {
  const leadPayload =
    opts?.clearLeadIfEmpty ? (f.leadId.trim() ? f.leadId.trim() : null) : f.leadId.trim() || undefined;
  const bankPayload = opts?.clearLeadIfEmpty
    ? f.bankAccountId.trim()
      ? f.bankAccountId.trim()
      : null
    : f.bankAccountId.trim() || undefined;
  return {
    documentKind: f.documentKind,
    leadId: leadPayload,
    bankAccountId: bankPayload,
    sellerGstin: f.sellerGstin,
    sellerName: f.sellerName,
    sellerAddress: f.sellerAddress,
    sellerPhones: splitLines(f.sellerPhonesText),
    sellerEmails: splitLines(f.sellerEmailsText),
    copyLabel: f.copyLabel,
    invoiceNo: f.invoiceNo.trim(),
    invoiceDate: f.invoiceDate,
    placeOfSupply: f.placeOfSupply,
    reverseCharge: f.reverseCharge,
    transport: f.transport,
    vehicleNo: f.vehicleNo,
    station: f.station,
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
    items: f.items.map((i) => ({
      description: i.description,
      hsnSac: i.hsnSac,
      qty: Number(i.qty) || 0,
      unit: i.unit || 'Pcs.',
      price: Number(i.price) || 0,
      amount: i.amount,
    })),
    gstRate: Number(f.gstRate) || 0,
    bankName: f.bankName,
    bankAccountNo: f.bankAccountNo,
    bankIfsc: f.bankIfsc,
    bankBranch: f.bankBranch,
    termsAndConditions: f.termsAndConditions,
    amountInWords: f.amountInWords.trim() || undefined,
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

  const [f, setF] = useState(() => ({ ...DEFAULT_FORM }));

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

  function updateItem(index: number, patch: Partial<TaxInvoiceLineItem>) {
    setF((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addRow() {
    setF((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_LINE }] }));
  }

  function removeRow(i: number) {
    setF((prev) => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter((_, j) => j !== i) : prev.items }));
  }

  const previewTotals = useMemo(() => {
    let taxable = 0;
    let qty = 0;
    for (const it of f.items) {
      const line = it.amount != null ? it.amount : (Number(it.qty) || 0) * (Number(it.price) || 0);
      taxable += line;
      qty += Number(it.qty) || 0;
    }
    taxable = Math.round(taxable * 100) / 100;
    const gst = Math.round((taxable * (Number(f.gstRate) || 0)) / 100 * 100) / 100;
    const grand = Math.round((taxable + gst) * 100) / 100;
    return { taxable, gst, grand, qty };
  }, [f.items, f.gstRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = formToPayload(f, { clearLeadIfEmpty: !!invoiceId });
    if (!String(payload.invoiceNo).trim()) {
      alert('Invoice number is required');
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
        const { leadId, bankAccountId, ...rest } = body;
        const created = await createMut.mutateAsync({
          ...rest,
          ...(leadId ? { leadId } : {}),
          ...(bankAccountId ? { bankAccountId } : {}),
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
            <Input label="Document / invoice no. *" value={f.invoiceNo} onChange={(e) => setField('invoiceNo', e.target.value)} disabled={busy} required />
            <Input label="Invoice date" type="date" value={f.invoiceDate} onChange={(e) => setField('invoiceDate', e.target.value)} disabled={busy} />
            <Input label="Place of supply" value={f.placeOfSupply} onChange={(e) => setField('placeOfSupply', e.target.value)} disabled={busy} placeholder="e.g. Tamilnadu (33)" />
            <Input label="Reverse charge" value={f.reverseCharge} onChange={(e) => setField('reverseCharge', e.target.value)} disabled={busy} />
            <Input label="Transport" value={f.transport} onChange={(e) => setField('transport', e.target.value)} disabled={busy} />
            <Input label="Vehicle no." value={f.vehicleNo} onChange={(e) => setField('vehicleNo', e.target.value)} disabled={busy} />
            <Input label="Station" value={f.station} onChange={(e) => setField('station', e.target.value)} disabled={busy} />
            <Input label="E-Way bill no." value={f.ewayBillNo} onChange={(e) => setField('ewayBillNo', e.target.value)} disabled={busy} />
            <Input label="Date of removal" value={f.dateOfRemoval} onChange={(e) => setField('dateOfRemoval', e.target.value)} disabled={busy} placeholder="DD-MM-YYYY" />
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
                Ship-to same as bill-to (name, address, GSTIN)
              </label>
            </div>
            <div>
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
              <Input
                label="GSTIN / UIN"
                value={f.billedToGstin}
                onChange={(e) => patchBilledTo({ billedToGstin: e.target.value })}
                disabled={busy}
              />
            </div>
            <div>
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
              <Input
                label="GSTIN / UIN"
                value={f.shippedToGstin}
                onChange={(e) => setField('shippedToGstin', e.target.value)}
                disabled={busy || f.shipSameAsBill}
              />
            </div>
            <div className="sm:col-span-2">
              <Input label="Contract / reference no." value={f.contractNo} onChange={(e) => setField('contractNo', e.target.value)} disabled={busy} />
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Line items</h3>
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
                      value={row.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      disabled={busy}
                      rows={2}
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
                      value={row.qty}
                      onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
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
                      value={row.price}
                      onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
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
          </section>

          <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Signature & stamp (optional)</h3>
            <p className="mb-4 text-xs text-slate-500">
              Upload images to print above &quot;Authorised Signatory&quot; on the PDF. The customer signing box is still labelled{' '}
              <strong>Signature</strong> for manual signing. PNG or JPG recommended.
            </p>
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
      </div>
    </div>
  );
}

function BanksManageModal({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { data, isLoading } = useBankAccounts({ includeInactive: true });
  const createMut = useCreateBankAccount();
  const deleteMut = useDeleteBankAccount();
  const [label, setLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');

  const rows = data?.data ?? [];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !bankName.trim() || !accountNo.trim() || !ifsc.trim()) {
      alert('Label, bank name, account number and IFSC are required.');
      return;
    }
    createMut.mutate(
      {
        label: label.trim(),
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifsc: ifsc.trim(),
        branch: branch.trim(),
      },
      {
        onSuccess: () => {
          setLabel('');
          setBankName('');
          setAccountNo('');
          setIfsc('');
          setBranch('');
        },
        onError: (err: Error) => alert(err.message),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Saved bank accounts</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          These appear in the document editor so you can fill bank details in one click. Anyone with invoice access can add; only admins can delete.
        </p>

        {isLoading ? (
          <p className="py-4 text-center text-slate-500">Loading…</p>
        ) : (
          <ul className="mb-6 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {rows.length === 0 ? (
              <li className="text-sm text-slate-500">No banks yet. Add one below.</li>
            ) : (
              rows.map((b: BankAccount) => (
                <li key={b._id} className="flex items-start justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{b.label}</p>
                    <p className="text-slate-600">{b.bankName}</p>
                    <p className="text-xs text-slate-500">
                      A/c {b.accountNo} · IFSC {b.ifsc}
                      {b.branch ? ` · ${b.branch}` : ''}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="shrink-0 text-red-600 hover:text-red-800"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete bank "${b.label}"?`)) void deleteMut.mutateAsync(b._id);
                      }}
                      disabled={deleteMut.isPending}
                    >
                      <FiTrash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        )}

        <form onSubmit={handleAdd} className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Add bank</p>
          <Input label="Label (dropdown text)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. HDFC Current" disabled={createMut.isPending} />
          <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={createMut.isPending} />
          <Input label="Account number" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} disabled={createMut.isPending} />
          <Input label="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value)} disabled={createMut.isPending} />
          <Input label="Branch (optional)" value={branch} onChange={(e) => setBranch(e.target.value)} disabled={createMut.isPending} />
          {createMut.isError && (
            <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Add bank
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
