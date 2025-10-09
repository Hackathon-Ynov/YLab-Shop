import { Resource } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

interface ResourceCardProps {
  resource: Resource;
  onAddToCart?: (resource: Resource) => void;
}

export function ResourceCard({ resource, onAddToCart }: ResourceCardProps) {
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(resource);
    }
  };

  return (
    <Link to={`/resource/${resource.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <div className="aspect-video relative overflow-hidden bg-gray-100">
          {resource.image_url ? (
            <img
              src={resource.image_url}
              alt={resource.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {!resource.is_active && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                Unavailable
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-2">
              {resource.name}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getTypeColor(
                resource.type
              )} whitespace-nowrap ml-2`}
            >
              {resource.type}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {resource.description}
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Available: {resource.quantity}</span>
            <span>Max: {resource.max_per_team}/team</span>
          </div>
          {!resource.is_non_returnable && (
            <div className="mt-2 flex items-center text-xs text-orange-600">
              <span className="font-medium">🚫 Doit être rendu</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Coins className="w-5 h-5 text-yellow-600" />
            <span className="font-bold text-lg">{resource.cost}</span>
          </div>
          {resource.is_active && onAddToCart && (
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="flex items-center space-x-1"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Ajouter au panier</span>
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
