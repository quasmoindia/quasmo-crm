import type { Customer } from './customer';
import type { Courier } from './courier';
import type { AuthUser as User } from './auth';
import type { Product } from './product';

export type OrderStatus = 'order_process' | 'ready' | 'packing' | 'dispatch';

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'order_process', label: 'Order Process' },
  { value: 'ready', label: 'Ready (QC Passed)' },
  { value: 'packing', label: 'Packing' },
  { value: 'dispatch', label: 'Dispatched' },
];

export interface OrderItem {
  product: Product; // populated
  quantity: number;
  notes?: string;
}

/** Stored when user generates a shipping label (editable ship-to + count; lines from order at save time). */
export interface ShippingLabelSnapshot {
  shipToName: string;
  shipToPhone: string;
  shipToAddress: string;
  labelCount: number;
  packageLines: { quantity: number; productName: string; productCode?: string }[];
  savedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: Customer; // populated
  items: OrderItem[];
  specificationNotes?: string;
  packingInstructions?: string;
  status: OrderStatus;
  
  qualityCheckNotes?: string;
  
  courier?: Courier; // populated
  trackingNumber?: string;
  dispatchDate?: string;
  
  documents: string[];

  shippingLabelSnapshot?: ShippingLabelSnapshot;

  createdBy: User; // populated
  statusUpdatedBy?: User; // populated
  statusUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveShippingLabelPayload {
  shipToName: string;
  shipToPhone: string;
  shipToAddress: string;
  labelCount: number;
}

export interface CreateOrderPayload {
  customer: string;
  specificationNotes?: string;
  packingInstructions?: string;
  items: {
    product: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface UpdateOrderPayload {
  customer: string;
  specificationNotes?: string;
  packingInstructions?: string;
  items: {
    product: string;
    quantity: number;
    notes?: string;
  }[];
}
