import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Resource, resourceApi, cartManager } from "@/lib/api";
import { validateAddToCart, getMaxQuantityAllowed } from "@/lib/cartUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Coins,
  Package,
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
  Plus,
  Minus,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [maxAllowed, setMaxAllowed] = useState(0);
  const { team } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      loadResource(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadResource = async (resourceId: number) => {
    setIsLoading(true);
    try {
      const data = await resourceApi.getById(resourceId);
      setResource(data);

      // Calculate max allowed quantity
      const max = await getMaxQuantityAllowed(data);
      setMaxAllowed(max);
    } catch (error) {
      console.error("Failed to load resource:", error);
      showToast({
        message: "Échec du chargement de la ressource",
        type: "error",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!resource) return;

    // Validate before adding
    const validation = await validateAddToCart(resource, quantity);

    if (!validation.success) {
      showToast({
        message: validation.error || "Impossible d'ajouter au panier",
        type: "error",
      });
      return;
    }

    cartManager.addItem(resource, quantity);
    showToast({
      message: `${quantity}x ${resource.name} ajouté au panier!`,
      type: "success",
    });
    window.dispatchEvent(new Event("cart-updated"));

    // Refresh max allowed
    const max = await getMaxQuantityAllowed(resource);
    setMaxAllowed(max);
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate("/cart");
  };

  const incrementQuantity = () => {
    if (quantity < maxAllowed) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "service":
        return "bg-blue-100 text-blue-800";
      case "matériel":
        return "bg-green-100 text-green-800";
      case "avantage":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Ressource non trouvée</p>
            <Link to="/">
              <Button className="mt-4">Retour au magasin</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalCost = resource.cost * quantity;
  const canAfford = team ? team.credit >= totalCost : false;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-6 flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au magasin</span>
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="aspect-square relative bg-gray-100">
              {resource.image_url ? (
                <img
                  src={resource.image_url}
                  alt={resource.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-32 h-32 text-gray-400" />
                </div>
              )}
              {!resource.is_active && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="text-white font-semibold text-2xl">
                    Indisponible
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {resource.name}
              </h1>
              <span
                className={`text-sm px-3 py-1 rounded-full ${getTypeColor(
                  resource.type
                )} whitespace-nowrap`}
              >
                {resource.type}
              </span>
            </div>

            <p className="text-gray-600 mb-6">{resource.description}</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600">Prix à l'unité:</span>
                <div className="flex items-center space-x-1">
                  <Coins className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-xl">{resource.cost}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600">Quantité disponible:</span>
                <span className="font-semibold">{resource.quantity}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600">Max par équipe:</span>
                <span className="font-semibold">{resource.max_per_team}</span>
              </div>

              {!resource.is_non_returnable && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-sm font-medium text-orange-800">
                    🚫 Article doit être impérativement retourné
                  </p>
                </div>
              )}
            </div>

            {resource.is_active && resource.quantity > 0 && (
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">Quantité:</span>
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-6 py-2 font-semibold">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= maxAllowed || maxAllowed === 0}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    Max: {maxAllowed}
                  </span>
                </div>

                {/* Total Cost */}
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-lg text-gray-700">Total:</span>
                  <div className="flex items-center space-x-2">
                    <Coins className="w-6 h-6 text-yellow-600" />
                    <span className="font-bold text-2xl">{totalCost}</span>
                  </div>
                </div>

                {!canAfford && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">
                      ⚠️ Crédits insuffisants. Vous avez besoin de{" "}
                      {totalCost - (team?.credit || 0)} coins supplémentaires.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Ajouter au panier</span>
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={!canAfford}
                    className="flex-1"
                  >
                    Acheter maintenant
                  </Button>
                </div>
              </div>
            )}

            {!resource.is_active && (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">
                  Cette ressource est actuellement indisponible
                </p>
              </div>
            )}

            {resource.is_active && resource.quantity === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">
                  Cette ressource est en rupture de stock
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
