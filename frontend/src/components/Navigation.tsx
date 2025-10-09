import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart,
  LogOut,
  Home,
  Menu,
  X,
  User,
  Coins,
  Store,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cartManager } from "@/lib/api";

export function Navigation() {
  const { logout, team } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Update cart count when route changes
    setCartCount(cartManager.getItemsCount());

    // Listen for cart updates
    const handleCartUpdate = () => {
      setCartCount(cartManager.getItemsCount());
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Even if logout fails, we should still redirect
    }
    // Use navigate to respect the basename configuration
    navigate("/");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={closeMobileMenu}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-500 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                YLab Hackathon
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Store</span>
              </Button>
            </Link>

            <Link to="/cart">
              <Button
                variant={isActive("/cart") ? "default" : "ghost"}
                className="flex items-center space-x-2 relative"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Panier</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/orders">
              <Button
                variant={isActive("/orders") ? "default" : "ghost"}
                className="flex items-center space-x-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Commandes</span>
              </Button>
            </Link>

            {team && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 rounded-md border border-yellow-200">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-gray-900">
                  {team.credit}
                </span>
                <span className="text-sm text-gray-600">coins</span>
              </div>
            )}

            <Link to="/account">
              <Button
                variant={isActive("/account") ? "default" : "ghost"}
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Mon compte</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              onClick={toggleMobileMenu}
              className="p-2"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3">
            <div className="flex flex-col space-y-2">
              {team && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 rounded-md border border-yellow-200 mb-2">
                  <Coins className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-gray-900">
                    {team.credit}
                  </span>
                  <span className="text-sm text-gray-600">coins</span>
                </div>
              )}

              <Link to="/" onClick={closeMobileMenu}>
                <Button
                  variant={isActive("/") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Store</span>
                </Button>
              </Link>

              <Link to="/cart" onClick={closeMobileMenu}>
                <Button
                  variant={isActive("/cart") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center space-x-2 relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Panier</span>
                  {cartCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link to="/orders" onClick={closeMobileMenu}>
                <Button
                  variant={isActive("/orders") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Commandes</span>
                </Button>
              </Link>

              <Link to="/account" onClick={closeMobileMenu}>
                <Button
                  variant={isActive("/account") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Mon compte</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                className="w-full justify-start flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
