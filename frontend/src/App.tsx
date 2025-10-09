import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { ToastProvider } from "./components/ui/ToastProvider";
import { StorePage } from "./pages/StorePage";
import { ResourceDetailPage } from "./pages/ResourceDetailPage";
import { CartPage } from "./pages/CartPage";
import { AccountPage } from "./pages/AccountPage";
import { OrdersPage } from "./pages/OrdersPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPurchaseDetailPage from "./pages/admin/AdminPurchaseDetailPage";
import AdminBatchDetailPage from "./pages/admin/AdminBatchDetailPage";
import AdminReturnsPage from "./pages/admin/AdminReturnsPage";
import AdminAccountPage from "./pages/admin/AdminAccountPage";
import AdminTeamsPage from "./pages/admin/AdminTeamsPage";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import { RefreshCw } from "lucide-react";
import "./index.css";
import { LoginPage } from "./pages/LoginPage";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<StorePage />} />
      <Route path="/resource/:id" element={<ResourceDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/account" element={<AccountPage />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Admin Routes */}
            <Route
              path="/admin/login"
              element={
                <AdminAuthProvider>
                  <AdminLoginPage />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminAuthProvider>
                  <AdminProtectedRoute>
                    <Routes>
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      <Route
                        path="/purchases/:id"
                        element={<AdminPurchaseDetailPage />}
                      />
                      <Route
                        path="/purchases/batch/:batchId"
                        element={<AdminBatchDetailPage />}
                      />
                      <Route path="/returns" element={<AdminReturnsPage />} />
                      <Route path="/teams" element={<AdminTeamsPage />} />
                      <Route path="/account" element={<AdminAccountPage />} />
                    </Routes>
                  </AdminProtectedRoute>
                </AdminAuthProvider>
              }
            />

            {/* Team Routes */}
            <Route
              path="/*"
              element={
                <AuthProvider>
                  <AuthenticatedApp />
                </AuthProvider>
              }
            />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
