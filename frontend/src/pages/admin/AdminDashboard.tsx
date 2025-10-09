import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi, Purchase, TeamProfile } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import AdminNavigation from "../../components/admin/AdminNavigation";
import { Package } from "lucide-react";

// Group purchases by batch_id
interface BatchGroup {
  batchId: string | null;
  purchases: Purchase[];
  totalItems: number;
  totalCost: number;
  status: string;
  date: string;
  comment: string;
  teamName: string;
}

export default function AdminDashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "en attente" | "confirmé" | "annulé"
  >("all");
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");
  const [needsReturnFilter, setNeedsReturnFilter] = useState(false);

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
      const data = await adminApi.getAllPurchases(
        filter === "all" ? undefined : filter,
        teamFilter === "all" ? undefined : teamFilter,
        needsReturnFilter ? true : undefined
      );
      setPurchases(data);
    } catch (error) {
      console.error("Failed to load purchases:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, teamFilter, needsReturnFilter]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  // Group purchases by batch_id
  const batchGroups: BatchGroup[] = [];
  const processedBatches = new Set<string>();
  const singlePurchases: Purchase[] = [];

  purchases.forEach((purchase) => {
    if (purchase.batch_id && !processedBatches.has(purchase.batch_id)) {
      processedBatches.add(purchase.batch_id);
      const batchPurchases = purchases.filter(
        (p) => p.batch_id === purchase.batch_id
      );

      // Determine batch status (all same status in a batch)
      const statuses = batchPurchases.map((p) => p.status);
      const allSame = statuses.every((s) => s === statuses[0]);
      const batchStatus = allSame ? statuses[0] : "mixte";

      batchGroups.push({
        batchId: purchase.batch_id,
        purchases: batchPurchases,
        totalItems: batchPurchases.reduce((sum, p) => sum + p.quantity, 0),
        totalCost: batchPurchases.reduce(
          (sum, p) => sum + (p.resource?.cost || 0) * p.quantity,
          0
        ),
        status: batchStatus,
        date: purchase.purchase_date,
        comment: purchase.comment,
        teamName: purchase.team?.name || `Team #${purchase.team_id}`,
      });
    } else if (!purchase.batch_id) {
      singlePurchases.push(purchase);
    }
  });

  const stats = {
    total: purchases.length,
    pending: purchases.filter((p) => p.status === "en attente").length,
    confirmed: purchases.filter((p) => p.status === "confirmé").length,
    cancelled: purchases.filter((p) => p.status === "annulé").length,
    needsReturn: purchases.filter(
      (p) => p.needs_return && !p.is_returned && p.status === "confirmé"
    ).length,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en attente":
        return "bg-yellow-100 text-yellow-800";
      case "confirmé":
        return "bg-green-100 text-green-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      case "mixte":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Purchase Management</h1>
          <p className="text-gray-600">
            Review and manage team purchase requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Total Purchases</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Confirmed</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.confirmed}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Cancelled</div>
            <div className="text-3xl font-bold text-red-600">
              {stats.cancelled}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Needs Return</div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.needsReturn}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">
              Status:
            </span>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filter === "en attente" ? "default" : "outline"}
              onClick={() => setFilter("en attente")}
              size="sm"
            >
              Pending
            </Button>
            <Button
              variant={filter === "confirmé" ? "default" : "outline"}
              onClick={() => setFilter("confirmé")}
              size="sm"
            >
              Confirmed
            </Button>
            <Button
              variant={filter === "annulé" ? "default" : "outline"}
              onClick={() => setFilter("annulé")}
              size="sm"
            >
              Cancelled
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Team:</label>
              <select
                value={teamFilter}
                onChange={(e) =>
                  setTeamFilter(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="needsReturn"
                checked={needsReturnFilter}
                onChange={(e) => setNeedsReturnFilter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="needsReturn"
                className="text-sm font-medium text-gray-700"
              >
                Show only items that need return
              </label>
            </div>
          </div>
        </div>

        {/* Purchases List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading purchases...</p>
          </div>
        ) : purchases.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600">No purchases found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Batch Groups */}
            {batchGroups.map((batch) => (
              <Card key={batch.batchId} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">
                        Batch Order #{batch.batchId}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          batch.status
                        )}`}
                      >
                        {batch.status}
                      </span>
                      {batch.purchases.some(
                        (p) => p.needs_return && !p.is_returned
                      ) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Needs Return
                        </span>
                      )}
                    </div>

                    <div className="mb-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Comment:</span>{" "}
                        {batch.comment}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Team:</span>{" "}
                        <span className="font-medium">{batch.teamName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Items:</span>{" "}
                        <span className="font-medium">
                          {batch.purchases.length} ({batch.totalItems} total
                          qty)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Cost:</span>{" "}
                        <span className="font-medium text-blue-600">
                          {batch.totalCost} credits
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>{" "}
                        <span className="font-medium">
                          {formatDate(batch.date)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                          View {batch.purchases.length} items in this batch
                        </summary>
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-200">
                          {batch.purchases.map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between text-xs"
                            >
                              <span>
                                {p.resource?.name ||
                                  `Resource #${p.resource_id}`}{" "}
                                x{p.quantity}
                                {p.quantity !== p.requested_quantity && (
                                  <span className="text-orange-600 ml-1">
                                    (requested {p.requested_quantity})
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-500">
                                {(p.resource?.cost || 0) * p.quantity} credits
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>

                  {batch.batchId && (
                    <Link to={`/admin/purchases/batch/${batch.batchId}`}>
                      <Button size="sm">View/Edit Batch</Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}

            {/* Single Purchases (non-batch) */}
            {singlePurchases.map((purchase) => (
              <Card key={purchase.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        Purchase #{purchase.id}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          purchase.status
                        )}`}
                      >
                        {purchase.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Team:</span>{" "}
                        <span className="font-medium">
                          {purchase.team?.name || `Team #${purchase.team_id}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Resource:</span>{" "}
                        <span className="font-medium">
                          {purchase.resource?.name ||
                            `Resource #${purchase.resource_id}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity:</span>{" "}
                        <span className="font-medium">{purchase.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Price:</span>{" "}
                        <span className="font-medium">
                          {purchase.resource?.cost || 0} credits
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>{" "}
                        <span className="font-medium text-blue-600">
                          {(purchase.resource?.cost || 0) * purchase.quantity}{" "}
                          credits
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>{" "}
                        <span className="font-medium">
                          {formatDate(purchase.purchase_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/admin/purchases/${purchase.id}`}>
                    <Button size="sm">View Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
