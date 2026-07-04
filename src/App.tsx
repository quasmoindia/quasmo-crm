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
import { TenderManagement } from './pages/TenderManagement';
import { TradeIndiaInquiries } from './pages/TradeIndiaInquiries';
import { IndiaMartLeads } from './pages/IndiaMartLeads';
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
import { AttendanceOverview } from './pages/attendance/AttendanceOverview';
import { AttendanceRoster } from './pages/attendance/AttendanceRoster';
import { AttendanceEmployees } from './pages/attendance/AttendanceEmployees';
import { AttendanceEmployeeForm } from './pages/attendance/AttendanceEmployeeForm';
import { AttendanceEmployeeDetail } from './pages/attendance/AttendanceEmployeeDetail';
import { AttendanceTimeOff } from './pages/attendance/AttendanceTimeOff';
import { AttendancePayrollHub } from './pages/attendance/AttendancePayrollHub';
import { AttendanceSettings } from './pages/attendance/AttendanceSettings';
import { AttendanceSelfPunch } from './pages/attendance/AttendanceSelfPunch';
import { AttendancePunch } from './pages/attendance/AttendancePunch';
import { KioskDevices } from './pages/attendance/KioskDevices';
import { KioskSetup } from './pages/attendance/KioskSetup';
import { AttendanceRegularizations } from './pages/attendance/AttendanceRegularizations';
import { IdCards } from './pages/attendance/IdCards';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if ((error as Error)?.message === 'Session expired') return false;
        return failureCount < 2;
      },
    },
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
            <Route path="tenders" element={<TenderManagement />} />
            <Route path="tradeindia-inquiries" element={<TradeIndiaInquiries />} />
            <Route path="indiamart-leads" element={<IndiaMartLeads />} />
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
            <Route path="attendance" element={<AttendanceOverview />} />
            <Route path="attendance/records" element={<AttendanceOverview />} />
            <Route path="attendance/roster" element={<AttendanceRoster />} />
            <Route path="attendance/employees" element={<AttendanceEmployees />} />
            <Route path="attendance/employees/new" element={<AttendanceEmployeeForm />} />
            <Route path="attendance/employees/:id/edit" element={<AttendanceEmployeeForm />} />
            <Route path="attendance/employees/:id" element={<AttendanceEmployeeDetail />} />
            <Route path="attendance/time-off" element={<AttendanceTimeOff />} />
            <Route path="attendance/leaves" element={<Navigate to="/dashboard/attendance/time-off?tab=leaves" replace />} />
            <Route path="attendance/holidays" element={<Navigate to="/dashboard/attendance/time-off?tab=holidays" replace />} />
            <Route path="attendance/payroll" element={<AttendancePayrollHub />} />
            <Route path="attendance/reports" element={<Navigate to="/dashboard/attendance/payroll?tab=reports" replace />} />
            <Route path="attendance/settings" element={<AttendanceSettings />} />
            <Route path="attendance/kiosk-devices" element={<KioskDevices />} />
            <Route path="attendance/regularizations" element={<AttendanceRegularizations />} />
            <Route path="attendance/id-cards" element={<IdCards />} />
            <Route path="attendance/my-punch" element={<AttendanceSelfPunch />} />
            {/* Sales / Finance / Content – commented for now
            <Route path="sales" element={<PlaceholderModule title="Sales management" />} />
            <Route path="finance" element={<PlaceholderModule title="Finance management" />} />
            <Route path="content" element={<PlaceholderModule title="Content" />} />
            */}
          </Route>
          <Route path="/attendance/punch" element={<AttendancePunch />} />
          <Route path="/attendance/kiosk-setup" element={<KioskSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
