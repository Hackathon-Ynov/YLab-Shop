import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authApi, teamApi, TeamProfile } from "../lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  team: TeamProfile | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshTeamProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamProfile | null>(null);

  const refreshTeamProfile = async () => {
    try {
      const profile = await teamApi.getProfile();
      setTeam(profile);
    } catch (error) {
      console.error("Failed to refresh team profile:", error);
      throw error;
    }
  };

  const checkAuth = async () => {
    try {
      // First check if we have a token in localStorage
      const token = localStorage.getItem("access_token");
      if (!token) {
        setIsAuthenticated(false);
        setTeam(null);
        setIsLoading(false);
        return;
      }

      // Try to get the team profile directly
      await refreshTeamProfile();
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      // If profile fetch fails, clear auth state
      setIsAuthenticated(false);
      setTeam(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_expiry");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const result = await authApi.login(username, password);
      setIsAuthenticated(result.success);

      if (result.success && result.team) {
        setTeam(result.team);
      }

      return result.success;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setTeam(null);
    await authApi.logout();
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        team,
        login,
        logout,
        checkAuth,
        refreshTeamProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
