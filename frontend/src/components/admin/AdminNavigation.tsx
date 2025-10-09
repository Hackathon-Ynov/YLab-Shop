import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function AdminNavigation() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/admin/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                Admin Dashboard
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/admin/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Purchases
              </Link>
              <Link
                to="/admin/returns"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Returns
              </Link>
              <Link
                to="/admin/teams"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Teams
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {admin && (
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{admin.username}</span>
                <span className="text-gray-400">•</span>
                <span>{admin.email}</span>
              </div>
            )}

            <Link to="/admin/account">
              <Button variant="ghost" size="sm">
                Account
              </Button>
            </Link>

            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
