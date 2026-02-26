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
// import { PlaceholderModule } from './pages/PlaceholderModule'; // used by sales/finance/content routes when enabled

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
