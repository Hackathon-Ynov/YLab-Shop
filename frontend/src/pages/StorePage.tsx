import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ResourceCard } from "@/components/ResourceCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Resource, resourceApi, cartManager } from "@/lib/api";
import { validateAddToCart } from "@/lib/cartUtils";
import { Search, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function StorePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resourceApi.getAll();
      setResources(data);
    } catch (error) {
      console.error("Failed to load resources:", error);
      showToast({
        message: "Échec du chargement des ressources",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const filterResources = useCallback(() => {
    let filtered = resources;

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((r) => r.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      );
    }

    setFilteredResources(filtered);
  }, [resources, searchQuery, selectedType]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useEffect(() => {
    filterResources();
  }, [filterResources]);

  const handleAddToCart = async (resource: Resource) => {
    // Validate before adding
    const validation = await validateAddToCart(resource, 1);

    if (!validation.success) {
      showToast({
        message: validation.error || "Impossible d'ajouter au panier",
        type: "error",
      });
      return;
    }

    cartManager.addItem(resource, 1);
    showToast({
      message: `${resource.name} ajouté au panier !`,
      type: "success",
    });
    // Force navigation update by triggering a custom event
    window.dispatchEvent(new Event("cart-updated"));
  };

  const recommendations = resources
    .filter((r) => r.is_active && r.quantity > 0)
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue dans la boutique d'équipe
          </h1>
          <p className="text-gray-600">
            Naviguez et achetez des ressources avec les crédits de votre équipe
          </p>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Recommandé pour vous
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher des ressources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les types</option>
                <option value="service">Services</option>
                <option value="matériel">Matériel</option>
                <option value="avantage">Avantages</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={loadResources}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rafraîchir</span>
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredResources.length} sur {resources.length} ressources
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucune ressource trouvée</p>
            <p className="text-gray-400 text-sm mt-2">
              Essayez d'ajuster votre recherche ou vos filtres
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
