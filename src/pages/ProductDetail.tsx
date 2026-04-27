import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiDownload, FiPlus, FiPackage } from 'react-icons/fi';
import { Button } from '../components/Button';
import { useProduct } from '../api/products';
import type { ProductStatus } from '../types/product';

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    discontinued: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id ?? null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (isLoading) {
    return <div className="py-20 text-center text-slate-500">Loading product data...</div>;
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/dashboard/products')}>
          Go back to catalog
        </Button>
      </div>
    );
  }

  const categoryName = typeof product.category === 'object' ? product.category.name : String(product.category);
  const subCategoryName = product.subCategory
    ? typeof product.subCategory === 'object'
      ? product.subCategory.name
      : String(product.subCategory)
    : '—';

  // Calculations
  const costPrice = product.basePrice || 0;
  const sellPrice = product.sellingPrice || 0;
  const marginPercentage = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0;
  const marginValue = sellPrice - costPrice;
  const finalPrice = sellPrice * (1 + (product.gstRate || 0) / 100);
  const mrp = product.minimumPrice || (sellPrice * 1.2); // use minimum price as MRP if available

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button type="button" onClick={() => navigate('/dashboard/products')} className="hover:text-indigo-600">Products</button>
            <span>›</span>
            <span className="text-slate-700">{product.productCode}</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">{product.productName}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/products')}>
            <FiArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={() => navigate(`/dashboard/products/${product._id}/edit`)}>
            <FiEdit2 className="size-4" />
            Edit Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Spans 4) */}
        <div className="flex flex-col gap-6 lg:col-span-4 lg:col-start-1">
          {/* Images Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Product Images</h2>
            {product.images && product.images.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  <img
                    src={product.images[selectedImageIndex] || product.images[0]}
                    alt="Main Product"
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative overflow-hidden rounded-lg border-2 ${
                        selectedImageIndex === i ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${i}`} className="size-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                No images available
              </div>
            )}
          </div>

          {/* Documents Card (Placeholder UI matching screenshot) */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Documents</h2>
              <button className="text-indigo-600 hover:text-indigo-800">
                <FiPlus className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">User Manual.pdf</p>
                    <p className="text-xs text-slate-400">2.4 MB</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <FiDownload className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Calibration Certificate.pdf</p>
                    <p className="text-xs text-slate-400">856 KB</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <FiDownload className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Specifications Sheet.pdf</p>
                    <p className="text-xs text-slate-400">1.2 MB</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <FiDownload className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Spans 8) */}
        <div className="flex flex-col gap-6 lg:col-span-8 lg:col-start-5">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <FiPackage className="text-indigo-500" /> Stock
              </div>
              <p className="text-2xl font-bold text-slate-800">{product.currentStock}</p>
              <div className="mt-2">
                {product.currentStock > product.reorderLevel ? (
                  <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">In Stock</span>
                ) : (
                  <span className="inline-flex rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Low Stock</span>
                )}
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <span className="text-emerald-500 font-bold">$</span> Selling Price
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(sellPrice)}</p>
              <p className="mt-2 text-xs text-slate-500">+{product.gstRate}% GST</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <svg className="size-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                 Margin
              </div>
              <p className="text-2xl font-bold text-slate-800">{marginPercentage.toFixed(0)}%</p>
              <p className="mt-2 text-xs text-slate-500">{formatCurrency(marginValue)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <svg className="size-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Location
              </div>
              <p className="text-sm font-bold text-slate-800">Main Warehouse</p>
              <p className="mt-2 text-xs text-slate-500">Rack A-12</p>
            </div>
          </div>

          {/* Product Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Product Information</h2>
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="mt-1 font-medium text-slate-800">{categoryName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p className="mt-1 font-medium text-slate-800">{subCategoryName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Description</p>
                <p className="mt-1 text-sm text-slate-800 leading-relaxed">
                  {product.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          {product.variants && product.variants.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-800">Technical Specifications</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {product.variants.map((variant, i) => (
                  <div key={i}>
                    <p className="text-sm text-slate-500">{variant.attribute}</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{variant.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Pricing Details</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">Cost Price</span>
                <span className="font-semibold text-slate-800">{formatCurrency(costPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">Selling Price</span>
                <span className="font-semibold text-slate-800">{formatCurrency(sellPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">MRP</span>
                <span className="font-semibold text-slate-800">{formatCurrency(mrp)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-slate-500">GST Rate</span>
                <span className="font-semibold text-slate-800">{product.gstRate}%</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-medium text-slate-800">Final Price (incl. GST)</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(finalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Inventory Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Inventory Details</h2>
            <div className="grid grid-cols-2 gap-y-6 text-sm">
              <div>
                <p className="text-slate-500">Current Stock</p>
                <p className="mt-1 font-semibold text-slate-800">{product.currentStock} {product.unit}</p>
              </div>
              <div>
                <p className="text-slate-500">Reorder Level</p>
                <p className="mt-1 font-medium text-slate-800">{product.reorderLevel} {product.unit}</p>
              </div>
              <div>
                <p className="text-slate-500">Warehouse</p>
                <p className="mt-1 font-medium text-slate-800">Main Warehouse</p>
              </div>
              <div>
                <p className="text-slate-500">Location</p>
                <p className="mt-1 font-medium text-slate-800">Rack A-12</p>
              </div>
            </div>
          </div>

          {/* Product Metadata */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Product Metadata</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-2">Status</p>
                <StatusBadge status={product.status} />
              </div>
              <div>
                <p className="text-slate-500">Created</p>
                <p className="mt-1 font-medium text-slate-800">
                  {new Date(product.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p className="mt-1 font-medium text-slate-800">
                  {new Date(product.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
