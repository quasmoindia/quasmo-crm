import { useState, useEffect, useRef } from 'react';
import { FiList, FiGrid, FiUpload, FiDownload } from 'react-icons/fi';
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
  exportLeadsApi,
} from '../api/leads';
import { useCurrentUser } from '../api/auth';
import type { Lead, LeadStatus, LeadSource, CreateLeadPayload } from '../types/lead';
import { LEAD_STATUS_OPTIONS, LEAD_SOURCE_OPTIONS, LEAD_STATUS_STYLES } from '../types/lead';

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

function assignedToName(lead: Lead) {
  const a = lead.assignedTo;
  if (typeof a === 'object' && a?.fullName) return a.fullName;
  return '—';
}

function LeadKanbanCard({
  lead,
  onView,
  onDelete,
  canDelete,
}: {
  lead: Lead;
  onView: (id: string) => void;
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
          {lead.company && <p className="mt-0.5 text-xs text-slate-500">{lead.company}</p>}
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
};

function LeadKanbanColumn({
  status,
  label,
  leads,
  onView,
  onDelete,
  canDelete,
}: {
  status: LeadStatus;
  label: string;
  leads: Lead[];
  onView: (id: string) => void;
  onDelete: (l: Lead) => void;
  canDelete: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = LEAD_COLUMN_COLORS[status] ?? 'bg-slate-50 border-slate-200';

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] min-w-[260px] flex-1 rounded-lg border-2 p-3 transition-colors ${colors} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
    >
      <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
        {label}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-normal">
          {leads.length}
        </span>
      </h3>
      <div className="flex flex-col gap-2">
        {leads.map((l) => (
          <LeadKanbanCard key={l._id} lead={l} onView={onView} onDelete={onDelete} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}

function LeadKanbanBoard({
  leads,
  isLoading,
  onView,
  onDelete,
  onStatusChange,
  isUpdating,
  canDelete,
}: {
  leads: Lead[];
  isLoading: boolean;
  onView: (id: string) => void;
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
    { key: 'company', label: 'Company', render: (l: Lead) => l.company || '—' },
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
                  placeholder="Search name, phone, email..."
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
              placeholder: 'Search name, phone, email...',
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
          setDeleteTarget={setDeleteTarget}
          canDelete={isAdmin}
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
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
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    const payload: CreateLeadPayload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      status,
      source: (source.trim() || undefined) as LeadSource | undefined,
      notes: notes.trim() || undefined,
      assignedTo: assignedTo || undefined,
    };
    mutation.mutate(payload, { onSuccess, onError: (err: Error) => setError(err.message) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lead-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-lead-title" className="text-lg font-semibold text-slate-800">
            Add lead
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <Input label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" disabled={mutation.isPending} required />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" disabled={mutation.isPending} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" disabled={mutation.isPending} />
          <Input label="Company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" disabled={mutation.isPending} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              disabled={mutation.isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {LEAD_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">—</option>
              {LEAD_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to (calling person)</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={mutation.isPending}
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Notes..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Add lead</Button>
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
          Upload a CSV or XLSX file with columns: name, phone, email, company, status, source, notes. First row = headers. Name and phone are required.
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
  setDeleteTarget,
  canDelete,
}: {
  id: string;
  onClose: () => void;
  setDeleteTarget: (l: Lead | null) => void;
  canDelete: boolean;
}) {
  const { data: lead, isLoading } = useLead(id);
  const updateMutation = useUpdateLead();
  const { data: usersData } = useAssignableUsers();
  const users = usersData?.data ?? [];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
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
      setStatus(lead.status);
      setSource(lead.source ?? '');
      setNotes(lead.notes ?? '');
      setAssignedTo(typeof lead.assignedTo === 'object' && lead.assignedTo?._id ? lead.assignedTo._id : '');
    }
  }, [lead]);

  function handleSave() {
    if (!id) return;
    updateMutation.mutate(
      { id, payload: { name, phone, email: email || undefined, company: company || undefined, status, source: (source || undefined) as LeadSource | undefined, notes: notes || undefined, assignedTo: assignedTo || null } },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Lead details</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-slate-500">Loading...</p>
        ) : !lead ? (
          <p className="py-6 text-center text-slate-500">Lead not found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {editing ? (
              <>
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={updateMutation.isPending} />
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={updateMutation.isPending} />
                <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={updateMutation.isPending} />
                <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} disabled={updateMutation.isPending} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} disabled={updateMutation.isPending} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {LEAD_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Assign to</label>
                  <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={updateMutation.isPending} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>{u.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={updateMutation.isPending} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button onClick={handleSave} loading={updateMutation.isPending}>Save</Button>
                </div>
              </>
            ) : (
              <>
                <div><p className="text-sm text-slate-500">Name</p><p className="text-slate-800">{lead.name}</p></div>
                <div><p className="text-sm text-slate-500">Phone</p><p className="text-slate-800">{lead.phone}</p></div>
                <div><p className="text-sm text-slate-500">Email</p><p className="text-slate-800">{lead.email || '—'}</p></div>
                <div><p className="text-sm text-slate-500">Company</p><p className="text-slate-800">{lead.company || '—'}</p></div>
                <div><p className="text-sm text-slate-500">Status</p><p className="text-slate-800"><LeadStatusBadge status={lead.status} /></p></div>
                <div><p className="text-sm text-slate-500">Assigned to</p><p className="text-slate-800">{assignedToName(lead)}</p></div>
                <div><p className="text-sm text-slate-500">Created</p><p className="text-slate-800">{formatDate(lead.createdAt)}</p></div>
                {lead.notes && <div><p className="text-sm text-slate-500">Notes</p><p className="whitespace-pre-wrap text-slate-800">{lead.notes}</p></div>}
                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                    {canDelete && (
                      <Button variant="outline" onClick={() => { setDeleteTarget(lead); onClose(); }} className="text-red-600 border-red-200 hover:bg-red-50">
                        Delete
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
              </>
            )}
          </div>
        )}
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
