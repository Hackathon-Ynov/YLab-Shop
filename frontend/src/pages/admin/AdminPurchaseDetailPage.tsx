import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi, Purchase } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import AdminNavigation from "../../components/admin/AdminNavigation";
import { useToast } from "../../components/ui/ToastProvider";

export default function AdminPurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPurchase = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const purchases = await adminApi.getAllPurchases();
      const found = purchases.find((p) => p.id === parseInt(id));
      setPurchase(found || null);
    } catch (error) {
      console.error("Failed to load purchase:", error);
      showToast({ message: "Failed to load purchase details", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadPurchase();
  }, [loadPurchase]);

  const handleAction = async (action: "confirm" | "cancel") => {
    if (!purchase) return;

    try {
      setIsProcessing(true);
      await adminApi.updatePurchaseStatus(purchase.id, action);
      showToast({
        message: `Purchase ${
          action === "confirm" ? "confirmed" : "cancelled"
        } successfully`,
        type: "success",
      });
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Failed to update purchase:", error);
      showToast({ message: "Failed to update purchase status", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en attente":
        return "bg-yellow-100 text-yellow-800";
      case "confirmé":
        return "bg-green-100 text-green-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading purchase details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <p className="text-gray-600 mb-4">Purchase not found</p>
            <Button onClick={() => navigate("/admin/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const totalPrice = (purchase.resource?.cost || 0) * purchase.quantity;
  const isPending = purchase.status === "en attente";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Purchase #{purchase.id}
              </h1>
              <p className="text-gray-600">
                Review purchase details and take action
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                purchase.status
              )}`}
            >
              {purchase.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Information */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Team Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Team Name:</span>
                  <span className="font-medium">
                    {purchase.team?.name || `Team #${purchase.team_id}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Team Email:</span>
                  <span className="font-medium">
                    {purchase.team?.email || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Team Balance:</span>
                  <span className="font-medium text-blue-600">
                    {purchase.team?.credit || 0} credits
                  </span>
                </div>
              </div>
            </Card>

            {/* Resource Information */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Resource Details</h2>
              <div className="space-y-4">
                {purchase.resource?.image_url && (
                  <img
                    src={purchase.resource.image_url}
                    alt={purchase.resource.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Resource Name:</span>
                    <span className="font-medium">
                      {purchase.resource?.name ||
                        `Resource #${purchase.resource_id}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium text-right max-w-md">
                      {purchase.resource?.description || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">
                      {purchase.resource?.type || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium">
                      {purchase.resource?.cost || 0} credits
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Available Stock:</span>
                    <span className="font-medium">
                      {purchase.resource?.quantity || 0}
                    </span>
                  </div>
                  {!purchase.resource?.is_non_returnable && (
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-2">
                      <p className="text-sm font-medium text-orange-800">
                        🚫 Article doit être impérativement retourné
                      </p>
                    </div>
                  )}
                  {purchase.needs_return &&
                    !purchase.is_returned &&
                    purchase.status === "confirmé" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                        <p className="text-sm font-medium text-blue-800">
                          📦 Physical return required
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Summary */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Purchase Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{purchase.quantity}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">
                    {purchase.resource?.cost || 0} credits
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b text-lg font-bold">
                  <span>Total Cost:</span>
                  <span className="text-blue-600">{totalPrice} credits</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Purchase Date:</span>
                  <span className="font-medium text-sm">
                    {formatDate(purchase.purchase_date)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Returned:</span>
                  <span className="font-medium">
                    {purchase.is_returned ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            {isPending && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Actions</h2>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("confirm")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "✓ Confirm Purchase"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleAction("cancel")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "✗ Cancel Purchase"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Confirming will approve the purchase. Cancelling will refund
                  the team's credits.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
