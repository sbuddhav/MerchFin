import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PlanningPage from './pages/PlanningPage';
import HierarchyConfig from './components/admin/HierarchyConfig';
import MeasureConfig from './components/admin/MeasureConfig';
import TimeConfig from './components/admin/TimeConfig';
import UserManagement from './components/admin/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<PlanningPage />} />
            <Route path="/admin/hierarchy" element={<HierarchyConfig />} />
            <Route path="/admin/measures" element={<MeasureConfig />} />
            <Route path="/admin/time-periods" element={<TimeConfig />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
