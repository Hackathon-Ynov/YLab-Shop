import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cartManager, purchaseApi, CartItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Coins,
  Package,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [comment, setComment] = useState("");
  const { team, refreshTeamProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadCart();

    // Listen for cart updates
    const handleCartUpdate = () => loadCart();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  const loadCart = () => {
    setCartItems(cartManager.getCart());
  };

  const updateQuantity = (resourceId: number, newQuantity: number) => {
    cartManager.updateQuantity(resourceId, newQuantity);
    loadCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  const removeItem = (resourceId: number) => {
    cartManager.removeItem(resourceId);
    loadCart();
    showToast({ message: "Item removed from cart", type: "info" });
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast({ message: "Votre panier est vide", type: "warning" });
      return;
    }

    // Validate comment
    if (comment.trim().length < 10) {
      showToast({
        message:
          "Veuillez fournir un commentaire d'au moins 10 caractères expliquant pourquoi vous avez besoin de ces ressources",
        type: "error",
      });
      return;
    }

    const totalCost = cartManager.getTotalCost();
    if (!team || team.credit < totalCost) {
      showToast({
        message: "Crédits insuffisants pour finaliser l'achat",
        type: "error",
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const items = cartItems.map((item) => ({
        resource_id: item.resource.id,
        quantity: item.quantity,
      }));

      await purchaseApi.createBatch({
        items,
        comment: comment.trim(),
      });
      cartManager.clearCart();
      setComment("");
      await refreshTeamProfile();

      showToast({
        message:
          "Achat effectué avec succès ! En attente de confirmation de l'administrateur.",
        type: "success",
      });

      navigate("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Échec de l'achat";
      showToast({ message, type: "error" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalCost = cartManager.getTotalCost();
  const totalItems = cartManager.getItemsCount();
  const canAfford = team ? team.credit >= totalCost : false;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panier</h1>
            <p className="text-gray-600">
              {totalItems} {totalItems === 1 ? "article" : "articles"} dans
              votre panier
            </p>
          </div>
          <Link to="/">
            <Button variant="ghost" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Continuer vos achats</span>
            </Button>
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Votre panier est vide
                </h3>
                <p className="text-gray-600 mb-6">
                  Parcourez notre boutique pour trouver des ressources pour
                  votre équipe
                </p>
                <Link to="/">
                  <Button className="flex items-center space-x-2 mx-auto">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Parcourir la boutique</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.resource.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        {item.resource.image_url ? (
                          <img
                            src={item.resource.image_url}
                            alt={item.resource.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/resource/${item.resource.id}`}
                              className="font-semibold text-lg hover:text-blue-600 block truncate"
                            >
                              {item.resource.name}
                            </Link>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {item.resource.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.resource.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Qt:</span>
                            <div className="flex items-center border border-gray-300 rounded-md">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.resource.id,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1}
                                className="p-1 hover:bg-gray-100 disabled:opacity-50"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 py-1 text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.resource.id,
                                    item.quantity + 1
                                  )
                                }
                                disabled={
                                  item.quantity >= item.resource.quantity ||
                                  item.quantity >= item.resource.max_per_team
                                }
                                className="p-1 hover:bg-gray-100 disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex items-center space-x-1">
                            <Coins className="w-5 h-5 text-yellow-600" />
                            <span className="font-bold text-lg">
                              {item.resource.cost * item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Résumé de la commande
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Articles ({totalItems})
                      </span>
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold">{totalCost}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">Total</span>
                        <div className="flex items-center space-x-1">
                          <Coins className="w-6 h-6 text-yellow-600" />
                          <span className="font-bold text-2xl">
                            {totalCost}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {team && (
                    <div className="mb-6 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Votre solde</span>
                        <div className="flex items-center space-x-1">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span className="font-semibold">{team.credit}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Après achat</span>
                        <div className="flex items-center space-x-1">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span
                            className={`font-semibold ${
                              canAfford ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {team.credit - totalCost}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!canAfford && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        ⚠️ Crédits insuffisants. Vous avez besoin de{" "}
                        {totalCost - (team?.credit || 0)} coins supplémentaires.
                      </p>
                    </div>
                  )}

                  {/* Comment Section */}
                  <div className="mb-4">
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Commentaire (obligatoire)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Expliquez pourquoi vous avez besoin de ces ressources (minimum 10 caractères)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      minLength={10}
                      maxLength={3000}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {comment.length} / 10 caractères minimum
                    </p>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={
                      isCheckingOut || !canAfford || comment.trim().length < 10
                    }
                    className="w-full"
                  >
                    {isCheckingOut ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Passer à la caisse
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    Votre achat sera en attente de confirmation par un admin
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
