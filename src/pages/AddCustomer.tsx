import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useCreateCustomer } from '../api/customers';

export function AddCustomer() {
  const navigate = useNavigate();
  const createMutation = useCreateCustomer();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name, phone, email, company, address, gstNumber, notes });
      navigate('/dashboard/customers');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Customer</h1>
          <p className="mt-1 text-sm text-slate-500">Create a new customer profile</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/customers')}>
          <FiArrowLeft className="mr-1.5 inline size-4" />
          Back to Customers
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required disabled={createMutation.isPending} />
            <Input label="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={createMutation.isPending} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={createMutation.isPending} />
            <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} disabled={createMutation.isPending} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="GST Number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} disabled={createMutation.isPending} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              disabled={createMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              disabled={createMutation.isPending}
            />
          </div>
          {createMutation.isError && <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>}
          <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/customers')} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Save Customer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
