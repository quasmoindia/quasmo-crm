import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiPackage } from 'react-icons/fi';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import {
  useCreateProduct,
  useCategoryTree,
  useSubCategories,
  useCreateCategory,
} from '../api/products';
import type {
  ProductStatus,
  ProductUnit,
  ProductVariant,
} from '../types/product';
import {
  STATUS_OPTIONS,
  UNIT_OPTIONS,
  GST_RATE_OPTIONS,
} from '../types/product';

export function AddProduct() {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const createCategoryMutation = useCreateCategory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus>('active');

  // Pricing
  const [unit, setUnit] = useState<ProductUnit>('Nos');
  const [basePrice, setBasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [minimumPrice, setMinimumPrice] = useState('0');
  const [gstRate, setGstRate] = useState('18');

  // Inventory
  const [reorderLevel, setReorderLevel] = useState('10');
  const [maxStock, setMaxStock] = useState('100');
  const [currentStock, setCurrentStock] = useState('0');
  const [warrantyMonths, setWarrantyMonths] = useState('12');

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Images (files to upload after product creation)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // New category dialog
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── Fetched data ──
  const { data: categoryTree } = useCategoryTree();
  const rootCategories = categoryTree?.data ?? [];
  const { data: subCatsData } = useSubCategories(categoryId || null);
  const subCategories = subCatsData?.data ?? [];

  // ── Handlers ──
  function addVariant() {
    setVariants([...variants, { attribute: '', value: '', additionalPrice: 0 }]);
  }

  function updateVariant(index: number, field: keyof ProductVariant, val: string | number) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const newFiles = Array.from(files).slice(0, 10 - imageFiles.length);
    setImageFiles((prev) => [...prev, ...newFiles]);
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const result = await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        parent: newCategoryParent,
      });
      if (newCategoryParent) {
        setSubCategoryId(result._id);
      } else {
        setCategoryId(result._id);
      }
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategoryParent(null);
    } catch {
      // error shown via mutation
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) { setError('Product name is required'); return; }
    if (!productCode.trim()) { setError('Product code is required'); return; }
    if (!categoryId) { setError('Category is required'); return; }
    if (!hsnCode.trim()) { setError('HSN Code is required'); return; }

    try {
      const product = await createMutation.mutateAsync({
        productName: productName.trim(),
        productCode: productCode.trim(),
        category: categoryId,
        subCategory: subCategoryId || null,
        hsnCode: hsnCode.trim(),
        manufacturer: manufacturer.trim() || undefined,
        brand: brand.trim() || undefined,
        modelNumber: modelNumber.trim() || undefined,
        description: description.trim() || undefined,
        status,
        unit,
        basePrice: parseFloat(basePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        minimumPrice: parseFloat(minimumPrice) || 0,
        gstRate: parseFloat(gstRate) || 18,
        reorderLevel: parseInt(reorderLevel, 10) || 10,
        maxStock: parseInt(maxStock, 10) || 100,
        currentStock: parseInt(currentStock, 10) || 0,
        warrantyMonths: parseInt(warrantyMonths, 10) || 12,
        variants: variants.filter((v) => v.attribute.trim() && v.value.trim()),
      });

      // Upload images if any
      if (imageFiles.length > 0 && product._id) {
        const { uploadProductImagesApi } = await import('../api/products');
        await uploadProductImagesApi(product._id, imageFiles);
      }

      navigate('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    }
  }

  const isSubmitting = createMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className="flex items-center gap-1 hover:text-indigo-600"
            >
              Products
            </button>
            <span>›</span>
            <span className="text-slate-700">New</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">Add New Product</h1>
          <p className="mt-1 text-sm text-slate-500">Complete product information</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/products')}>
          <FiArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* ── Basic Information ── */}
        <Card>
          <h2 className="mb-5 text-lg font-semibold text-slate-800">Basic Information</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Product Name *"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Binocular Microscope BM-200"
              disabled={isSubmitting}
              required
            />
            <Input
              label="Product Code *"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="e.g. PROD-BM-200"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Category */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Category *</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryParent(null);
                    setNewCategoryName('');
                    setShowNewCategory(true);
                  }}
                  className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <FiPlus className="size-3" />
                  New
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubCategoryId('');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSubmitting}
                required
              >
                <option value="">Select Category</option>
                {rootCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Sub-Category */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Sub-Category</label>
                {categoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategoryParent(categoryId);
                      setNewCategoryName('');
                      setShowNewCategory(true);
                    }}
                    className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <FiPlus className="size-3" />
                    New
                  </button>
                )}
              </div>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSubmitting || !categoryId}
              >
                <option value="">None</option>
                {subCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* HSN Code */}
            <Input
              label="HSN Code *"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="e.g. 8413"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Input
              label="Manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Manufacturer name"
              disabled={isSubmitting}
            />
            <Input
              label="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand name"
              disabled={isSubmitting}
            />
            <Input
              label="Model Number"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              placeholder="Model number"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description"
                rows={3}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ── Pricing & Tax ── */}
        <Card>
          <h2 className="mb-5 text-lg font-semibold text-slate-800">Pricing & Tax</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Base Price *"
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              min="0"
              step="0.01"
              disabled={isSubmitting}
              required
            />
            <Input
              label="Selling Price *"
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              min="0"
              step="0.01"
              disabled={isSubmitting}
              required
            />
            <Input
              label="Minimum Price"
              type="number"
              value={minimumPrice}
              onChange={(e) => setMinimumPrice(e.target.value)}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST Rate *</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {GST_RATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Reorder Level"
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              min="0"
              disabled={isSubmitting}
            />
            <Input
              label="Max Stock"
              type="number"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              min="0"
              disabled={isSubmitting}
            />
            <Input
              label="Current Stock"
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              min="0"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Warranty (Months)"
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
              min="0"
              disabled={isSubmitting}
            />
          </div>
        </Card>

        {/* ── Product Variants ── */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Product Variants</h2>
            <Button type="button" variant="outline" onClick={addVariant} disabled={isSubmitting}>
              <FiPlus className="size-4" />
              Add Variant
            </Button>
          </div>
          {variants.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No variants added yet. Click "Add Variant" to add one.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {variants.map((v, i) => (
                <div key={i} className="flex items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Attribute</label>
                    <input
                      type="text"
                      value={v.attribute}
                      onChange={(e) => updateVariant(i, 'attribute', e.target.value)}
                      placeholder="e.g. Magnification"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Value</label>
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateVariant(i, 'value', e.target.value)}
                      placeholder="e.g. 1000x"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Extra Price</label>
                    <input
                      type="number"
                      value={v.additionalPrice}
                      onChange={(e) => updateVariant(i, 'additionalPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="mb-0.5 rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                    title="Remove variant"
                    disabled={isSubmitting}
                  >
                    <FiTrash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Product Images ── */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Product Images</h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
          >
            <FiUpload className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Click to upload product images</p>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG up to 5MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {imagePreviews.map((url, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border border-slate-200">
                  <img src={url} alt={`Preview ${i + 1}`} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove"
                  >
                    <FiTrash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            <FiPackage className="size-4" />
            Create Product
          </Button>
        </div>
      </form>

      {/* ── New Category Modal ── */}
      {showNewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">
              {newCategoryParent ? 'Add Sub-Category' : 'Add Category'}
            </h3>
            <div className="mt-4">
              <Input
                label="Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={newCategoryParent ? 'Sub-category name' : 'Category name'}
                disabled={createCategoryMutation.isPending}
              />
            </div>
            {createCategoryMutation.isError && (
              <p className="mt-2 text-sm text-red-600">
                {(createCategoryMutation.error as Error).message}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                loading={createCategoryMutation.isPending}
                disabled={!newCategoryName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
