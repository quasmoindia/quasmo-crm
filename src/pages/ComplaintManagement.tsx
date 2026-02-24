import { useState, useEffect, useCallback } from 'react';
import { FiList, FiGrid } from 'react-icons/fi';
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
  useComplaintsList,
  useCreateComplaint,
  useUpdateComplaint,
  useDeleteComplaint,
  useComplaint,
} from '../api/complaints';
import type { Complaint, ComplaintStatus, ComplaintPriority } from '../types/complaint';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../types/complaint';

const KANBAN_LIMIT = 500;

const DEBOUNCE_MS = 300;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const styles: Record<ComplaintStatus, string> = {
    open: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    closed: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<ComplaintStatus, string> = {
    open: 'Open',
    in_progress: 'In progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const styles: Record<ComplaintPriority, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function userName(complaint: Complaint) {
  const u = complaint.user;
  if (typeof u === 'object' && u?.fullName) return u.fullName;
  return typeof u === 'string' ? u : '—';
}

function buildComplaintCsvRows(complaints: Complaint[]): (string | number)[][] {
  const headers = ['Subject', 'User', 'Status', 'Priority', 'Product', 'Created'];
  const rows = complaints.map((c) => [
    c.subject,
    userName(c),
    c.status,
    c.priority,
    c.productModel ?? '',
    formatDate(c.createdAt),
  ]);
  return [headers, ...rows];
}

function KanbanCard({
  complaint,
  onView,
  onDelete,
}: {
  complaint: Complaint;
  onView: (id: string) => void;
  onDelete: (c: Complaint) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: complaint._id,
    data: { complaint },
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
          <p className="truncate font-medium text-slate-800">{complaint.subject}</p>
          <p className="mt-0.5 text-xs text-slate-500">{userName(complaint)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{formatDate(complaint.createdAt)}</p>
      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => onView(complaint._id)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onDelete(complaint)}
          className="text-xs text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  complaints,
  onView,
  onDelete,
}: {
  status: ComplaintStatus;
  label: string;
  complaints: Complaint[];
  onView: (id: string) => void;
  onDelete: (c: Complaint) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const columnColors: Record<ComplaintStatus, string> = {
    open: 'bg-amber-50 border-amber-200',
    in_progress: 'bg-blue-50 border-blue-200',
    resolved: 'bg-emerald-50 border-emerald-200',
    closed: 'bg-slate-50 border-slate-200',
  };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] min-w-[280px] flex-1 rounded-lg border-2 p-3 transition-colors ${columnColors[status]} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
    >
      <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
        {label}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-normal">
          {complaints.length}
        </span>
      </h3>
      <div className="flex flex-col gap-2">
        {complaints.map((c) => (
          <KanbanCard key={c._id} complaint={c} onView={onView} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function ComplaintKanbanBoard({
  complaints,
  isLoading,
  onView,
  onDelete,
  onStatusChange,
  isUpdating,
}: {
  complaints: Complaint[];
  isLoading: boolean;
  onView: (id: string) => void;
  onDelete: (c: Complaint) => void;
  onStatusChange: (params: { id: string; payload: { status: ComplaintStatus } }) => void;
  isUpdating: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const columns = STATUS_OPTIONS.map((opt) => ({
    status: opt.value,
    label: opt.label,
    complaints: complaints.filter((c) => c.status === opt.value),
  }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id === active.id) return;
    const complaint = active.data.current?.complaint as Complaint | undefined;
    if (!complaint) return;
    const newStatus = over.id as ComplaintStatus;
    if (STATUS_OPTIONS.some((o) => o.value === newStatus) && complaint.status !== newStatus) {
      onStatusChange({ id: complaint._id, payload: { status: newStatus } });
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
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Updating status...
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ status, label, complaints: list }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            complaints={list}
            onView={onView}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}

type ViewMode = 'list' | 'kanban';

export function ComplaintManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isKanban = viewMode === 'kanban';
  const { data, isLoading, isError, error } = useComplaintsList({
    status: isKanban ? undefined : (statusFilter || undefined),
    priority: priorityFilter || undefined,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: isKanban ? 1 : page,
    limit: isKanban ? KANBAN_LIMIT : 10,
  });

  const createMutation = useCreateComplaint();
  const updateMutation = useUpdateComplaint();
  const deleteMutation = useDeleteComplaint();

  const complaints = data?.data ?? [];
  const pagination = data?.pagination;

  const exportCsvRows = useCallback(
    () => buildComplaintCsvRows(complaints),
    [complaints]
  );

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[120px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter((e.target.value || '') as ComplaintStatus | '');
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter((e.target.value || '') as ComplaintPriority | '');
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Created from</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="min-w-[140px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Created to</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );

  const columns = [
    { key: 'subject', label: 'Subject', render: (c: Complaint) => <span className="font-medium text-slate-800">{c.subject}</span> },
    { key: 'user', label: 'User', render: (c: Complaint) => userName(c) },
    { key: 'status', label: 'Status', render: (c: Complaint) => <StatusBadge status={c.status} /> },
    { key: 'priority', label: 'Priority', render: (c: Complaint) => <PriorityBadge priority={c.priority} /> },
    { key: 'productModel', label: 'Product', render: (c: Complaint) => c.productModel ?? '—' },
    { key: 'createdAt', label: 'Created', render: (c: Complaint) => formatDate(c.createdAt) },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Complaint management</h1>
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
          <Button onClick={() => setCreateOpen(true)}>New complaint</Button>
        </div>
      </div>

      <Card className="mb-4">
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
                  placeholder="Search subject or description..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {filters}
            </div>
            <ComplaintKanbanBoard
            complaints={complaints}
            isLoading={isLoading}
            onView={(id) => setDetailId(id)}
            onDelete={(c) => setDeleteTarget(c)}
            onStatusChange={updateMutation.mutate}
              isUpdating={updateMutation.isPending}
            />
          </>
        ) : (
          <DataTable
            columns={columns}
            data={complaints}
            rowKey={(c) => c._id}
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search subject or description...',
            }}
            filters={filters}
            exportCsv={{
              filename: `complaints-${new Date().toISOString().slice(0, 10)}.csv`,
              getRows: exportCsvRows,
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
            emptyMessage="No complaints found."
            renderActions={(c) => (
              <>
                <button
                  type="button"
                  onClick={() => setDetailId(c._id)}
                  className="mr-2 text-indigo-600 hover:text-indigo-800"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </>
            )}
          />
        )}
      </Card>

      {createOpen && (
        <CreateComplaintModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
          mutation={createMutation}
        />
      )}

      {detailId && (
        <ComplaintDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          setDeleteTarget={setDeleteTarget}
          updateMutation={updateMutation}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          complaint={deleteTarget}
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

function CreateComplaintModal({
  onClose,
  onSuccess,
  mutation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  mutation: ReturnType<typeof useCreateComplaint>;
}) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [productModel, setProductModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required');
      return;
    }
    mutation.mutate(
      {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        productModel: productModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        orderReference: orderReference.trim() || undefined,
      },
      {
        onSuccess: onSuccess,
        onError: (err) => setError(err.message),
      }
    );
  }

  return (
    <Modal title="New complaint" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short title"
          disabled={mutation.isPending}
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue"
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={mutation.isPending}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={mutation.isPending}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Product model"
          value={productModel}
          onChange={(e) => setProductModel(e.target.value)}
          placeholder="e.g. X200"
          disabled={mutation.isPending}
        />
        <Input
          label="Serial number"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Product serial"
          disabled={mutation.isPending}
        />
        <Input
          label="Order reference"
          value={orderReference}
          onChange={(e) => setOrderReference(e.target.value)}
          placeholder="Order or invoice number"
          disabled={mutation.isPending}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create complaint
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ComplaintDetailModal({
  id,
  onClose,
  setDeleteTarget,
  updateMutation,
}: {
  id: string;
  onClose: () => void;
  setDeleteTarget: (c: Complaint | null) => void;
  updateMutation: ReturnType<typeof useUpdateComplaint>;
}) {
  const { data: complaint, isLoading } = useComplaint(id);
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [priority, setPriority] = useState<ComplaintPriority | ''>('');
  const [internalNotes, setInternalNotes] = useState('');
  const [editDirty, setEditDirty] = useState(false);

  function openDelete() {
    if (complaint) setDeleteTarget(complaint);
    onClose();
  }

  function handleSaveUpdates() {
    if (!id || !complaint || !editDirty) return;
    const newStatus = (status || complaint.status) as ComplaintStatus;
    const newPriority = (priority || complaint.priority) as ComplaintPriority;
    const newNotes = (internalNotes !== undefined ? internalNotes : complaint.internalNotes ?? '').trim() || undefined;
    const payload: { status?: ComplaintStatus; priority?: ComplaintPriority; internalNotes?: string } = {};
    if (newStatus !== complaint.status) payload.status = newStatus;
    if (newPriority !== complaint.priority) payload.priority = newPriority;
    if (newNotes !== (complaint.internalNotes ?? '').trim()) payload.internalNotes = newNotes;
    if (Object.keys(payload).length === 0) return;
    updateMutation.mutate(
      { id, payload },
      { onSuccess: () => setEditDirty(false) }
    );
  }

  return (
    <Modal title="Complaint details" onClose={onClose}>
      {isLoading ? (
        <p className="py-6 text-center text-slate-500">Loading...</p>
      ) : !complaint ? (
        <p className="py-6 text-center text-slate-500">Complaint not found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Subject</p>
            <p className="text-slate-800">{complaint.subject}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Description</p>
            <p className="whitespace-pre-wrap text-slate-800">{complaint.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">User</p>
              <p className="text-slate-800">{userName(complaint)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Created</p>
              <p className="text-slate-800">{formatDate(complaint.createdAt)}</p>
            </div>
          </div>
          {(complaint.productModel || complaint.serialNumber || complaint.orderReference) && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-sm font-medium text-slate-600">Product details</p>
              <p className="text-sm text-slate-700">
                {[complaint.productModel, complaint.serialNumber, complaint.orderReference]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
          )}

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Update status / priority</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Status</label>
              <select
                value={status || complaint.status}
                onChange={(e) => {
                  setStatus(e.target.value as ComplaintStatus);
                  setEditDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Priority</label>
              <select
                value={priority || complaint.priority}
                onChange={(e) => {
                  setPriority(e.target.value as ComplaintPriority);
                  setEditDirty(true);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Internal notes</label>
            <textarea
              value={internalNotes || complaint.internalNotes || ''}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                setEditDirty(true);
              }}
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Support notes (not visible to customer)"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={openDelete}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Delete complaint
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                onClick={handleSaveUpdates}
                disabled={!editDirty || updateMutation.isPending}
                loading={updateMutation.isPending}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ConfirmDeleteModal({
  complaint,
  onClose,
  onConfirm,
  isLoading,
}: {
  complaint: Complaint;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal title="Delete complaint" onClose={onClose}>
      <p className="text-slate-600">
        Are you sure you want to delete &quot;{complaint.subject}&quot;? This cannot be undone.
      </p>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          loading={isLoading}
          className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-800">
            {title}
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
        {children}
      </div>
    </div>
  );
}
