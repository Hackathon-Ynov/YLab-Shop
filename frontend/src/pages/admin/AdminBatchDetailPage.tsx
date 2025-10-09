import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi, Purchase, PurchaseItemAction } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import AdminNavigation from "../../components/admin/AdminNavigation";
import { useToast } from "../../components/ui/ToastProvider";
import { Package, Check, X } from "lucide-react";

export default function AdminBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track actions for each purchase
  const [actions, setActions] = useState<
    Map<number, { action: "confirm" | "cancel"; quantity?: number }>
  >(new Map());

  const loadBatch = useCallback(async () => {
    if (!batchId || batchId === "undefined" || batchId === "null") {
      console.error("Invalid batch ID:", batchId);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const allPurchases = await adminApi.getAllPurchases();
      console.log("All purchases loaded:", allPurchases.length);
      console.log("Looking for batch_id:", batchId);
      const batchPurchases = allPurchases.filter((p) => p.batch_id === batchId);
      console.log("Found batch purchases:", batchPurchases.length);
      setPurchases(batchPurchases);

      // Initialize actions for pending purchases
      const initialActions = new Map();
      batchPurchases.forEach((p) => {
        if (p.status === "en attente") {
          initialActions.set(p.id, {
            action: "confirm",
            quantity: p.quantity,
          });
        }
      });
      setActions(initialActions);
    } catch (error) {
      console.error("Failed to load batch:", error);
      showToast({ message: "Failed to load batch details", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [batchId, showToast]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const updateAction = (
    purchaseId: number,
    action: "confirm" | "cancel",
    quantity?: number
  ) => {
    const newActions = new Map(actions);
    newActions.set(purchaseId, { action, quantity });
    setActions(newActions);
  };

  const handleSubmit = async () => {
    const itemActions: PurchaseItemAction[] = [];

    actions.forEach((value, purchaseId) => {
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase || purchase.status !== "en attente") return;

      const action: PurchaseItemAction = {
        purchase_id: purchaseId,
        action: value.action,
      };

      // Only include approved_quantity if it's different from requested
      if (
        value.action === "confirm" &&
        value.quantity !== undefined &&
        value.quantity !== purchase.requested_quantity
      ) {
        action.approved_quantity = value.quantity;
      }

      itemActions.push(action);
    });

    if (itemActions.length === 0) {
      showToast({ message: "No pending items to process", type: "warning" });
      return;
    }

    try {
      setIsProcessing(true);
      const result = await adminApi.updateBatchPurchaseStatus(itemActions);

      const failures = result.results.filter((r) => !r.success);
      if (failures.length > 0) {
        showToast({
          message: `Processed with ${failures.length} failures. Check console for details.`,
          type: "warning",
        });
        console.error("Failed items:", failures);
      } else {
        showToast({
          message: "Batch processed successfully!",
          type: "success",
        });
      }

      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Failed to process batch:", error);
      showToast({ message: "Failed to process batch", type: "error" });
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
            <p className="mt-2 text-gray-600">Loading batch details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <p className="text-gray-600 mb-2">
              {batchId && batchId !== "undefined" && batchId !== "null"
                ? `Batch "${batchId}" not found or has no purchases`
                : "Invalid batch ID"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              The batch may have been deleted or you may have navigated to an
              invalid URL.
            </p>
            <Button onClick={() => navigate("/admin/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const firstPurchase = purchases[0];
  const team = firstPurchase.team;
  const totalCost = purchases.reduce(
    (sum, p) => sum + (p.resource?.cost || 0) * p.quantity,
    0
  );
  const hasPending = purchases.some((p) => p.status === "en attente");

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
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold">Batch Order #{batchId}</h1>
                <p className="text-gray-600">
                  Review and manage batch purchase request
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Team Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Team Name:</span>
                  <span className="font-medium">
                    {team?.name || `Team #${firstPurchase.team_id}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Team Email:</span>
                  <span className="font-medium">{team?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Team Balance:</span>
                  <span className="font-medium text-blue-600">
                    {team?.credit || 0} credits
                  </span>
                </div>
              </div>
            </Card>

            {/* Comment */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Purchase Justification</h2>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700">{firstPurchase.comment}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Submitted on {formatDate(firstPurchase.purchase_date)}
              </p>
            </Card>

            {/* Items */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Items in Batch ({purchases.length})
              </h2>
              <div className="space-y-4">
                {purchases.map((purchase) => {
                  const action = actions.get(purchase.id);
                  const isPending = purchase.status === "en attente";

                  return (
                    <div
                      key={purchase.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {purchase.resource?.name ||
                                `Resource #${purchase.resource_id}`}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                purchase.status
                              )}`}
                            >
                              {purchase.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {purchase.resource?.description}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-gray-600">Type:</span>{" "}
                              <span className="font-medium capitalize">
                                {purchase.resource?.type}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Unit Price:</span>{" "}
                              <span className="font-medium">
                                {purchase.resource?.cost || 0} credits
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Requested:</span>{" "}
                              <span className="font-medium">
                                {purchase.requested_quantity}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Stock:</span>{" "}
                              <span className="font-medium">
                                {purchase.resource?.quantity || 0}
                              </span>
                            </div>
                          </div>
                          {!purchase.resource?.is_non_returnable && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <span>🚫 Doit être impérativement retourné</span>
                            </div>
                          )}
                          {purchase.needs_return &&
                            !purchase.is_returned &&
                            purchase.status === "confirmé" && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <span>📦 Needs physical return</span>
                              </div>
                            )}
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-3 pt-3 border-t">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                action?.action === "confirm"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                updateAction(
                                  purchase.id,
                                  "confirm",
                                  purchase.quantity
                                )
                              }
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                action?.action === "cancel"
                                  ? "destructive"
                                  : "outline"
                              }
                              onClick={() =>
                                updateAction(purchase.id, "cancel")
                              }
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>

                          {action?.action === "confirm" && (
                            <div className="flex items-center gap-2 ml-auto">
                              <label className="text-sm text-gray-600">
                                Approved Qty:
                              </label>
                              <Input
                                type="number"
                                min={1}
                                max={purchase.requested_quantity}
                                value={action.quantity || purchase.quantity}
                                onChange={(e) =>
                                  updateAction(
                                    purchase.id,
                                    "confirm",
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-20"
                              />
                              <span className="text-sm text-gray-500">
                                / {purchase.requested_quantity}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {!isPending && (
                        <div className="pt-3 border-t text-sm">
                          <span className="text-gray-600">Final Quantity:</span>{" "}
                          <span className="font-medium">
                            {purchase.quantity}
                          </span>
                          {purchase.quantity !==
                            purchase.requested_quantity && (
                            <span className="text-orange-600 ml-2">
                              (requested {purchase.requested_quantity})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Batch Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{purchases.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium text-blue-600">
                    {totalCost} credits
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-medium text-yellow-600">
                    {purchases.filter((p) => p.status === "en attente").length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Confirmed:</span>
                  <span className="font-medium text-green-600">
                    {purchases.filter((p) => p.status === "confirmé").length}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Cancelled:</span>
                  <span className="font-medium text-red-600">
                    {purchases.filter((p) => p.status === "annulé").length}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            {hasPending && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Process Batch</h2>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 mb-3"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Submit Decisions"}
                </Button>
                <p className="text-xs text-gray-500">
                  Review each item above and adjust quantities if needed. Click
                  Submit to process all decisions at once.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
