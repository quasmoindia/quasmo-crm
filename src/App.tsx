import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { RoleManagement } from './pages/RoleManagement';
import { ComplaintManagement } from './pages/ComplaintManagement';
import { LeadManagement } from './pages/LeadManagement';
import { TaxInvoiceManagement } from './pages/TaxInvoiceManagement';
import { ExpenseManagement } from './pages/ExpenseManagement';
import { ProductList } from './pages/ProductList';
import { AddProduct } from './pages/AddProduct';
import { EditProduct } from './pages/EditProduct';
import { ProductDetail } from './pages/ProductDetail';
import { CustomerManagement } from './pages/CustomerManagement';
import { AddCustomer } from './pages/AddCustomer';
import { OrderProcessing } from './pages/OrderProcessing';
import { AddOrder } from './pages/AddOrder';
import { DocumentManagement } from './pages/DocumentManagement';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="complaints" element={<ComplaintManagement />} />
            <Route path="leads" element={<LeadManagement />} />
            <Route path="invoices" element={<TaxInvoiceManagement />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<AddProduct />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="products/:id/edit" element={<EditProduct />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="customers/new" element={<AddCustomer />} />
            <Route path="orders" element={<OrderProcessing />} />
            <Route path="orders/new" element={<AddOrder />} />
            <Route path="documents" element={<DocumentManagement />} />
            {/* Sales / Finance / Content – commented for now
            <Route path="sales" element={<PlaceholderModule title="Sales management" />} />
            <Route path="finance" element={<PlaceholderModule title="Finance management" />} />
            <Route path="content" element={<PlaceholderModule title="Content" />} />
            */}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
