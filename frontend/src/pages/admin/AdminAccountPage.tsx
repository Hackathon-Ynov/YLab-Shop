import { Card } from "../../components/ui/card";
import AdminNavigation from "../../components/admin/AdminNavigation";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function AdminAccountPage() {
  const { admin } = useAdminAuth();

  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <p className="text-gray-600">Loading admin information...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Account</h1>
          <p className="text-gray-600">View your admin account information</p>
        </div>

        <div className="max-w-2xl">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Account Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin ID
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
                  <span className="text-gray-900 font-mono">{admin.id}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
                  <span className="text-gray-900">{admin.username}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
                  <span className="text-gray-900">{admin.email}</span>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-3">Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>View all purchases</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Approve or reject purchase requests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>View team information</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
