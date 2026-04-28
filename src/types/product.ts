export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type ProductUnit = 'Nos' | 'Pcs' | 'Kg' | 'Ltr' | 'Mtr' | 'Box' | 'Set' | 'Pair';

export interface ProductVariant {
  attribute: string;
  value: string;
  additionalPrice: number;
}

export interface ProductCategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  parent?: ProductCategoryRef | string | null;
  description?: string;
  isActive: boolean;
  children?: ProductCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductUser {
  _id: string;
  fullName: string;
  email: string;
}

export interface Product {
  _id: string;
  productName: string;
  productCode: string;
  category: ProductCategoryRef | string;
  subCategory?: ProductCategoryRef | string | null;
  hsnCode: string;
  manufacturer?: string;
  brand?: string;
  modelNumber?: string;
  description?: string;
  status: ProductStatus;
  unit: ProductUnit;
  basePrice: number;
  sellingPrice: number;
  minimumPrice: number;
  gstRate: number;
  reorderLevel: number;
  maxStock: number;
  currentStock: number;
  warrantyMonths: number;
  variants: ProductVariant[];
  images: string[];
  createdBy?: ProductUser | string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  totalCategories: number;
}

export interface CreateProductPayload {
  productName: string;
  productCode: string;
  category: string;
  subCategory?: string | null;
  hsnCode: string;
  manufacturer?: string;
  brand?: string;
  modelNumber?: string;
  description?: string;
  status?: ProductStatus;
  unit?: ProductUnit;
  basePrice: number;
  sellingPrice: number;
  minimumPrice?: number;
  gstRate: number;
  reorderLevel?: number;
  maxStock?: number;
  currentStock?: number;
  warrantyMonths?: number;
  variants?: ProductVariant[];
  images?: string[];
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

export interface BulkProductStockUpdateItem {
  productId: string;
  currentStock: number;
}

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
];

export const UNIT_OPTIONS: { value: ProductUnit; label: string }[] = [
  { value: 'Nos', label: 'Nos' },
  { value: 'Pcs', label: 'Pcs' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Ltr', label: 'Ltr' },
  { value: 'Mtr', label: 'Mtr' },
  { value: 'Box', label: 'Box' },
  { value: 'Set', label: 'Set' },
  { value: 'Pair', label: 'Pair' },
];

export const GST_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];
