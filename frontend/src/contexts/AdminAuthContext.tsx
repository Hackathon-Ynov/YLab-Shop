import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authApi, AdminProfile } from "../lib/api";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: AdminProfile | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  const checkAuth = async () => {
    try {
      // Check if we have a token and admin flag in localStorage
      const token = localStorage.getItem("access_token");
      const isAdmin = localStorage.getItem("is_admin") === "true";

      if (!token || !isAdmin) {
        setIsAuthenticated(false);
        setAdmin(null);
        setIsLoading(false);
        return;
      }

      // For admin, we verify authentication by trying to fetch purchases
      // If it fails with 401/403, we're not authenticated
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setAdmin(null);
      localStorage.removeItem("is_admin");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const result = await authApi.adminLogin(username, password);
      setIsAuthenticated(result.success);

      if (result.success && result.admin) {
        setAdmin(result.admin);
      }

      return result.success;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setAdmin(null);
    localStorage.removeItem("is_admin");
    await authApi.logout();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        admin,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
