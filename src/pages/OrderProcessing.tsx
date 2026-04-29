import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiFileText, FiUpload, FiDownload, FiList, FiGrid, FiSearch, FiEye, FiArrowRightCircle } from 'react-icons/fi';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useOrdersList, useUpdateOrder, useUpdateOrderStatus, useDeleteOrder, uploadOrderDocumentsApi } from '../api/orders';
import { useCurrentUser } from '../api/auth';
import { useCustomersList } from '../api/customers';
import { useProductsList } from '../api/products';
import { useCouriersList, useCreateCourier } from '../api/couriers';
import { ORDER_STATUS_OPTIONS, type Order, type OrderStatus } from '../types/order';

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; color: string }> = {
    order_process: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
    ready: { label: 'Ready (QC)', color: 'bg-indigo-100 text-indigo-700' },
    packing: { label: 'Packing', color: 'bg-amber-100 text-amber-700' },
    dispatch: { label: 'Dispatched', color: 'bg-emerald-100 text-emerald-700' },
  };
  const { label, color } = map[status] || map.order_process;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type ViewMode = 'list' | 'kanban';

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  order_process: 'bg-sky-50 border-sky-200',
  ready: 'bg-indigo-50 border-indigo-200',
  packing: 'bg-amber-50 border-amber-200',
  dispatch: 'bg-emerald-50 border-emerald-200',
};

