import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { RequireAuth, RequireRole } from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AddStudent from './pages/AddStudent.jsx';
import StudentList from './pages/StudentList.jsx';
import StudentProfile from './pages/StudentProfile.jsx';
import FeeManagement from './pages/FeeManagement.jsx';
import DailyCollection from './pages/DailyCollection.jsx';
import Notifications from './pages/Notifications.jsx';
import RoutesAndBuses from './pages/RoutesAndBuses.jsx';
import SubAdmins from './pages/SubAdmins.jsx';
import Alumni from './pages/Alumni.jsx';
import AcademicYears from './pages/AcademicYears.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Loading HS CRM…" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="students" element={<StudentList />} />
        <Route path="students/add" element={<AddStudent />} />
        <Route path="students/:id" element={<StudentProfile />} />

        <Route path="fees" element={<FeeManagement />} />
        <Route path="daily-collection" element={<DailyCollection />} />
        {/* /receipts redirects to /daily-collection (Receipts tab) */}
        <Route path="receipts" element={<Navigate to="/app/daily-collection" replace />} />
        <Route path="notifications" element={<Notifications />} />

        <Route path="routes-buses" element={<RequireRole role="superadmin"><RoutesAndBuses /></RequireRole>} />
        {/* Legacy redirects so any bookmarked /routes or /buses still work */}
        <Route path="routes" element={<Navigate to="/app/routes-buses" replace />} />
        <Route path="buses"  element={<Navigate to="/app/routes-buses" replace />} />

        <Route path="subadmins"      element={<RequireRole role="superadmin"><SubAdmins /></RequireRole>} />
        <Route path="alumni"         element={<RequireRole role="superadmin"><Alumni /></RequireRole>} />
        <Route path="reports"        element={<RequireRole role="superadmin"><Reports /></RequireRole>} />
        {/* Archive is now a tab inside Academic Years */}
        <Route path="archive"        element={<Navigate to="/app/academic-years?tab=archive" replace />} />
        <Route path="academic-years" element={<RequireRole role="superadmin"><AcademicYears /></RequireRole>} />
        <Route path="settings"       element={<RequireRole role="superadmin"><Settings /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
