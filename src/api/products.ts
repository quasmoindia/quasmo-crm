import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import type {
  Product,
  ProductsListResponse,
  ProductAnalytics,
  CreateProductPayload,
  UpdateProductPayload,
  BulkProductStockUpdateItem,
  ProductCategory,
  ProductStatus,
} from '../types/product';

const PRODUCTS_BASE = '/products';

export const productsQueryKey = ['products'];
export const categoriesQueryKey = ['product-categories'];

// ── Product API calls ──

export function listProductsApi(params: {
  status?: ProductStatus;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.category) search.set('category', params.category);
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const q = search.toString();
  return get<ProductsListResponse>(q ? `${PRODUCTS_BASE}?${q}` : PRODUCTS_BASE);
}

export function getProductAnalyticsApi() {
  return get<ProductAnalytics>(`${PRODUCTS_BASE}/analytics`);
}

export function getProductApi(id: string) {
  return get<Product>(`${PRODUCTS_BASE}/${id}`);
}

export function createProductApi(payload: CreateProductPayload) {
  return post<Product>(PRODUCTS_BASE, payload);
}

export function updateProductApi(id: string, payload: UpdateProductPayload) {
  return patch<Product>(`${PRODUCTS_BASE}/${id}`, payload);
}

export function deleteProductApi(id: string) {
  return del<unknown>(`${PRODUCTS_BASE}/${id}`);
}

export function bulkUpdateProductStockApi(updates: BulkProductStockUpdateItem[]) {
  return patch<{ message: string; updated: number }>(`${PRODUCTS_BASE}/stock/bulk`, { updates });
}

export async function uploadProductImagesApi(
  id: string,
  files: File[]
): Promise<{ uploaded: number; failed: number; urls: string[]; errors: string[] }> {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = `${PRODUCTS_BASE.replace(/^\//, '')}/${id}/images`;
  const url = `${base}/${path}`;
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Upload failed');
  return data as { uploaded: number; failed: number; urls: string[]; errors: string[] };
}

// ── Category API calls ──

export function listCategoriesApi(parent?: string | null) {
  const params = new URLSearchParams();
  if (parent !== undefined && parent !== null) params.set('parent', parent);
  const q = params.toString();
  return get<{ data: ProductCategory[] }>(
    q ? `${PRODUCTS_BASE}/categories?${q}` : `${PRODUCTS_BASE}/categories`
  );
}

export function getCategoryTreeApi() {
  return get<{ data: (ProductCategory & { children: ProductCategory[] })[] }>(
    `${PRODUCTS_BASE}/categories/tree`
  );
}

export function createCategoryApi(payload: { name: string; parent?: string | null; description?: string }) {
  return post<ProductCategory>(`${PRODUCTS_BASE}/categories`, payload);
}

// ── React Query hooks ──

export function useProductsList(params: {
  status?: ProductStatus;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...productsQueryKey, 'list', params],
    queryFn: () => listProductsApi(params),
  });
}

export function useProductAnalytics() {
  return useQuery({
    queryKey: [...productsQueryKey, 'analytics'],
    queryFn: getProductAnalyticsApi,
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: [...productsQueryKey, 'detail', id],
    queryFn: () => getProductApi(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProductApi(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: [...productsQueryKey, 'detail', id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });
}

export function useBulkUpdateProductStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateProductStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });
}

export function useUploadProductImages(productId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadProductImagesApi(productId!, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      if (productId)
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, 'detail', productId] });
    },
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: [...categoriesQueryKey, 'tree'],
    queryFn: getCategoryTreeApi,
  });
}

export function useSubCategories(parentId: string | null) {
  return useQuery({
    queryKey: [...categoriesQueryKey, 'children', parentId],
    queryFn: () => listCategoriesApi(parentId!),
    enabled: !!parentId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}
