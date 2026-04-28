import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { SearchableSelect } from '../components/SearchableSelect';
import { useCreateOrder } from '../api/orders';
import { useCustomersList } from '../api/customers';
import { useProductsList } from '../api/products';

export function AddOrder() {
  const navigate = useNavigate();
  const createMutation = useCreateOrder();

  const [customerId, setCustomerId] = useState('');
  const [specificationNotes, setSpecificationNotes] = useState('');
  const [packingInstructions, setPackingInstructions] = useState('');
  
  const [items, setItems] = useState<{ product: string; quantity: number; notes: string }[]>([
    { product: '', quantity: 1, notes: '' },
  ]);

  // Fetch lists for dropdowns
  const { data: customersData, isLoading: loadingCustomers } = useCustomersList({ limit: 200, page: 1 });
  const customers = customersData?.data ?? [];

  const { data: productsData } = useProductsList({ limit: 100 });
  const products = productsData?.data ?? [];

  const handleAddItem = () => {
    setItems([...items, { product: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert('Please select a customer.');
    
    const validItems = items
      .filter(i => i.product && i.quantity > 0)
      .map((item) => ({
        ...item,
        notes: item.notes.trim() || undefined,
      }));
    if (validItems.length === 0) return alert('Please add at least one valid product.');

    try {
      await createMutation.mutateAsync({
        customer: customerId,
        specificationNotes: specificationNotes.trim() || undefined,
        packingInstructions: packingInstructions.trim() || undefined,
        items: validItems,
      });
      navigate('/dashboard/orders');
    } catch (err) {
      alert((err as Error).message || 'Failed to create order');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create Order</h1>
          <p className="mt-1 text-sm text-slate-500">Process a new order for a customer</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/orders')}>
          <FiArrowLeft className="mr-1.5 inline size-4" />
          Back to Orders
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">1. Customer Details</h2>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/customers')}>
              <FiPlus className="mr-1.5 inline size-4" />
              New Customer
            </Button>
          </div>
          
          <div className="relative">
            <SearchableSelect
              label="Customer"
              value={customerId}
              onChange={setCustomerId}
              required
              loading={loadingCustomers}
              options={customers.map((customer) => ({
                value: customer._id,
                label: customer.name,
                meta: `${customer.phone || 'No phone'}${customer.company ? ` • ${customer.company}` : ''}`,
              }))}
              placeholder="Select customer..."
              searchPlaceholder="Search by name, phone, company..."
              emptyText="No customers found"
            />
          </div>
        </Card>

        {/* Order Items */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">2. Order Items</h2>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              <FiPlus className="mr-1.5 inline size-4" />
              Add Product
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                  >
                    <FiTrash2 className="size-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-3">
                    <SearchableSelect
                      label="Product"
                      value={item.product}
                      onChange={(selected) => updateItem(index, 'product', selected)}
                      options={products.map((product) => ({
                        value: product._id,
                        label: `${product.productCode} - ${product.productName}`,
                        meta: `Stock: ${product.currentStock ?? 0} ${product.unit}`,
                      }))}
                      placeholder="Select a product..."
                      searchPlaceholder="Search by code, name, brand..."
                      emptyText="No products found"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Quantity *"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value, 10))}
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Product Notes</label>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Any specific notes for this product line item..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">3. Specification Notes</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes for all products</label>
            <textarea
              value={specificationNotes}
              onChange={(e) => setSpecificationNotes(e.target.value)}
              placeholder="e.g. Common packaging instructions, handling notes, and shared specifications for this order."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        </Card>
        
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">4. Packing Instructions</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instructions for packing team</label>
            <textarea
              value={packingInstructions}
              onChange={(e) => setPackingInstructions(e.target.value)}
              placeholder="e.g. Fragile handling, double boxing, foam protection, label placement, etc."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/orders')} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
}