function statusLabel(status: OrderStatus) {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusRank(status: OrderStatus) {
  const ranks: Record<OrderStatus, number> = {
    order_process: 1,
    ready: 2,
    packing: 3,
    dispatch: 4,
  };
  return ranks[status];
}

function OrderDetailsModal({
  order,
  onGenerateLabel,
  onClose,
}: {
  order: Order;
  onGenerateLabel: (order: Order) => void;
  onClose: () => void;
}) {
  const updateOrderMutation = useUpdateOrder();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const createCourierMutation = useCreateCourier();
  const { data: couriersData, refetch: refetchCouriers } = useCouriersList();
  const { data: customersData } = useCustomersList({ limit: 200 });
  const { data: productsData } = useProductsList({ limit: 200, page: 1 });
  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const [customerId, setCustomerId] = useState(order.customer?._id ?? '');
  const [specificationNotes, setSpecificationNotes] = useState(order.specificationNotes ?? '');
  const [packingInstructions, setPackingInstructions] = useState(order.packingInstructions ?? '');
  const [qualityCheckNotes, setQualityCheckNotes] = useState(order.qualityCheckNotes ?? '');
  const [courierName, setCourierName] = useState(order.courier?.name ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '');
  const [dispatchDate, setDispatchDate] = useState(order.dispatchDate ? new Date(order.dispatchDate).toISOString().slice(0, 10) : '');
  const [items, setItems] = useState<Array<{ product: string; quantity: number; notes: string }>>(
    order.items.map((item) => ({
      product: item.product?._id,
      quantity: item.quantity,
      notes: item.notes ?? '',
    }))
  );

  const findCourierIdByName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return undefined;
    return couriersData?.data?.find((courier) => courier.name.trim().toLowerCase() === normalized)?._id;
  };
  const courierNameSuggestions = Array.from(
    new Set((couriersData?.data ?? []).map((courier) => courier.name.trim()).filter(Boolean))
  );

  const updateItem = (index: number, field: 'product' | 'quantity' | 'notes', value: string | number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items
      .filter((item) => item.product && item.quantity > 0)
      .map((item) => ({
        ...item,
        notes: item.notes.trim() || undefined,
      }));
    if (!customerId) return alert('Please select customer');
    if (validItems.length === 0) return alert('Please keep at least one valid item');

    try {
      let courierId: string | undefined;
      const normalizedCourierName = courierName.trim();
      if (normalizedCourierName) {
        const normalizedCurrentCourierName = order.courier?.name?.trim().toLowerCase();
        if (normalizedCurrentCourierName === normalizedCourierName.toLowerCase() && order.courier?._id) {
          courierId = order.courier._id;
        } else {
          courierId = findCourierIdByName(normalizedCourierName);
          if (!courierId) {
            try {
              const createdCourier = await createCourierMutation.mutateAsync({ name: normalizedCourierName });
              courierId = createdCourier._id;
            } catch (error) {
              const message = (error as Error).message;
              if (!message.includes('already exists')) throw error;
              const latest = await refetchCouriers();
              const matchedCourier = latest.data?.data?.find(
                (courier) => courier.name.trim().toLowerCase() === normalizedCourierName.toLowerCase()
              );
              if (!matchedCourier?._id) throw error;
              courierId = matchedCourier._id;
            }
          }
        }
      }

      await updateOrderMutation.mutateAsync({
        id: order._id,
        payload: {
          customer: customerId,
          items: validItems,
          specificationNotes: specificationNotes.trim() || undefined,
          packingInstructions: packingInstructions.trim() || undefined,
        },
      });

      await updateOrderStatusMutation.mutateAsync({
        id: order._id,
        payload: {
          qualityCheckNotes: qualityCheckNotes.trim() || undefined,
          courier: normalizedCourierName ? courierId : '',
          trackingNumber: trackingNumber.trim() || undefined,
          dispatchDate: dispatchDate || undefined,
        },
      });

      setMode('view');
      onClose();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const reachedReady = statusRank(order.status) >= statusRank('ready');
  const reachedPacking = statusRank(order.status) >= statusRank('packing');
  const reachedDispatch = statusRank(order.status) >= statusRank('dispatch');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Order details</h2>
              <p className="text-sm text-slate-500">
                {order.orderNumber} · {statusLabel(order.status)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'view' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'edit' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  Edit
                </button>
              </div>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>

        {mode === 'view' ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1"><StatusBadge status={order.status} /></p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(order.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Updated</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(order.updatedAt)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Latest Status Update</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><span className="font-medium">Current Status:</span> {statusLabel(order.status)}</p>
                <p><span className="font-medium">Updated By:</span> {order.statusUpdatedBy?.fullName || order.createdBy?.fullName || '—'}</p>
                <p><span className="font-medium">Updated At:</span> {order.statusUpdatedAt ? formatDate(order.statusUpdatedAt) : formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Customer</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><span className="font-medium">Name:</span> {order.customer?.name || '—'}</p>
                <p><span className="font-medium">Phone:</span> {order.customer?.phone || '—'}</p>
                <p><span className="font-medium">Email:</span> {order.customer?.email || '—'}</p>
                <p><span className="font-medium">Company:</span> {order.customer?.company || '—'}</p>
                <p><span className="font-medium">Address:</span> {order.customer?.address || '—'}</p>
                <p><span className="font-medium">GST:</span> {order.customer?.gstNumber || '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Order Items</h3>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm">
                    <p className="font-medium text-slate-800">{item.product?.productName || 'Unknown product'}</p>
                    <p className="mt-1 text-slate-600">
                      <span className="font-medium text-slate-700">Quantity:</span> {item.quantity}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-700">Product Code:</span> {item.product?.productCode || '—'}
                    </p>
                    <p className="mt-1 text-slate-600">{item.notes?.trim() || 'No item notes'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">General Notes</h3>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Specification Notes</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{order.specificationNotes?.trim() || '—'}</p>
              <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-slate-500">Packing Instructions</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{order.packingInstructions?.trim() || '—'}</p>
            </div>

            {reachedReady && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-indigo-800">Ready / QC Details</h3>
                <p className="text-sm text-slate-700">{order.qualityCheckNotes?.trim() || 'QC notes not provided yet.'}</p>
              </div>
            )}

            {reachedPacking && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-amber-800">Packing Details</h3>
                <p className="text-sm text-slate-700"><span className="font-medium">Packing Instructions:</span> {order.packingInstructions?.trim() || '—'}</p>
              </div>
            )}

            {reachedPacking && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-800">Shipping Label</h3>
                    <p className="mt-1 text-xs text-slate-600">Generate printable labels for packed order items.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => onGenerateLabel(order)}>
                    <FiFileText className="mr-1.5 inline size-4" />
                    Generate Label
                  </Button>
                </div>
              </div>
            )}

            {reachedDispatch && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-emerald-800">Dispatch Details</h3>
                <p className="text-sm text-slate-700"><span className="font-medium">Courier:</span> {order.courier?.name || '—'}</p>
                <p className="text-sm text-slate-700"><span className="font-medium">Tracking Number:</span> {order.trackingNumber || '—'}</p>
                <p className="mb-2 text-sm text-slate-700"><span className="font-medium">Dispatch Date:</span> {order.dispatchDate ? formatDate(order.dispatchDate) : '—'}</p>
                {order.documents?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {order.documents.map((url, idx) => (
                      <a
                        key={`${url}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        <FiDownload className="size-3.5" />
                        Document {idx + 1}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">No dispatch documents uploaded.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} {customer.company ? `(${customer.company})` : ''} {customer.phone ? `- ${customer.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Items</h3>
                  <Button type="button" variant="outline" onClick={() => setItems((prev) => [...prev, { product: '', quantity: 1, notes: '' }])}>
                    Add item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={`${index}-${item.product}`} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-7">
                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-slate-600">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                          required
                        >
                          <option value="">Select product...</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.productCode} - {product.productName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-1">
                        <Input
                          label="Qty"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value || '0', 10))}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">Product Notes</label>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          rows={2}
                          placeholder="Per-product notes..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-end sm:col-span-7">
                        <Button type="button" variant="outline" onClick={() => removeItem(index)} disabled={items.length === 1}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Specification Notes</label>
                <textarea
                  value={specificationNotes}
                  onChange={(e) => setSpecificationNotes(e.target.value)}
                  rows={4}
                  placeholder="Shared notes for this order..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Packing Instructions</label>
                <textarea
                  value={packingInstructions}
                  onChange={(e) => setPackingInstructions(e.target.value)}
                  rows={3}
                  placeholder="Instructions for packing team..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Workflow Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">QC Notes</label>
                    <textarea
                      value={qualityCheckNotes}
                      onChange={(e) => setQualityCheckNotes(e.target.value)}
                      rows={3}
                      placeholder="Quality check observations..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <Input
                    label="Courier Name"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Courier provider name"
                    list="order-details-courier-suggestions"
                  />
                  <datalist id="order-details-courier-suggestions">
                    {courierNameSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <Input
                    label="Tracking Number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="AWB / tracking ID"
                  />
                  <Input
                    label="Dispatch Date"
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('view')}
                  disabled={updateOrderMutation.isPending || updateOrderStatusMutation.isPending || createCourierMutation.isPending}
                >
                  Back to view
                </Button>
                <Button
                  type="submit"
                  loading={updateOrderMutation.isPending || updateOrderStatusMutation.isPending || createCourierMutation.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function statusHelpText(status: OrderStatus) {
  if (status === 'ready') return 'Add QC notes to confirm quality check.';
  if (status === 'packing') return 'Add packing notes for this order.';
  if (status === 'dispatch') return 'Courier is required before dispatch. You can also generate label and upload docs.';
  return 'Order moved to processing.';
}

function StageUpdateModal({
  order,
  targetStatus,
  canDelete,
  onDelete,
  onClose,
}: {
  order: Order;
  targetStatus: OrderStatus;
  canDelete: boolean;
  onDelete: (order: Order) => void;
  onClose: () => void;
}) {
  const updateMutation = useUpdateOrderStatus();
  const createCourierMutation = useCreateCourier();
  const { data: couriersData, refetch: refetchCouriers } = useCouriersList();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qualityCheckNotes, setQualityCheckNotes] = useState(order.qualityCheckNotes ?? '');
  const [packingInstructions, setPackingInstructions] = useState(order.packingInstructions ?? '');
  const [courierName, setCourierName] = useState(order.courier?.name ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '');
  const [dispatchDate, setDispatchDate] = useState(order.dispatchDate ? new Date(order.dispatchDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const findCourierIdByName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return undefined;
    return couriersData?.data?.find((courier) => courier.name.trim().toLowerCase() === normalized)?._id;
  };
  const courierNameSuggestions = Array.from(
    new Set((couriersData?.data ?? []).map((courier) => courier.name.trim()).filter(Boolean))
  );

  const isDispatch = targetStatus === 'dispatch';
  const isReady = targetStatus === 'ready';
  const isPacking = targetStatus === 'packing';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatch && !courierName.trim()) {
      alert('Please enter courier name before dispatch.');
      return;
    }
    try {
      let courierIdForDispatch = order.courier?._id;
      if (isDispatch) {
        const normalizedCourierName = courierName.trim();
        const normalizedCurrentCourierName = order.courier?.name?.trim().toLowerCase();
        if (!courierIdForDispatch || normalizedCurrentCourierName !== normalizedCourierName.toLowerCase()) {
          courierIdForDispatch = findCourierIdByName(normalizedCourierName);
          if (!courierIdForDispatch) {
            try {
              const created = await createCourierMutation.mutateAsync({
                name: normalizedCourierName,
              });
              courierIdForDispatch = created._id;
            } catch (error) {
              const message = (error as Error).message;
              if (!message.includes('already exists')) throw error;
              const latest = await refetchCouriers();
              const matchedCourier = latest.data?.data?.find(
                (courier) => courier.name.trim().toLowerCase() === normalizedCourierName.toLowerCase()
              );
              if (!matchedCourier?._id) throw error;
              courierIdForDispatch = matchedCourier._id;
            }
          }
        }
      }
      if (files.length > 0) {
        setUploadingDocs(true);
        await uploadOrderDocumentsApi(order._id, files);
      }
      await updateMutation.mutateAsync({
        id: order._id,
        payload: {
          status: targetStatus,
          qualityCheckNotes: isReady ? qualityCheckNotes : undefined,
          packingInstructions: isPacking ? packingInstructions : undefined,
          courier: isDispatch ? (courierIdForDispatch || undefined) : undefined,
          trackingNumber: isDispatch ? trackingNumber : undefined,
          dispatchDate: isDispatch ? dispatchDate : undefined,
        },
      });
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploadingDocs(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Move {order.orderNumber} to {statusLabel(targetStatus)}</h2>
        <p className="mt-1 text-sm text-slate-500">{statusHelpText(targetStatus)}</p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm">
          <p className="font-medium text-slate-800">{order.customer?.name || 'Customer not available'}</p>
          <p className="text-slate-600">{order.customer?.company || '—'}</p>
          <p className="text-slate-600">{order.customer?.phone || '—'}</p>
          <p className="mt-1 text-xs text-slate-500">Order: {order.orderNumber} • {order.items.length} item(s)</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {isReady && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">QC Notes</label>
              <textarea
                value={qualityCheckNotes}
                onChange={(e) => setQualityCheckNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Verified optics/mechanics and quality checks."
              />
            </div>
          )}

          {isPacking && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Packing Notes</label>
              <textarea
                value={packingInstructions}
                onChange={(e) => setPackingInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. Fragile handling, foam support, seal with branded tape."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {isDispatch && (
            <>
              <Input
                label="Courier Name *"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                required
                list="stage-courier-suggestions"
              />
              <datalist id="stage-courier-suggestions">
                {courierNameSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <Input label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="AWB123456789" />
              <Input label="Dispatch Date *" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} required />
            </>
          )}

          {isDispatch && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const incoming = Array.from(e.target.files);
                      setFiles((prev) => {
                        const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
                        const existing = new Set(prev.map(key));
                        const merged = [...prev];
                        for (const file of incoming) {
                          if (!existing.has(key(file))) merged.push(file);
                        }
                        return merged;
                      });
                      e.target.value = '';
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FiUpload className="mr-1.5 inline size-4" /> Upload docs
                </Button>
                <span className="text-xs text-slate-500">{files.length > 0 ? `${files.length} file(s) selected` : 'Optional documents before dispatch (you can add multiple files)'}</span>
              </div>
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <span key={`${file.name}-${idx}`} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            {canDelete && (
              <Button type="button" variant="outline" className="mr-auto border-red-200 text-red-700 hover:bg-red-50" onClick={() => onDelete(order)}>
                Delete Order
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending || uploadingDocs}>Cancel</Button>
            <Button type="submit" loading={updateMutation.isPending || uploadingDocs}>
              Confirm move
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderKanbanCard({
  order,
  onView,
  canDelete,
  onDelete,
}: {
  order: Order;
  onView: (order: Order) => void;
  canDelete: boolean;
  onDelete: (order: Order) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order._id,
    data: { order },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow ${isDragging ? 'z-50 opacity-90 shadow-lg' : ''}`}
    >
      <div className="min-w-0 cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800">{order.orderNumber}</p>
            <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="space-y-0.5 text-sm">
          <p className="font-medium text-slate-700">{order.customer?.name}</p>
          {order.customer?.company && <p className="text-xs text-slate-500">{order.customer.company}</p>}
          {order.customer?.phone && <p className="text-xs text-slate-500">{order.customer.phone}</p>}
          <p className="text-xs text-slate-500">{order.items.length} item(s)</p>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2">
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => onView(order)}>
            View details
          </button>
          {canDelete && (
            <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => onDelete(order)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderKanbanColumn({
  status,
  label,
  orders,
  onView,
  canDelete,
  onDelete,
}: {
  status: OrderStatus;
  label: string;
  orders: Order[];
  onView: (order: Order) => void;
  canDelete: boolean;
  onDelete: (order: Order) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[220px] min-w-[300px] max-w-[340px] shrink-0 rounded-xl border-2 p-3 ${ORDER_STATUS_COLORS[status]} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">{orders.length}</span>
      </div>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 text-xs text-slate-500">No orders in this stage.</p>
        ) : (
          orders.map((order) => <OrderKanbanCard key={order._id} order={order} onView={onView} canDelete={canDelete} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}

export function OrderProcessing() {
  const navigate = useNavigate();
  const { data: authData } = useCurrentUser();
  const isAdmin = authData?.user?.role === 'admin';
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const isKanban = viewMode === 'kanban';
  const { data, isLoading, isError, error, refetch } = useOrdersList({
    search: searchQuery,
    status: isKanban ? undefined : (statusFilter || undefined),
    page: isKanban ? 1 : page,
    limit: isKanban ? 500 : 10,
  });

  const [detailModalOrder, setDetailModalOrder] = useState<Order | null>(null);
  const [stageModal, setStageModal] = useState<{ order: Order; targetStatus: OrderStatus } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const deleteOrderMutation = useDeleteOrder();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleGenerateLabel = (order: Order) => {
    const input = window.prompt('How many labels to generate?', '1');
    if (input === null) return;
    const labelCount = Number.parseInt(input, 10);
    if (!Number.isFinite(labelCount) || labelCount <= 0) {
      alert('Please enter a valid number of labels.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to print label.');

    const esc = (v: string) =>
      v
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const itemsHtml = order.items
      .map((i) => `<li>${i.quantity}x ${esc(i.product.productName)}</li>`)
      .join('');

    const website = 'https://www.quasmoindianmicroscope.com/';
    const qrValue = encodeURIComponent(`${website}?order=${encodeURIComponent(order.orderNumber)}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${qrValue}`;

    const labelsHtml = Array.from({ length: labelCount }, (_, idx) => {
      const labelNo = `${idx + 1}/${labelCount}`;
      return `
        <section class="label">
          <header class="top">
            <h1>ORDER: ${esc(order.orderNumber)}</h1>
            <span class="count">Label ${labelNo}</span>
          </header>
          <div class="section">
            <div class="title">Ship To</div>
            <div class="content">
              ${esc(order.customer.name)}<br/>
              Ph: ${esc(order.customer.phone || '—')}<br/>
              Address: ${esc(order.customer.address || '—')}
            </div>
          </div>
          <div class="section">
            <div class="title">Package Contents</div>
            <ul class="items">
              ${itemsHtml}
            </ul>
          </div>
          <div class="footer">
            <img src="${qrUrl}" alt="QR code" class="qr" />
            <div class="company">
              <p class="name">M/s Quality Scientific and Mechanical Works</p>
              <p># 84,HSIDC, Industrial Area, Ambala cantt-133001</p>
              <p>Mob: +91 8926666632</p>
              <p>Toll Free: 1800 419 4979</p>
              <p>Website: ${website}</p>
            </div>
          </div>
        </section>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Label - ${order.orderNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            .sheet {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6mm;
              width: 100%;
              align-content: start;
            }
            .label {
              border: 1.5px solid #000;
              width: 100%;
              min-height: 126mm;
              padding: 3mm;
              border-radius: 2mm;
              break-inside: avoid;
              page-break-inside: avoid;
              overflow: hidden;
            }
            .top { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            h1 { margin: 0; font-size: 22px; }
            .count { font-size: 12px; font-weight: 700; }
            .section { margin-bottom: 10px; }
            .title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #444; margin-bottom: 3px; letter-spacing: 0.04em; }
            .content { font-size: 14px; font-weight: 700; line-height: 1.35; }
            .content.small { font-size: 12px; font-weight: 600; }
            .items { margin: 0; padding-left: 18px; font-size: 13px; font-weight: 700; }
            .footer { margin-top: 10px; border-top: 1px dashed #777; padding-top: 8px; display: flex; gap: 8px; align-items: flex-start; }
            .qr { width: 92px; height: 92px; border: 1px solid #bbb; }
            .company { font-size: 11px; line-height: 1.3; font-weight: 600; }
            .company p { margin: 0 0 2px 0; }
            .company .name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .sheet { gap: 5mm; }
              .label { min-height: 124mm; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${labelsHtml}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const orders = data?.data ?? [];
  const orderById = useMemo(() => new Map(orders.map((o) => [o._id, o])), [orders]);

  const columns = [
    { key: 'orderNo', label: 'Order #', render: (o: Order) => <span className="font-bold text-slate-800">{o.orderNumber}</span> },
    { key: 'customer', label: 'Customer', render: (o: Order) => (
      <div className="max-w-[280px] min-w-0">
        <p className="font-medium text-slate-800">{o.customer?.name}</p>
        {o.customer?.company && <p className="text-xs text-slate-600">{o.customer.company}</p>}
        {o.customer?.phone && <p className="text-xs text-slate-500">Phone: {o.customer.phone}</p>}
        {o.customer?.email && <p className="truncate text-xs text-slate-500">Email: {o.customer.email}</p>}
        {o.customer?.address && <p className="line-clamp-2 text-xs text-slate-500">{o.customer.address}</p>}
      </div>
    )},
    { key: 'items', label: 'Items', render: (o: Order) => (
      <div className="text-sm">
        {o.items.map((i, idx) => (
          <div key={idx} className="line-clamp-1">{i.quantity}x {i.product?.productCode}</div>
        ))}
      </div>
    )},
    { key: 'status', label: 'Status', render: (o: Order) => <StatusBadge status={o.status} /> },
    { key: 'created', label: 'Date', render: (o: Order) => <span className="text-xs text-slate-500">{formatDate(o.createdAt)}</span> },
  ];

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter((e.target.value || '') as OrderStatus | '');
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="order_process">Processing</option>
          <option value="ready">Ready (QC)</option>
          <option value="packing">Packing</option>
          <option value="dispatch">Dispatched</option>
        </select>
      </div>
      <Button variant="outline" onClick={() => setSearchQuery(searchInput)}>
        <FiSearch className="mr-1.5 inline size-4" />
        Search
      </Button>
    </div>
  );

  const totalsByStatus = ORDER_STATUS_OPTIONS.reduce<Record<OrderStatus, number>>(
    (acc, option) => {
      acc[option.value] = orders.filter((order) => order.status === option.value).length;
      return acc;
    },
    { order_process: 0, ready: 0, packing: 0, dispatch: 0 }
  );

  function nextStatusFor(order: Order): OrderStatus | null {
    if (order.status === 'order_process') return 'ready';
    if (order.status === 'ready') return 'packing';
    if (order.status === 'packing') return 'dispatch';
    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id === active.id) return;
    const orderId = String(active.id);
    const order = orderById.get(orderId);
    if (!order) return;
    const targetStatus = String(over.id) as OrderStatus;
    if (!ORDER_STATUS_OPTIONS.some((opt) => opt.value === targetStatus)) return;
    if (order.status === targetStatus) return;
    setStageModal({ order, targetStatus });
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-linear-to-r from-white via-slate-50 to-indigo-50/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
            <p className="mt-1 text-sm text-slate-500">Track every order from QC to dispatch with list or kanban workflow.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setPage(1);
                }}
                title="List view"
                className={`rounded-md p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                aria-pressed={viewMode === 'list'}
              >
                <FiList className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('kanban');
                  setPage(1);
                }}
                title="Kanban view"
                className={`rounded-md p-2 ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                aria-pressed={viewMode === 'kanban'}
              >
                <FiGrid className="size-5" />
              </button>
            </div>
            <Button onClick={() => navigate('/dashboard/orders/new')}>
              <FiPlus className="mr-1.5 inline-block size-4" /> Create Order
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER_STATUS_OPTIONS.map((option) => (
          <Card key={option.value}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{option.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{totalsByStatus[option.value]}</p>
          </Card>
        ))}
      </div>

      <Card>
        {isError ? (
          <p className="py-8 text-center text-red-600">{(error as Error).message}</p>
        ) : isKanban ? (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
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
                  placeholder="Search order #, customer, product code..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchQuery(searchInput)}>
                <FiSearch className="mr-1.5 inline size-4" />
                Apply search
              </Button>
            </div>

            {isLoading ? (
              <p className="py-8 text-center text-slate-500">Loading orders...</p>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  Drag an order card to another status column to update workflow.
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3">
                  {ORDER_STATUS_OPTIONS.map((column) => (
                    <OrderKanbanColumn
                      key={column.value}
                      status={column.value}
                      label={column.label}
                      orders={orders.filter((order) => order.status === column.value)}
                      onView={setDetailModalOrder}
                      canDelete={isAdmin}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </DndContext>
            )}
          </>
        ) : (
          <DataTable<Order>
            columns={columns}
            data={orders}
            rowKey={(o) => o._id}
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search order #, customer, product code...',
              onSearchSubmit: () => {
                setSearchQuery(searchInput);
                setPage(1);
              },
            }}
            filters={filters}
            pagination={data?.pagination ? {
              page: data.pagination.page,
              totalPages: data.pagination.totalPages,
              total: data.pagination.total,
              limit: data.pagination.limit,
              onPageChange: setPage,
            } : undefined}
            isLoading={isLoading}
            emptyMessage="No orders found."
            renderActions={(order) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                  onClick={() => setDetailModalOrder(order)}
                >
                  <FiEye className="size-3.5" />
                  View details
                </button>
                {nextStatusFor(order) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-700"
                    onClick={() => {
                      const next = nextStatusFor(order);
                      if (!next) return;
                      setStageModal({ order, targetStatus: next });
                    }}
                  >
                    <FiArrowRightCircle className="size-3.5" />
                    Move stage
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                    onClick={() => setDeleteTarget(order)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          />
        )}
      </Card>

      {detailModalOrder && <OrderDetailsModal order={detailModalOrder} onGenerateLabel={handleGenerateLabel} onClose={() => { setDetailModalOrder(null); refetch(); }} />}
      {stageModal && (
        <StageUpdateModal
          order={stageModal.order}
          targetStatus={stageModal.targetStatus}
          canDelete={isAdmin}
          onDelete={setDeleteTarget}
          onClose={() => {
            setStageModal(null);
            refetch();
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
            <h3 className="text-lg font-semibold text-slate-800">Delete Order</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <span className="font-medium">{deleteTarget.orderNumber}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteOrderMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteOrderMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteOrderMutation.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
                    setStageModal(null);
                    setDetailModalOrder(null);
                    refetch();
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
