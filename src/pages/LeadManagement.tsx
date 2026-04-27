import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { FiList, FiGrid, FiUpload, FiDownload, FiFile, FiMessageCircle, FiEye } from 'react-icons/fi';
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/Button';
import { GstinLookupButton, type GstinLookupResponse } from '../components/GstinLookupButton';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import {
  useLeadsList,
  useLead,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useAssignableUsers,
  useBulkUploadLeads,
  useUploadLeadAttachments,
  exportLeadsApi,
} from '../api/leads';
import { useSendMessageToPhone } from '../api/messages';
import { useCurrentUser } from '../api/auth';
import {
  useTaxInvoicesByLead,
  getTaxInvoicePreviewApi,
  downloadTaxInvoicePdfApi,
} from '../api/taxInvoices';
import { useConvertLeadToCustomer } from '../api/customers';
import type { Lead, LeadStatus, LeadSource, CreateLeadPayload } from '../types/lead';
import { LEAD_STATUS_OPTIONS, LEAD_SOURCE_OPTIONS, LEAD_STATUS_STYLES } from '../types/lead';
import type { TaxInvoice } from '../types/taxInvoice';
import { DOCUMENT_KIND_OPTIONS } from '../types/taxDocumentKind';

const KANBAN_LIMIT = 500;

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const label = LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const style = LEAD_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileIsImage(f: File): boolean {
  return f.type.startsWith('image/');
}

function urlLooksLikeImage(url: string): boolean {
  const path = url.split('?')[0]?.split('#')[0] ?? '';
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);
}

/** Shared lead form field styles — modals stay visually consistent */
const LEAD_SELECT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const LEAD_TEXTAREA_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-slate-50';
const LEAD_SECTION =
  'rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-sm sm:p-5';
const LEAD_SECTION_TITLE =
  'mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:mb-4';

function applyGstLookupToLeadFields(
  d: GstinLookupResponse,
  setGstNumber: (v: string) => void,
  setCompany: (v: string) => void,
  setAddress: Dispatch<SetStateAction<string>>
) {
  setGstNumber(d.gstin);
  if (d.company) setCompany(d.company);
  if (d.address) setAddress(d.address);
}

/** Table / compact display: business name, address, GST in one column */
function LeadBusinessCell({ lead }: { lead: Lead }) {
  const name = lead.company?.trim();
  const addr = lead.address?.trim();
  const gst = lead.gstNumber?.trim();
  if (!name && !addr && !gst) return <span className="text-slate-400">—</span>;
  return (
    <div className="max-w-[min(100%,20rem)] space-y-0.5 text-sm">
      {name ? <p className="font-medium text-slate-800">{name}</p> : null}
      {addr ? <p className="whitespace-pre-wrap text-xs leading-snug text-slate-600">{addr}</p> : null}
      {gst ? <p className="font-mono text-xs text-slate-500">GST: {gst}</p> : null}
    </div>
  );
}

function taxDocKindLabel(kind: string | undefined) {
  return DOCUMENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Tax invoice';
}

function formatInvoiceMoney(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LeadInvoicePreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-800">Invoice preview</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void (async () => {
                  setPdfLoading(true);
                  try {
                    const { blob, filename } = await downloadTaxInvoicePdfApi(id);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    alert((e as Error).message);
                  } finally {
                    setPdfLoading(false);
                  }
                })();
              }}
              loading={pdfLoading}
              disabled={!html}
            >
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

