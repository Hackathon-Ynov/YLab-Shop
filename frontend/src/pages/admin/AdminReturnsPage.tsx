import { useState, useEffect, useCallback } from "react";
import { adminApi, Purchase, TeamProfile } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import AdminNavigation from "../../components/admin/AdminNavigation";
import { useToast } from "../../components/ui/ToastProvider";
import { Package, Check, RefreshCw } from "lucide-react";

export default function AdminReturnsPage() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Filters
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");
  const [returnedFilter, setReturnedFilter] = useState<
    "all" | "returned" | "not_returned"
  >("not_returned");
  const [dateFilter, setDateFilter] = useState<string>("");

  const loadTeams = useCallback(async () => {
    try {
      const data = await adminApi.getAllTeams();
      setTeams(data);
    } catch (error) {
      console.error("Failed to load teams:", error);
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      // Only get confirmed purchases that need return
      const data = await adminApi.getAllPurchases(
        "confirmé",
        teamFilter === "all" ? undefined : teamFilter,
        undefined
      );

      // Filter to only items that need return
      const returnable = data.filter((p) => p.needs_return);
      setPurchases(returnable);
    } catch (error) {
      console.error("Failed to load purchases:", error);
      showToast({ message: "Failed to load returns", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [teamFilter, showToast]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleToggleReturn = async (
    purchaseId: number,
    currentStatus: boolean
  ) => {
    setProcessingIds((prev) => new Set(prev).add(purchaseId));

    try {
      if (!currentStatus) {
        // Mark as returned
        await adminApi.markPurchaseAsReturned(purchaseId);
        showToast({
          message: "Item marked as returned",
          type: "success",
        });
      } else {
        // Unmark as returned
        await adminApi.unmarkPurchaseAsReturned(purchaseId);
        showToast({
          message: "Item unmarked as returned",
          type: "success",
        });
      }

      // Reload purchases
      await loadPurchases();
    } catch (error) {
      console.error("Failed to toggle return status:", error);
      showToast({
        message: "Failed to update return status",
        type: "error",
      });
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(purchaseId);
        return newSet;
      });
    }
  };

  // Apply client-side filters
  const filteredPurchases = purchases.filter((purchase) => {
    // Returned filter
    if (returnedFilter === "returned" && !purchase.is_returned) return false;
    if (returnedFilter === "not_returned" && purchase.is_returned) return false;

    // Date filter
    if (dateFilter) {
      const purchaseDate = new Date(purchase.purchase_date)
        .toISOString()
        .split("T")[0];
      if (purchaseDate !== dateFilter) return false;
    }

    return true;
  });

  const stats = {
    total: filteredPurchases.length,
    returned: filteredPurchases.filter((p) => p.is_returned).length,
    notReturned: filteredPurchases.filter((p) => !p.is_returned).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Returns Management</h1>
          <p className="text-gray-600">
            Track and manage physical returns of confirmed purchases
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">
              Total Items to Track
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Already Returned</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.returned}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Return</div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.notReturned}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team
              </label>
              <select
                value={teamFilter}
                onChange={(e) =>
                  setTeamFilter(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Status
              </label>
              <select
                value={returnedFilter}
                onChange={(e) =>
                  setReturnedFilter(
                    e.target.value as "all" | "returned" | "not_returned"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="not_returned">Not Returned</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {(teamFilter !== "all" ||
            returnedFilter !== "not_returned" ||
            dateFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTeamFilter("all");
                setReturnedFilter("not_returned");
                setDateFilter("");
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </Card>

        {/* Returns Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading returns...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No items found matching filters</p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Returned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPurchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className={`hover:bg-gray-50 ${
                        purchase.is_returned ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleToggleReturn(
                              purchase.id,
                              purchase.is_returned
                            )
                          }
                          disabled={processingIds.has(purchase.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            purchase.is_returned
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300 hover:border-green-500"
                          } ${
                            processingIds.has(purchase.id)
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          {processingIds.has(purchase.id) ? (
                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                          ) : purchase.is_returned ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : null}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{purchase.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.batch_id || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.team?.name || `Team #${purchase.team_id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {purchase.resource?.image_url && (
                            <img
                              src={purchase.resource.image_url}
                              alt={purchase.resource.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {purchase.resource?.name ||
                                `Resource #${purchase.resource_id}`}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {purchase.resource?.type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {purchase.is_returned ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Returned
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            Pending Return
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
