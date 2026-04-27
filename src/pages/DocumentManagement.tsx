import { useMemo, useRef, useState, type ReactNode } from 'react';
import { FiUpload, FiEye, FiDownload, FiTrash2, FiEdit2, FiFileText, FiImage, FiFile, FiFileMinus } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Input } from '../components/Input';
import { useCurrentUser } from '../api/auth';
import { useDeleteDocument, useDocumentsList, useUpdateDocument, useUploadDocument } from '../api/documents';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_MODULE_OPTIONS,
  type ManagedDocument,
  type DocumentCategory,
  type DocumentModule,
} from '../types/document';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DocumentManagement() {
  const { data: authData } = useCurrentUser();
  const isAdmin = authData?.user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<DocumentModule | 'all'>('all');
  const [previewTarget, setPreviewTarget] = useState<ManagedDocument | null>(null);
  const [editTarget, setEditTarget] = useState<ManagedDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading } = useDocumentsList({
    search: searchQuery,
    category: categoryFilter,
    module: moduleFilter,
    page,
    limit: 10,
  });

  const stats = data?.stats ?? { total: 0, pdf: 0, images: 0, other: 0 };
  const documents = data?.data ?? [];
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Document Name',
        render: (doc: ManagedDocument) => (
          <div className="max-w-[280px]">
            <p className="truncate font-medium text-slate-800">{doc.originalName}</p>
            <p className="text-xs text-slate-500">{formatBytes(doc.sizeBytes)}</p>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        render: (doc: ManagedDocument) => (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{doc.displayType}</span>
        ),
      },
      { key: 'category', label: 'Category', render: (doc: ManagedDocument) => titleCase(doc.category) },
      { key: 'module', label: 'Module', render: (doc: ManagedDocument) => titleCase(doc.module) },
      {
        key: 'uploadedBy',
        label: 'Uploaded By',
        render: (doc: ManagedDocument) => doc.uploadedBy?.fullName || doc.uploadedBy?.email || '—',
      },
      { key: 'date', label: 'Date', render: (doc: ManagedDocument) => formatDate(doc.createdAt) },
    ],
    []
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Document Management</h1>
          <p className="text-sm text-slate-500">Upload, organize, and manage all your documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <FiUpload className="mr-1.5 inline size-4" />
          Upload Documents
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Documents" value={stats.total} icon={<FiFileText className="size-5" />} iconClassName="bg-blue-100 text-blue-700" />
        <KpiCard title="PDFs" value={stats.pdf} icon={<FiFileText className="size-5" />} iconClassName="bg-emerald-100 text-emerald-700" />
        <KpiCard title="Images" value={stats.images} icon={<FiImage className="size-5" />} iconClassName="bg-violet-100 text-violet-700" />
        <KpiCard title="Other Files" value={stats.other} icon={<FiFile className="size-5" />} iconClassName="bg-amber-100 text-amber-700" />
      </div>

      <Card>
        <DataTable<ManagedDocument>
          columns={columns}
          data={documents}
          rowKey={(d) => d._id}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search documents...',
            onSearchSubmit: () => {
              setSearchQuery(searchInput);
              setPage(1);
            },
          }}
          filters={
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value as DocumentCategory | 'all');
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">Module</label>
                <select
                  value={moduleFilter}
                  onChange={(e) => {
                    setModuleFilter(e.target.value as DocumentModule | 'all');
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Modules</option>
                  {DOCUMENT_MODULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
          pagination={
            data?.pagination
              ? {
                  page: data.pagination.page,
                  totalPages: data.pagination.totalPages,
                  total: data.pagination.total,
                  limit: data.pagination.limit,
                  onPageChange: setPage,
                }
              : undefined
          }
          isLoading={isLoading}
          emptyMessage="No documents found."
          renderActions={(doc) => (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Preview"
                onClick={() => setPreviewTarget(doc)}
              >
                <FiEye className="size-4" />
              </button>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Download"
              >
                <FiDownload className="size-4" />
              </a>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Edit"
                onClick={() => setEditTarget(doc)}
              >
                <FiEdit2 className="size-4" />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                  title="Delete"
                  onClick={() => setDeleteTarget(doc)}
                >
                  <FiTrash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        />
      </Card>

      {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} />}

      {previewTarget && (
        <PreviewDocumentModal
          document={previewTarget}
          isAdmin={isAdmin}
          onClose={() => setPreviewTarget(null)}
          onDelete={
            isAdmin
              ? async (id) => {
                  await deleteDocumentMutation.mutateAsync(id);
                  setPreviewTarget(null);
                }
              : undefined
          }
          deleting={deleteDocumentMutation.isPending}
        />
      )}

      {editTarget && (
        <EditDocumentModal
          document={editTarget}
          isSaving={updateDocumentMutation.isPending}
          onClose={() => setEditTarget(null)}
          onSave={async (payload) => {
            await updateDocumentMutation.mutateAsync({ id: editTarget._id, payload });
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Delete document</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-medium">{deleteTarget.originalName}</span> permanently?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteDocumentMutation.isPending}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteDocumentMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteDocumentMutation.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  iconClassName,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconClassName: string;
}) {
  return (
    <Card className="border border-slate-200/80 bg-white">
      <div className="flex items-center gap-3">
        <span className={`inline-flex size-10 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function UploadDocumentModal({ onClose }: { onClose: () => void }) {
  const uploadMutation = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory | 'all'>('invoice');
  const [module, setModule] = useState<DocumentModule | 'all'>('invoices');
  const [tags, setTags] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  function handlePick(file: File | null) {
    setSelectedFile(file);
    setIsDragActive(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[34px] font-semibold text-slate-900">Upload Documents</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedFile) {
              alert('Please select a file');
              return;
            }
            try {
              await uploadMutation.mutateAsync({ file: selectedFile, category, module, tags });
              onClose();
            } catch (err) {
              alert((err as Error).message);
            }
          }}
        >
          <div
            role="button"
            tabIndex={0}
            className={`rounded-2xl border border-dashed p-6 text-center transition-colors ${isDragActive ? 'border-indigo-400 bg-indigo-50/70' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handlePick(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            />
            <FiUpload className="mx-auto mb-2 size-11 text-slate-400" />
            <p className="text-2xl font-medium text-slate-700">Click to upload or drag and drop</p>
            <p className="mt-1 text-sm text-slate-500">PDF, Excel, Word, Images (Max 50MB per file)</p>
            {selectedFile && (
              <p className="mt-3 text-sm font-medium text-indigo-700">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Module *</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as DocumentModule)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {DOCUMENT_MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., invoice, march, 2026"
          />

          <div className="flex justify-end gap-3">
            <Button type="submit" loading={uploadMutation.isPending} className="min-w-[170px]">
              Upload
            </Button>
            <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending} className="min-w-[170px]">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDocumentModal({
  document,
  isSaving,
  onClose,
  onSave,
}: {
  document: ManagedDocument;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { category: DocumentCategory | 'all'; module: DocumentModule | 'all'; tags?: string }) => Promise<void>;
}) {
  const [category, setCategory] = useState<DocumentCategory | 'all'>(document.category);
  const [module, setModule] = useState<DocumentModule | 'all'>(document.module);
  const [tags, setTags] = useState(document.tags.join(', '));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Edit document metadata</h2>
        <p className="mt-1 text-sm text-slate-500">{document.originalName}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onSave({ category, module, tags });
            } catch (err) {
              alert((err as Error).message);
            }
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Module</label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value as DocumentModule)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {DOCUMENT_MODULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewDocumentModal({
  document,
  isAdmin,
  onDelete,
  deleting,
  onClose,
}: {
  document: ManagedDocument;
  isAdmin: boolean;
  onDelete?: (id: string) => Promise<void>;
  deleting: boolean;
  onClose: () => void;
}) {
  const canIframePreview = document.mimeType.startsWith('image/') || document.mimeType.includes('pdf');
  const typeClass =
    document.displayType === 'PDF'
      ? 'bg-red-100 text-red-700'
      : document.displayType === 'Image'
      ? 'bg-violet-100 text-violet-700'
      : 'bg-slate-100 text-slate-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-semibold text-slate-900">Document Preview</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <FiFileText className="size-5" />
                </span>
                <div>
                  <p className="text-xl font-semibold text-slate-900">{document.originalName}</p>
                  <p className="text-sm text-slate-500">{formatBytes(document.sizeBytes)}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass}`}>{document.displayType}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <MetaItem label="Category" value={titleCase(document.category)} />
              <MetaItem label="Module" value={titleCase(document.module)} />
              <MetaItem label="Uploaded By" value={document.uploadedBy?.fullName || document.uploadedBy?.email || '—'} />
              <MetaItem label="Upload Date" value={formatDate(document.createdAt)} />
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-slate-500">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {document.tags.length > 0 ? (
                  document.tags.map((tag) => (
                    <span key={tag} className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
            {canIframePreview ? (
              <iframe title="Document preview" src={document.fileUrl} className="h-[46vh] w-full rounded border border-slate-200 bg-white" />
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-center text-slate-500">
                <FiFileMinus className="size-11 text-slate-400" />
                <div>
                  <p className="text-base font-medium">Document preview not available</p>
                  <p className="text-sm">You can still download this file.</p>
                </div>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full max-w-md items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{document.originalName}</p>
                    <p className="text-xs text-slate-500">{formatBytes(document.sizeBytes)}</p>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">
                    <FiDownload className="size-4" />
                  </span>
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a href={document.fileUrl} target="_blank" rel="noreferrer" className="w-full">
              <Button className="w-full">
                <FiDownload className="mr-1 inline size-4" />
                Download
              </Button>
            </a>
            {isAdmin ? (
              <Button
                className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleting}
                onClick={async () => {
                  if (!onDelete) return;
                  try {
                    await onDelete(document._id);
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                <FiTrash2 className="mr-1 inline size-4" />
                Delete
              </Button>
            ) : (
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
