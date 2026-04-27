import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEye, FiEdit2, FiTrash2, FiSearch, FiPackage, FiAlertTriangle, FiLayers } from 'react-icons/fi';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  useProductsList,
  useProductAnalytics,
  useDeleteProduct,
  useCategoryTree,
  useBulkUpdateProductStock,
} from '../api/products';
import type { Product, ProductStatus } from '../types/product';
import { STATUS_OPTIONS } from '../types/product';

const DEBOUNCE_MS = 300;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function categoryName(product: Product): string {
  if (typeof product.category === 'object' && product.category?.name) return product.category.name;
  return '—';
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    discontinued: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AnalyticsCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md ${color}`}
    >
      <div className="rounded-lg bg-white/80 p-2.5 shadow-sm">{icon}</div>
      <div>
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export function ProductList() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: analyticsData } = useProductAnalytics();
  const { data: categoryTree } = useCategoryTree();
  const categories = categoryTree?.data ?? [];
  const { data, isLoading } = useProductsList({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
    page,
    limit: 12,
  });
  const deleteMutation = useDeleteProduct();
  const bulkUpdateStockMutation = useBulkUpdateProductStock();
  const products = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">Manage products and services</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowBulkStockModal(true)}>
            <FiLayers className="size-4" aria-hidden />
            Bulk Update Stock
          </Button>
          <Button onClick={() => navigate('/dashboard/products/new')}>
            <FiPlus className="size-4" aria-hidden />
            Add Product
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analyticsData && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsCard
            label="Total Products"
            value={analyticsData.totalProducts}
            color="border-indigo-200 bg-indigo-50 text-indigo-900"
            icon={<FiPackage className="size-5 text-indigo-600" />}
          />
          <AnalyticsCard
            label="Active"
            value={analyticsData.activeProducts}
            color="border-emerald-200 bg-emerald-50 text-emerald-900"
            icon={
              <svg className="size-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <AnalyticsCard
            label="Low Stock Items"
            value={analyticsData.lowStockItems}
            color="border-red-200 bg-red-50 text-red-900"
            icon={<FiAlertTriangle className="size-5 text-red-600" />}
          />
          <AnalyticsCard
            label="Categories"
            value={analyticsData.totalCategories}
            color="border-amber-200 bg-amber-50 text-amber-900"
            icon={
              <svg className="size-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter((e.target.value || '') as ProductStatus | '');
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
        </div>
      </Card>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="mx-auto size-8 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">Loading products...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20">
          <FiPackage className="size-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-500">No products found</p>
          <p className="mt-1 text-sm text-slate-400">Create your first product to get started</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard/products/new')}>
            <FiPlus className="size-4" aria-hidden />
            Add Product
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div
                key={product._id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-linear-to-br from-slate-100 to-slate-50">
                  {product.images?.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.productName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FiPackage className="size-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <StatusBadge status={product.status} />
                  </div>
                  {product.currentStock <= product.reorderLevel && product.status === 'active' && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                      Low stock! Min: {product.reorderLevel}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-slate-800 line-clamp-1">{product.productName}</h3>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {product.productCode}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Category</p>
                      <p className="font-medium text-slate-700">{categoryName(product)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">HSN Code</p>
                      <p className="font-medium text-slate-700">{product.hsnCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Price</p>
                      <p className="font-semibold text-indigo-600">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Stock</p>
                      <p className={`font-semibold ${product.currentStock <= product.reorderLevel ? 'text-red-600' : 'text-emerald-600'}`}>
                        {product.currentStock} {product.unit}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/products/${product._id}`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiEye className="size-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/products/${product._id}/edit`)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                      title="Edit"
                    >
                      <FiEdit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(product)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <FiTrash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Delete product?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong>{deleteTarget.productName}</strong>? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600! hover:bg-red-700!"
                loading={deleteMutation.isPending}
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget._id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBulkStockModal && (
        <BulkStockUpdateModal
          onClose={() => setShowBulkStockModal(false)}
          onSave={async (updates) => {
            await bulkUpdateStockMutation.mutateAsync(updates);
            setShowBulkStockModal(false);
          }}
          isSaving={bulkUpdateStockMutation.isPending}
        />
      )}
    </div>
  );
}

function BulkStockUpdateModal({
  onClose,
  onSave,
  isSaving,
}: {
  onClose: () => void;
  onSave: (updates: Array<{ productId: string; currentStock: number }>) => Promise<void>;
  isSaving: boolean;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const { data, isLoading } = useProductsList({
    search: searchQuery || undefined,
    page: 1,
    limit: 500,
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setDraftStock((prev) => {
      const next = { ...prev };
      rows.forEach((product) => {
        if (next[product._id] === undefined) next[product._id] = String(product.currentStock ?? 0);
      });
      return next;
    });
  }, [rows]);

  const changedCount = rows.filter((product) => {
    const currentDraft = draftStock[product._id];
    if (currentDraft === undefined) return false;
    const parsed = Number(currentDraft);
    return Number.isFinite(parsed) && parsed >= 0 && parsed !== (product.currentStock ?? 0);
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Bulk Update Product Stock</h3>
              <p className="text-sm text-slate-500">Update stock for multiple products in one action.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Search products</label>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, code, brand..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-slate-500">Loading products...</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No products found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Current</th>
                    <th className="px-4 py-3 font-medium">New Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => (
                    <tr key={product._id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{product.productName}</p>
                        {product.brand && <p className="text-xs text-slate-500">{product.brand}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{product.productCode}</td>
                      <td className="px-4 py-3 text-slate-700">{categoryName(product)}</td>
                      <td className="px-4 py-3 text-slate-700">{product.currentStock}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={draftStock[product._id] ?? ''}
                          onChange={(e) =>
                            setDraftStock((prev) => ({
                              ...prev,
                              [product._id]: e.target.value,
                            }))
                          }
                          className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{changedCount} product(s) changed</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                loading={isSaving}
                disabled={changedCount === 0}
                onClick={async () => {
                  const updates = rows
                    .map((product) => ({
                      productId: product._id,
                      currentStock: Number(draftStock[product._id]),
                      existing: product.currentStock ?? 0,
                    }))
                    .filter((entry) => Number.isFinite(entry.currentStock) && entry.currentStock >= 0 && entry.currentStock !== entry.existing)
                    .map(({ productId, currentStock }) => ({ productId, currentStock }));

                  if (updates.length === 0) return;
                  try {
                    await onSave(updates);
                  } catch (err) {
                    alert((err as Error).message);
                  }
                }}
              >
                Save Stock Updates
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
