import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Purchase, purchaseApi } from "@/lib/api";
import {
  Package,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Coins,
  Calendar,
  AlertCircle,
  PackageCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

// Group purchases by batch_id
interface BatchGroup {
  batchId: string | null;
  purchases: Purchase[];
  totalItems: number;
  totalCost: number;
  status: string;
  date: string;
  comment: string;
}

export function OrdersPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [needsReturnOnly, setNeedsReturnOnly] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReturnOnly]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await purchaseApi.getTeamPurchases(needsReturnOnly);
      // Sort by date, most recent first
      const sorted = data.sort(
        (a, b) =>
          new Date(b.purchase_date).getTime() -
          new Date(a.purchase_date).getTime()
      );
      setPurchases(sorted);
    } catch (error) {
      console.error("Failed to load purchases:", error);
      showToast({
        message: "Échec du chargement des commandes",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "en attente":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "confirmé":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "annulé":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmé":
        return "bg-green-100 text-green-800 border-green-200";
      case "annulé":
        return "bg-red-100 text-red-800 border-red-200";
      case "mixte":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Group purchases by batch_id
  const batchGroups: BatchGroup[] = [];
  const processedBatches = new Set<string>();
  const singlePurchases: Purchase[] = [];

  const filteredPurchases = purchases.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  filteredPurchases.forEach((purchase) => {
    if (purchase.batch_id && !processedBatches.has(purchase.batch_id)) {
      processedBatches.add(purchase.batch_id);
      const batchPurchases = filteredPurchases.filter(
        (p) => p.batch_id === purchase.batch_id
      );

      // Determine batch status
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
      });
    } else if (!purchase.batch_id) {
      singlePurchases.push(purchase);
    }
  });

  // Stats calculation
  const stats = {
    total: purchases.length,
    pending: purchases.filter((p) => p.status === "en attente").length,
    confirmed: purchases.filter((p) => p.status === "confirmé").length,
    cancelled: purchases.filter((p) => p.status === "annulé").length,
    needsReturn: purchases.filter(
      (p) => p.needs_return && !p.is_returned && p.status === "confirmé"
    ).length,
    totalSpent: purchases
      .filter((p) => p.status === "confirmé")
      .reduce((sum, p) => sum + (p.resource?.cost || 0) * p.quantity, 0),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mes Commandes</h1>
          <p className="text-gray-600">
            Consultez l'historique de vos achats et leur statut
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmés</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.confirmed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annulés</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.cancelled}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">À retourner</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.needsReturn}
                </p>
              </div>
              <PackageCheck className="w-8 h-8 text-orange-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dépensé</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalSpent}
                </p>
              </div>
              <Coins className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              Toutes
            </Button>
            <Button
              variant={filterStatus === "en attente" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("en attente")}
            >
              En attente
            </Button>
            <Button
              variant={filterStatus === "confirmé" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("confirmé")}
            >
              Confirmées
            </Button>
            <Button
              variant={filterStatus === "annulé" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("annulé")}
            >
              Annulées
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="needsReturnFilter"
              checked={needsReturnOnly}
              onChange={(e) => setNeedsReturnOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="needsReturnFilter"
              className="text-sm font-medium text-gray-700"
            >
              Afficher uniquement les articles à retourner
            </label>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-2" />
            <p className="text-gray-600">Chargement des commandes...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Aucune commande trouvée</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Batch Groups */}
            {batchGroups.map((batch) => (
              <Card key={batch.batchId}>
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">
                          Commande groupée #{batch.batchId}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                            batch.status
                          )}`}
                        >
                          {batch.status}
                        </span>
                        {batch.purchases.some(
                          (p) => p.needs_return && !p.is_returned
                        ) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            À retourner
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(batch.date).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-md text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium">Commentaire:</span>{" "}
                          {batch.comment}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <span>{batch.purchases.length} articles</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-5 h-5 text-yellow-600" />
                        <span className="text-2xl font-bold">
                          {batch.totalCost}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-3">
                    {batch.purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {purchase.resource?.image_url && (
                            <img
                              src={purchase.resource.image_url}
                              alt={purchase.resource.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {purchase.resource?.name ||
                                `Resource #${purchase.resource_id}`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Quantité: {purchase.quantity}
                              {purchase.quantity !==
                                purchase.requested_quantity && (
                                <span className="text-orange-600 ml-1">
                                  (demandé: {purchase.requested_quantity})
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(
                                  purchase.status
                                )}`}
                              >
                                {getStatusIcon(purchase.status)}
                                {purchase.status}
                              </span>
                              {!purchase.resource?.is_non_returnable && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                  🚫 Doit être rendu
                                </span>
                              )}
                              {purchase.is_returned && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                  Retourné
                                </span>
                              )}
                              {purchase.needs_return &&
                                !purchase.is_returned &&
                                purchase.status === "confirmé" && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                    Doit être rendu
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-2">
                            <Coins className="w-4 h-4 text-yellow-600" />
                            <span className="text-lg font-bold">
                              {(purchase.resource?.cost || 0) *
                                purchase.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                    <p className="italic">
                      ℹ️ Le retour d'un article le marque comme physiquement
                      retourné.{" "}
                      <strong>Aucun remboursement n'est effectué.</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Single Purchases (non-batch) */}
            {singlePurchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {purchase.resource?.image_url && (
                        <img
                          src={purchase.resource.image_url}
                          alt={purchase.resource.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold">
                            {purchase.resource?.name ||
                              `Resource #${purchase.resource_id}`}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border inline-flex items-center gap-1 ${getStatusColor(
                              purchase.status
                            )}`}
                          >
                            {getStatusIcon(purchase.status)}
                            {purchase.status}
                          </span>
                          {!purchase.resource?.is_non_returnable && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              🚫 Doit être rendu
                            </span>
                          )}
                          {purchase.is_returned && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              Retourné
                            </span>
                          )}
                          {purchase.needs_return &&
                            !purchase.is_returned &&
                            purchase.status === "confirmé" && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                Doit être rendu
                              </span>
                            )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {purchase.resource?.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(
                              purchase.purchase_date
                            ).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <div>Quantité: {purchase.quantity}</div>
                          <div>
                            Type:{" "}
                            <span className="capitalize">
                              {purchase.resource?.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1 mb-3">
                        <Coins className="w-6 h-6 text-yellow-600" />
                        <span className="text-3xl font-bold">
                          {(purchase.resource?.cost || 0) * purchase.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
