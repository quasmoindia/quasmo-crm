import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useCustomersList, useUpdateCustomer, useDeleteCustomer } from '../api/customers';
import { useCurrentUser } from '../api/auth';
import type { Customer } from '../types/customer';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CustomerManagement() {
  const navigate = useNavigate();
  const { data: authData } = useCurrentUser();
  const isAdmin = authData?.user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data, isLoading } = useCustomersList({ search: searchQuery, page, limit: 10 });
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const columns = [
    { key: 'name', label: 'Name', render: (c: Customer) => <span className="font-medium text-slate-800">{c.name}</span> },
    { key: 'phone', label: 'Phone', render: (c: Customer) => c.phone },
    { key: 'company', label: 'Company', render: (c: Customer) => c.company || '—' },
    { key: 'gst', label: 'GST Number', render: (c: Customer) => c.gstNumber || '—' },
    { key: 'created', label: 'Added On', render: (c: Customer) => formatDate(c.createdAt) },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <Button onClick={() => navigate('/dashboard/customers/new')}>
          <FiPlus className="mr-1.5 inline-block size-4" /> Add Customer
        </Button>
      </div>

      <Card>
        <DataTable<Customer>
          columns={columns}
          data={data?.data ?? []}
          rowKey={(c) => c._id}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search name, phone, company...',
            onSearchSubmit: () => {
              setSearchQuery(searchInput);
              setPage(1);
            },
          }}
          pagination={data?.pagination ? {
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
            total: data.pagination.total,
            limit: data.pagination.limit,
            onPageChange: setPage,
          } : undefined}
          isLoading={isLoading}
          emptyMessage="No customers found."
          renderActions={(customer) => (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setEditTarget(customer)}
              >
                Edit
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  onClick={() => setDeleteTarget(customer)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        />
      </Card>

      {editTarget && (
        <EditCustomerModal
          customer={editTarget}
          isSaving={updateCustomerMutation.isPending}
          onClose={() => setEditTarget(null)}
          onSave={async (payload) => {
            await updateCustomerMutation.mutateAsync({ id: editTarget._id, payload });
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
            <h3 className="text-lg font-semibold text-slate-800">Delete customer</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <span className="font-medium">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteCustomerMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                loading={deleteCustomerMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteCustomerMutation.mutateAsync(deleteTarget._id);
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

function EditCustomerModal({
  customer,
  isSaving,
  onClose,
  onSave,
}: {
  customer: Customer;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [email, setEmail] = useState(customer.email ?? '');
  const [company, setCompany] = useState(customer.company ?? '');
  const [address, setAddress] = useState(customer.address ?? '');
  const [gstNumber, setGstNumber] = useState(customer.gstNumber ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Edit customer</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) {
              alert('Name is required');
              return;
            }
            try {
              await onSave({
                name: name.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                company: company.trim() || undefined,
                address: address.trim() || undefined,
                gstNumber: gstNumber.trim() || undefined,
                notes: notes.trim() || undefined,
              });
            } catch (err) {
              alert((err as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Input label="GST Number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
