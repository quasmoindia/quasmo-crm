export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}