function LeadLinkedInvoicesSection({ leadId }: { leadId: string }) {
  const { data, isLoading, isError, error } = useTaxInvoicesByLead(leadId);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pdfRowId, setPdfRowId] = useState<string | null>(null);
  const rows = data?.data ?? [];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Tax invoices &amp; quotes (this lead)</h3>
          {rows.length > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {rows.length} linked
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Documents you create under <strong>Tax invoices</strong> with this lead selected are listed here. Preview or download PDF.
        </p>
        {isLoading && <p className="text-sm text-slate-500">Loading linked documents…</p>}
        {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-sm text-slate-500">
            None yet. Create a tax invoice, proforma, or quotation and choose this lead in the form.
          </p>
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
            {rows.map((inv: TaxInvoice) => (
              <li key={inv._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {taxDocKindLabel(inv.documentKind)}
                </span>
                <span className="font-medium text-slate-800">{inv.invoiceNo}</span>
                <span className="text-slate-500">
                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—'}
                </span>
                <span className="font-mono text-slate-800">₹ {formatInvoiceMoney(inv.grandTotal ?? 0)}</span>
                <span className="text-xs text-slate-500 sm:ml-2">Billed: {inv.billedToName || '—'}</span>
                <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    onClick={() => setPreviewId(inv._id)}
                  >
                    <FiEye className="mr-0.5 inline size-3.5" aria-hidden />
                    Preview
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    disabled={pdfRowId === inv._id}
                    onClick={() => {
                      void (async () => {
                        setPdfRowId(inv._id);
                        try {
                          const { blob, filename } = await downloadTaxInvoicePdfApi(inv._id);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          alert((e as Error).message);
                        } finally {
                          setPdfRowId(null);
                        }
                      })();
                    }}
                  >
                    <FiDownload className="mr-0.5 inline size-3.5" aria-hidden />
                    PDF
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {previewId && <LeadInvoicePreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}

function assignedToName(lead: Lead) {
  const a = lead.assignedTo;
  if (typeof a === 'object' && a?.fullName) return a.fullName;
  return '—';
}

function LeadKanbanCard({
  lead,
  onView,
  onMessage,
  onDelete,
  canDelete,
}: {
  lead: Lead;
  onView: (id: string) => void;
  onMessage: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead._id,
    data: { lead },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow ${isDragging ? 'z-50 opacity-90 shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="min-w-0 flex-1 cursor-grab active:cursor-grabbing"
          {...listeners}
          {...attributes}
        >
          <p className="truncate font-medium text-slate-800">{lead.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{lead.phone}</p>
          {lead.company && <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{lead.company}</p>}
          {lead.address && <p className="line-clamp-2 text-[11px] text-slate-500">{lead.address}</p>}
          {lead.gstNumber && <p className="font-mono text-[11px] text-slate-400">GST {lead.gstNumber}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-slate-400">{assignedToName(lead)}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{formatDate(lead.createdAt)}</p>
      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => onView(lead._id)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          View
        </button>
        {lead.phone && (
          <button
            type="button"
            onClick={() => onMessage(lead)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
            title="Send message"
            aria-label="Message lead"
          >
            <FiMessageCircle className="mr-0.5 inline size-3.5" aria-hidden />
            Message
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(lead)}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

const LEAD_COLUMN_COLORS: Record<LeadStatus, string> = {
  new: 'bg-sky-50 border-sky-200',
  contacted: 'bg-blue-50 border-blue-200',
  proposal: 'bg-amber-50 border-amber-200',
  closed: 'bg-emerald-50 border-emerald-200',
  lost: 'bg-slate-100 border-slate-300',
};

function LeadKanbanColumn({
  status,
  label,
  leads,
  onView,
  onMessage,
  onDelete,
  canDelete,
}: {
  status: LeadStatus;
  label: string;
  leads: Lead[];
  onView: (id: string) => void;
  onMessage: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  canDelete: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = LEAD_COLUMN_COLORS[status] ?? 'bg-slate-50 border-slate-200';

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] min-w-[200px] max-w-[280px] shrink-0 rounded-lg border-2 p-3 transition-colors ${colors} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
    >
      <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
        {label}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-normal">
          {leads.length}
        </span>
      </h3>
      <div className="flex flex-col gap-2">
        {leads.map((l) => (
          <LeadKanbanCard key={l._id} lead={l} onView={onView} onMessage={onMessage} onDelete={onDelete} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}

function LeadKanbanBoard({
  leads,
  isLoading,
  onView,
  onMessage,
  onDelete,
  onStatusChange,
  isUpdating,
  canDelete,
}: {
  leads: Lead[];
  isLoading: boolean;
  onView: (id: string) => void;
  onMessage: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onStatusChange: (params: { id: string; payload: { status: LeadStatus } }) => void;
  isUpdating: boolean;
  canDelete: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const columns = LEAD_STATUS_OPTIONS.map((opt) => ({
    status: opt.value,
    label: opt.label,
    leads: leads.filter((l) => l.status === opt.value),
  }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id === active.id) return;
    const lead = active.data.current?.lead as Lead | undefined;
    if (!lead) return;
    const newStatus = over.id as LeadStatus;
    if (LEAD_STATUS_OPTIONS.some((o) => o.value === newStatus) && lead.status !== newStatus) {
      onStatusChange({ id: lead._id, payload: { status: newStatus } });
    }
  }

  if (isLoading) {
    return <p className="py-8 text-center text-slate-500">Loading...</p>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {isUpdating && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-medium text-indigo-700">
          <svg
            className="size-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Updating status...
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ status, label, leads: list }) => (
          <LeadKanbanColumn
            key={status}
            status={status}
            label={label}
            leads={list}
            onView={onView}
            onMessage={onMessage}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}

type ViewMode = 'list' | 'kanban';

export function LeadManagement() {
  const { data: authData } = useCurrentUser();
  const isAdmin = authData?.user?.role === 'admin';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [assignedFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ name: string; phone: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [exportLoading, setExportLoading] = useState<'csv' | 'xlsx' | null>(null);

  const isKanban = viewMode === 'kanban';
  const bulkUploadMutation = useBulkUploadLeads();

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExportLoading(format);
    try {
      const { blob, filename } = await exportLeadsApi(format, {
        status: statusFilter || undefined,
        assignedTo: assignedFilter || undefined,
        search: searchQuery || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert((err as Error).message ?? 'Export failed');
    } finally {
      setExportLoading(null);
    }
  };

  const { data, isLoading, isError, error } = useLeadsList({
    status: isKanban ? undefined : (statusFilter || undefined),
    assignedTo: assignedFilter || undefined,
    search: searchQuery || undefined,
    page: isKanban ? 1 : page,
    limit: isKanban ? KANBAN_LIMIT : 10,
  });

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const leads = data?.data ?? [];
  const pagination = data?.pagination;

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter((e.target.value || '') as LeadStatus | '');
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All</option>
          {LEAD_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <Button variant="outline" onClick={() => setSearchQuery(searchInput)}>
        Apply search
      </Button>
    </div>
  );

  const columns = [
    { key: 'name', label: 'Name', render: (l: Lead) => <span className="font-medium text-slate-800">{l.name}</span> },
    { key: 'phone', label: 'Phone', render: (l: Lead) => l.phone },
    { key: 'email', label: 'Email', render: (l: Lead) => l.email || '—' },
    {
      key: 'business',
      label: 'Business',
      render: (l: Lead) => <LeadBusinessCell lead={l} />,
    },
    { key: 'status', label: 'Status', render: (l: Lead) => <LeadStatusBadge status={l.status} /> },
    { key: 'assignedTo', label: 'Assigned to', render: (l: Lead) => assignedToName(l) },
    { key: 'createdAt', label: 'Created', render: (l: Lead) => formatDate(l.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (l: Lead) => (
        <>
          <button
            type="button"
            onClick={() => setDetailId(l._id)}
            className="mr-2 text-indigo-600 hover:text-indigo-800"
          >
            View
          </button>
          {l.phone && (
            <button
              type="button"
              onClick={() => setMessageTarget({ name: l.name, phone: l.phone })}
              className="mr-2 text-indigo-600 hover:text-indigo-800"
              title="Send message"
              aria-label="Message lead"
            >
              <FiMessageCircle className="mr-0.5 inline size-3.5" aria-hidden />
              Message
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeleteTarget(l)}
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Lead management</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`rounded-md p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              aria-pressed={viewMode === 'list'}
            >
              <FiList className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Kanban view"
              className={`rounded-md p-2 ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              aria-pressed={viewMode === 'kanban'}
            >
              <FiGrid className="size-5" />
            </button>
          </div>
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
            <FiUpload className="mr-1.5 inline-block size-4" aria-hidden />
            Bulk upload
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={!!exportLoading}
            >
              <FiDownload className="mr-1.5 inline-block size-4" aria-hidden />
              {exportLoading === 'csv' ? '…' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={!!exportLoading}
            >
              <FiDownload className="mr-1.5 inline-block size-4" aria-hidden />
              {exportLoading === 'xlsx' ? '…' : 'Export XLSX'}
            </Button>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Add lead</Button>
        </div>
      </div>

      <Card>
        {isError ? (
          <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
        ) : isKanban ? (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setSearchQuery(searchInput);
                    }
                  }}
                  placeholder="Search name, phone, email, GST..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchQuery(searchInput)}>
                Apply search
              </Button>
            </div>
            <LeadKanbanBoard
              leads={leads}
              isLoading={isLoading}
              onView={(id) => setDetailId(id)}
              onMessage={(l) => setMessageTarget({ name: l.name, phone: l.phone })}
              onDelete={(l) => setDeleteTarget(l)}
              onStatusChange={updateMutation.mutate}
              isUpdating={updateMutation.isPending}
              canDelete={isAdmin}
            />
          </>
        ) : (
          <DataTable<Lead>
            columns={columns}
            data={leads}
            rowKey={(l) => l._id}
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search name, phone, email, GST...',
              onSearchSubmit: () => {
                setSearchQuery(searchInput);
                setPage(1);
              },
            }}
            filters={filters}
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
            emptyMessage="No leads yet. Add a lead to get started."
          />
        )}
      </Card>

      {createOpen && (
        <CreateLeadModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
          mutation={createMutation}
        />
      )}

      {bulkUploadOpen && (
        <BulkUploadModal
          onClose={() => {
            setBulkUploadOpen(false);
            bulkUploadMutation.reset();
          }}
          mutation={bulkUploadMutation}
        />
      )}

      {detailId && (
        <LeadDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onMessage={setMessageTarget}
          setDeleteTarget={setDeleteTarget}
          canDelete={isAdmin}
        />
      )}

      {messageTarget && (
        <LeadMessageModal
          name={messageTarget.name}
          phone={messageTarget.phone}
          onClose={() => setMessageTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          lead={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(deleteTarget._id);
            setDeleteTarget(null);
            if (detailId === deleteTarget._id) setDetailId(null);
          }}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateLeadModal({
  onClose,
  onSuccess,
  mutation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useCreateLead>;
}) {
  const { data: auth } = useCurrentUser();
  const isAdmin = auth?.user?.role === 'admin';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: usersData } = useAssignableUsers();
  const users = usersData?.data ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const payload: CreateLeadPayload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      address: address.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      status,
      source: (source.trim() || undefined) as LeadSource | undefined,
      notes: notes.trim() || undefined,
      assignedTo: assignedTo || undefined,
    };
    mutation.mutate(payload, { onSuccess, onError: (err: Error) => setError(err.message) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lead-title"
    >
      <div
        className="flex max-h-[min(100dvh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200/60 sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="create-lead-title" className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                Add lead
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Who they are, then GST (optional) to auto-fill the business block — or type company details manually.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            {error && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-5 sm:space-y-6">
              <section className={LEAD_SECTION} aria-labelledby="lead-section-contact">
                <h3 id="lead-section-contact" className={LEAD_SECTION_TITLE}>
                  Contact
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    disabled={mutation.isPending}
                    required
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    disabled={mutation.isPending}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      disabled={mutation.isPending}
                    />
                  </div>
                </div>
              </section>

              <section className={LEAD_SECTION} aria-labelledby="lead-section-business-gst">
                <h3 id="lead-section-business-gst" className={LEAD_SECTION_TITLE}>
                  Business &amp; GST
                </h3>
                <p className="-mt-2 mb-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Put <strong className="font-medium text-slate-800">GSTIN first</strong>, then use look up to pull legal name and address into the fields below. No GST yet? Jump straight to step 2.
                </p>

                <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/60 p-4 shadow-sm ring-1 ring-indigo-100/50 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm"
                      aria-hidden
                    >
                      1
                    </span>
                    <span className="text-sm font-semibold text-slate-900">GSTIN &amp; look up</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                      Auto-fills step 2
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="lead-create-gst" className="mb-1.5 block text-sm font-medium text-slate-700">
                        GST / tax ID
                      </label>
                      <input
                        id="lead-create-gst"
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        disabled={mutation.isPending}
                        className="w-full rounded-xl border border-indigo-200/80 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wide text-slate-900 shadow-sm placeholder:normal-case placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50"
                      />
                    </div>
                    <GstinLookupButton
                      gstin={gstNumber}
                      disabled={mutation.isPending}
                      fullWidthOnMobile
                      onSuccess={(d) => {
                        applyGstLookupToLeadFields(d, setGstNumber, setCompany, setAddress);
                        if (d.warning) setError(d.warning);
                        else setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200/80 pt-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold text-slate-700"
                      aria-hidden
                    >
                      2
                    </span>
                    <span className="text-sm font-semibold text-slate-900">Company &amp; registered address</span>
                  </div>
                  <p className="mb-4 text-xs text-slate-500 sm:text-sm">
                    Editable after look up, or fill manually if you skipped GST.
                  </p>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
                    <div className="min-w-0">
                      <Input
                        label="Company name"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Legal or trade name"
                        disabled={mutation.isPending}
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="lead-create-address" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Registered address
                      </label>
                      <textarea
                        id="lead-create-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={mutation.isPending}
                        rows={4}
                        placeholder="Street, city, state, PIN…"
                        className={`${LEAD_TEXTAREA_CLASS} min-h-[100px] resize-y lg:min-h-[120px]`}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className={LEAD_SECTION} aria-labelledby="lead-section-pipeline">
                <h3 id="lead-section-pipeline" className={LEAD_SECTION_TITLE}>
                  Pipeline
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as LeadStatus)}
                      disabled={mutation.isPending}
                      className={LEAD_SELECT_CLASS}
                    >
                      {LEAD_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Source</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      disabled={mutation.isPending}
                      className={LEAD_SELECT_CLASS}
                    >
                      <option value="">—</option>
                      {LEAD_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isAdmin && (
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to</label>
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        disabled={mutation.isPending}
                        className={LEAD_SELECT_CLASS}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              <section className={LEAD_SECTION} aria-labelledby="lead-section-notes">
                <h3 id="lead-section-notes" className={LEAD_SECTION_TITLE}>
                  Notes
                </h3>
                <label htmlFor="lead-create-notes" className="sr-only">
                  Notes
                </label>
                <textarea
                  id="lead-create-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={mutation.isPending}
                  rows={3}
                  className={LEAD_TEXTAREA_CLASS}
                  placeholder="Anything the team should know…"
                />
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" loading={mutation.isPending}>
                Add lead
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkUploadModal({
  onClose,
  mutation,
}: {
  onClose: () => void;
  mutation: ReturnType<typeof useBulkUploadLeads>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file ?? null);
    setError(null);
    mutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedFile) {
      setError('Please select a CSV or XLSX file.');
      return;
    }
    const ext = (selectedFile.name || '').toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xlsx') {
      setError('Only .csv and .xlsx files are supported.');
      return;
    }
    mutation.mutate(selectedFile, {
      onError: (err: Error) => setError(err.message),
    });
  };

  const data = mutation.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-upload-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="bulk-upload-title" className="text-lg font-semibold text-slate-800">
            Bulk upload leads
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Upload a CSV or XLSX with columns: name, phone, email, company, address, gstNumber (or GST / GSTIN), status, source, notes. First row = headers. Name and phone are required.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {data && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p><strong>{data.created}</strong> lead(s) created.</p>
              {data.failed > 0 && <p><strong>{data.failed}</strong> row(s) failed.</p>}
              {data.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-red-600">
                  {data.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                  {data.errors.length > 10 && <li>… and {data.errors.length - 10} more</li>}
                </ul>
              )}
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              {selectedFile ? selectedFile.name : 'Choose CSV or XLSX file'}
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending} disabled={!selectedFile}>
              Upload
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadDetailModal({
  id,
  onClose,
  onMessage,
  setDeleteTarget,
  canDelete,
}: {
  id: string;
  onClose: () => void;
  onMessage: (lead: { name: string; phone: string }) => void;
  setDeleteTarget: (l: Lead | null) => void;
  canDelete: boolean;
}) {
  const { data: auth } = useCurrentUser();
  const isAdmin = auth?.user?.role === 'admin';
  const { data: lead, isLoading } = useLead(id);
  const updateMutation = useUpdateLead();
  const convertMutation = useConvertLeadToCustomer();
  const uploadAttachmentsMutation = useUploadLeadAttachments(id);
  const { data: usersData } = useAssignableUsers();
  const users = usersData?.data ?? [];

  const [editing, setEditing] = useState(false);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>([]);
  const leadAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);

  const MAX_LEAD_ATTACHMENTS = 10;
  const attachments = lead?.attachments ?? [];
  const savedAttachmentCount = attachments.length;
  const leadAttachmentSlots = MAX_LEAD_ATTACHMENTS - savedAttachmentCount;

  useEffect(() => {
    setPendingAttachmentFiles([]);
  }, [id]);

  useEffect(() => {
    const urls = pendingAttachmentFiles.map((f) => (fileIsImage(f) ? URL.createObjectURL(f) : ''));
    setPendingPreviewUrls(urls);
    return () => urls.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
  }, [pendingAttachmentFiles]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email ?? '');
      setCompany(lead.company ?? '');
      setAddress(lead.address ?? '');
      setGstNumber(lead.gstNumber ?? '');
      setStatus(lead.status);
      setSource(lead.source ?? '');
      setNotes(lead.notes ?? '');
      setAssignedTo(typeof lead.assignedTo === 'object' && lead.assignedTo?._id ? lead.assignedTo._id : '');
    }
  }, [lead]);

  function addPendingLeadFiles(files: File[]) {
    setPendingAttachmentFiles((prev) => {
      const combined = [...prev, ...files];
      return combined.slice(0, Math.max(0, leadAttachmentSlots));
    });
  }

  async function handleSave() {
    if (!id) return;
    try {
      if (pendingAttachmentFiles.length > 0) {
        await uploadAttachmentsMutation.mutateAsync(pendingAttachmentFiles);
        setPendingAttachmentFiles([]);
      }
      await updateMutation.mutateAsync({
        id,
        payload: {
          name,
          phone,
          email: email || undefined,
          company: company || undefined,
          address: address.trim(),
          gstNumber: gstNumber.trim() || undefined,
          status,
          source: (source || undefined) as LeadSource | undefined,
          notes: notes || undefined,
          assignedTo: assignedTo || null,
        },
      });
      setEditing(false);
    } catch {
      /* errors via mutation isError */
    }
  }

  const saving = updateMutation.isPending || uploadAttachmentsMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[min(100dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200/60 sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Lead details</h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-slate-500">Loading...</p>
        ) : !lead ? (
          <p className="py-6 text-center text-slate-500">Lead not found.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {editing ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                  <div className="space-y-5 sm:space-y-6">
                    <section className={LEAD_SECTION}>
                      <h3 className={LEAD_SECTION_TITLE}>Contact</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
                        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
                        <div className="md:col-span-2">
                          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
                        </div>
                      </div>
                    </section>

                    <section className={LEAD_SECTION}>
                      <h3 className={LEAD_SECTION_TITLE}>Business &amp; GST</h3>
                      <p className="-mt-2 mb-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                        <strong className="font-medium text-slate-800">GSTIN first</strong>, then look up to refresh company and address — or edit those fields directly.
                      </p>

                      <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/60 p-4 shadow-sm ring-1 ring-indigo-100/50 sm:p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm"
                            aria-hidden
                          >
                            1
                          </span>
                          <span className="text-sm font-semibold text-slate-900">GSTIN &amp; look up</span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                            Auto-fills step 2
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <label htmlFor="lead-edit-gst" className="mb-1.5 block text-sm font-medium text-slate-700">
                              GST / tax ID
                            </label>
                            <input
                              id="lead-edit-gst"
                              type="text"
                              value={gstNumber}
                              onChange={(e) => setGstNumber(e.target.value)}
                              disabled={saving}
                              placeholder="e.g. 22AAAAA0000A1Z5"
                              className="w-full rounded-xl border border-indigo-200/80 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wide text-slate-900 shadow-sm placeholder:normal-case placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50"
                            />
                          </div>
                          <GstinLookupButton
                            gstin={gstNumber}
                            disabled={saving}
                            fullWidthOnMobile
                            onSuccess={(d) => {
                              applyGstLookupToLeadFields(d, setGstNumber, setCompany, setAddress);
                              if (d.warning) alert(d.warning);
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 border-t border-slate-200/80 pt-6">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold text-slate-700"
                            aria-hidden
                          >
                            2
                          </span>
                          <span className="text-sm font-semibold text-slate-900">Company &amp; registered address</span>
                        </div>
                        <p className="mb-4 text-xs text-slate-500 sm:text-sm">Review after look up or type manually.</p>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
                          <Input
                            label="Company name"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            disabled={saving}
                          />
                          <div>
                            <label htmlFor="lead-edit-address" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Registered address
                            </label>
                            <textarea
                              id="lead-edit-address"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              disabled={saving}
                              rows={4}
                              placeholder="Street, city, state, PIN…"
                              className={`${LEAD_TEXTAREA_CLASS} min-h-[100px] resize-y lg:min-h-[120px]`}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className={LEAD_SECTION}>
                      <h3 className={LEAD_SECTION_TITLE}>Pipeline</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as LeadStatus)}
                            disabled={saving}
                            className={LEAD_SELECT_CLASS}
                          >
                            {LEAD_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Source</label>
                          <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            disabled={saving}
                            className={LEAD_SELECT_CLASS}
                          >
                            <option value="">—</option>
                            {LEAD_SOURCE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isAdmin && (
                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to</label>
                            <select
                              value={assignedTo}
                              onChange={(e) => setAssignedTo(e.target.value)}
                              disabled={saving}
                              className={LEAD_SELECT_CLASS}
                            >
                              <option value="">Unassigned</option>
                              {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className={LEAD_SECTION}>
                      <h3 className={LEAD_SECTION_TITLE}>Notes</h3>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={saving}
                        rows={3}
                        className={LEAD_TEXTAREA_CLASS}
                        placeholder="Internal notes…"
                      />
                    </section>
                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-slate-700">Attachments</p>
                  {(attachments.length > 0 || pendingAttachmentFiles.length > 0) && (
                    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {attachments.map((url, i) =>
                        urlLooksLikeImage(url) ? (
                          <a
                            key={`saved-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                          >
                            <img src={url} alt="" className="h-16 w-full object-cover" />
                          </a>
                        ) : (
                          <a
                            key={`saved-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 text-center text-[10px] text-indigo-600"
                          >
                            <FiFile className="size-5 text-slate-500" aria-hidden />
                            File
                          </a>
                        )
                      )}
                      {pendingAttachmentFiles.map((file, i) => (
                        <div key={`pend-${i}`} className="relative">
                          {fileIsImage(file) && pendingPreviewUrls[i] ? (
                            <img
                              src={pendingPreviewUrls[i]}
                              alt=""
                              className="h-16 w-full rounded-lg border border-amber-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-200 bg-amber-50/50 p-1 text-center text-[10px] text-slate-700">
                              <FiFile className="size-5 text-amber-800/80" aria-hidden />
                              <span className="line-clamp-2 break-all">{file.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingAttachmentFiles((p) => p.filter((_, j) => j !== i))}
                            className="absolute right-0.5 top-0.5 rounded bg-slate-800/70 px-1 text-[10px] text-white"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={leadAttachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const list = e.target.files;
                      if (list?.length && leadAttachmentSlots > 0) {
                        addPendingLeadFiles(Array.from(list));
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={leadAttachmentSlots <= 0 || saving}
                    onClick={() => leadAttachmentInputRef.current?.click()}
                  >
                    <FiUpload className="mr-1.5 inline-block size-4" aria-hidden />
                    Add files
                  </Button>
                  <p className="mt-2 text-xs text-slate-500">
                    Any common file type (PDF, Office, images, ZIP, etc.). Max 15MB each, up to {MAX_LEAD_ATTACHMENTS} total. Saved when you click Save.
                  </p>
                  {uploadAttachmentsMutation.isError && (
                    <p className="mt-2 text-sm text-red-600">{(uploadAttachmentsMutation.error as Error).message}</p>
                  )}
                  </div>
                  <LeadLinkedInvoicesSection leadId={id} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPendingAttachmentFiles([]);
                        setEditing(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => void handleSave()} loading={saving}>
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                <div><p className="text-sm text-slate-500">Name</p><p className="text-slate-800">{lead.name}</p></div>
                <div><p className="text-sm text-slate-500">Phone</p><p className="text-slate-800">{lead.phone}</p></div>
                <div><p className="text-sm text-slate-500">Email</p><p className="text-slate-800">{lead.email || '—'}</p></div>
                <div>
                  <p className="text-sm text-slate-500">Business</p>
                  <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                    <LeadBusinessCell lead={lead} />
                  </div>
                </div>
                <div><p className="text-sm text-slate-500">Status</p><p className="text-slate-800"><LeadStatusBadge status={lead.status} /></p></div>
                <div><p className="text-sm text-slate-500">Assigned to</p><p className="text-slate-800">{assignedToName(lead)}</p></div>
                <div><p className="text-sm text-slate-500">Created</p><p className="text-slate-800">{formatDate(lead.createdAt)}</p></div>
                {attachments.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500">Attachments</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {attachments.map((url, i) =>
                        urlLooksLikeImage(url) ? (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                          >
                            <img src={url} alt="" className="h-16 w-full object-cover" />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-center text-[10px] text-indigo-600 hover:bg-slate-100"
                          >
                            <FiFile className="size-5 text-slate-500" aria-hidden />
                            Open file
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
                {lead.notes && <div><p className="text-sm text-slate-500">Notes</p><p className="whitespace-pre-wrap text-slate-800">{lead.notes}</p></div>}
                <LeadLinkedInvoicesSection leadId={id} />
                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        if (confirm('Are you sure you want to convert this lead to a customer? This will close the lead.')) {
                          try {
                            await convertMutation.mutateAsync(id);
                            alert('Successfully converted to customer!');
                            onClose();
                          } catch (err) {
                            alert((err as Error).message || 'Failed to convert lead');
                          }
                        }
                      }}
                      loading={convertMutation.isPending}
                    >
                      Convert to Customer
                    </Button>
                    {lead.phone && (
                      <Button variant="outline" onClick={() => onMessage({ name: lead.name, phone: lead.phone })}>
                        <FiMessageCircle className="mr-1 inline size-4" aria-hidden />
                        Message
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="outline" onClick={() => { setDeleteTarget(lead); onClose(); }} className="text-red-600 border-red-200 hover:bg-red-50">
                        Delete
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadMessageModal({
  name,
  phone,
  onClose,
}: {
  name: string;
  phone: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const sendMutation = useSendMessageToPhone();

  const handleSend = () => {
    const text = body.trim();
    if (!text) return;
    sendMutation.mutate(
      { toPhone: phone, body: text },
      {
        onSuccess: () => setBody(''),
        onError: () => {},
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-message-title"
    >
      <div
        className="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 id="lead-message-title" className="text-lg font-semibold text-slate-800">
              Message {name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 p-4">
          {sendMutation.isError && (
            <p className="text-sm text-red-600">{(sendMutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Type a message…"
              rows={3}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={sendMutation.isPending}
            />
            <Button onClick={handleSend} loading={sendMutation.isPending} disabled={!body.trim()} className="self-end">
              Send
            </Button>
          </div>
          <p className="text-xs text-slate-500">SMS will be sent via Twilio to the lead&apos;s phone.</p>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  lead,
  onClose,
  onConfirm,
  isLoading,
}: {
  lead: Lead;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Delete lead</h2>
        <p className="mt-2 text-slate-600">
          Are you sure you want to delete &quot;{lead.name}&quot;? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="button" onClick={onConfirm} loading={isLoading} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">Delete</Button>
        </div>
      </div>
    </div>
  );
}
