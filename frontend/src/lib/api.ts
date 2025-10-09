// Token management
interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

// Team interfaces
export interface TeamProfile {
  id: number;
  name: string;
  email: string;
  credit: number;
  last_activity: string;
}

// Admin interfaces
export interface AdminProfile {
  id: number;
  username: string;
  email: string;
}

// Team Composition interfaces
export interface TeamComposition {
  id: number;
  name: string;
  dev_total: number;
  infra_total: number;
  data_total: number;
  iot_total: number;
  sysemb_total: number;
  dev_filled: number;
  infra_filled: number;
  data_filled: number;
  iot_filled: number;
  sysemb_filled: number;
  created_at: string;
  updated_at: string;
}

export interface ToggleSlotRequest {
  department: "dev" | "infra" | "data" | "iot" | "sysemb";
  action: "fill" | "empty";
}

// Resource interfaces
export interface Resource {
  id: number;
  name: string;
  description: string;
  cost: number;
  quantity: number;
  max_per_team: number;
  type: "service" | "matériel" | "avantage";
  image_url: string;
  is_active: boolean;
  is_non_returnable: boolean;
  created_at: string;
  updated_at: string;
}

// Purchase interfaces
export interface Purchase {
  id: number;
  batch_id?: string; // Groups multiple items purchased together
  team_id: number;
  resource_id: number;
  quantity: number;
  requested_quantity: number; // Original quantity requested
  comment: string; // Required comment explaining why the purchase is needed
  purchase_date: string;
  is_returned: boolean;
  needs_return: boolean; // Marks if item needs to be returned
  status: "en attente" | "confirmé" | "annulé";
  created_at: string;
  updated_at: string;
  team?: TeamProfile;
  resource?: Resource;
}

export interface PurchaseItem {
  resource_id: number;
  quantity: number;
}

export interface BatchPurchaseRequest {
  items: PurchaseItem[];
  comment: string; // Required comment (min 10 chars)
}

export interface PurchaseItemAction {
  purchase_id: number;
  action: "confirm" | "cancel";
  approved_quantity?: number; // If provided, overrides requested quantity
}

// Cart management (localStorage)
export interface CartItem {
  resource: Resource;
  quantity: number;
}

// interface LoginResponse {
//   access_token: string;
// }

// Helper function to get the correct base path for redirects
function getBasePath(): string {
  // This gets the base path from the document.baseURI or falls back to "/"
  const base = document.querySelector("base")?.href || document.baseURI;
  const url = new URL(base);
  return url.pathname;
}

// Helper function to redirect to login page respecting basename
function redirectToLogin(): void {
  window.location.href = getBasePath();
}

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "access_token";
  private static readonly REFRESH_TOKEN_KEY = "refresh_token";
  private static readonly TOKEN_EXPIRY_KEY = "token_expiry";

  static setTokens(tokenData: TokenData): void {
    const expiryTime = Date.now() + tokenData.expires_in * 1000;

    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokenData.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refresh_token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;

    // Consider token expired if it expires in the next 5 minutes
    return Date.now() > parseInt(expiryTime) - 5 * 60 * 1000;
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  static hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const API_BASE = "/api";

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = TokenManager.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await authApi.tryRefreshToken();
      if (!refreshed) {
        // Redirect to login or handle auth error
        TokenManager.clearTokens();
        redirectToLogin();
        throw new ApiError("Unauthorized", 401);
      }
      // If refresh was successful, the original request should be retried by the caller
      throw new ApiError("Token expired", 401);
    }

    let errorMessage = "An error occurred";
    try {
      const errorData: ErrorResponse = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

// Auth functions
export const authApi = {
  // Check if user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Login with username/password
  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; team?: TeamProfile; token?: string }> {
    try {
      const response = await fetch(`${API_BASE}/auth/team/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: username, password }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          TokenManager.setTokens({
            access_token: data.token,
            refresh_token: data.token,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours
          });
        }
        return { success: true, team: data.team, token: data.token };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  // Logout - revoke tokens on server and clear local storage
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to blacklist the current token
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
    } catch {
      // Clear tokens on error
      TokenManager.clearTokens();
    } finally {
      // Always clear local tokens regardless of server response
      TokenManager.clearTokens();
      // Redirect to login page
      redirectToLogin();
    }
  },

  // Try to refresh the access token
  async tryRefreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: "include",
      });

      if (response.ok) {
        //const tokenData: LoginResponse = await response.json();
        //TokenManager.setTokens(tokenData);
        return true;
      } else {
        // Refresh failed, clear tokens
        TokenManager.clearTokens();
        return false;
      }
    } catch {
      TokenManager.clearTokens();
      return false;
    }
  },

  // Admin login
  async adminLogin(
    username: string,
    password: string
  ): Promise<{ success: boolean; admin?: AdminProfile; token?: string }> {
    try {
      const response = await fetch(`${API_BASE}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          TokenManager.setTokens({
            access_token: data.token,
            refresh_token: data.token,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours
          });
          // Store admin flag
          localStorage.setItem("is_admin", "true");
        }
        return { success: true, admin: data.admin, token: data.token };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },
};

// Team API
export const teamApi = {
  // Get team profile
  async getProfile(): Promise<TeamProfile> {
    const response = await fetch(`${API_BASE}/team/profile`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Update team profile
  async updateProfile(email: string): Promise<TeamProfile> {
    const response = await fetch(`${API_BASE}/team/profile`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get team purchases
  async getPurchases(): Promise<Purchase[]> {
    const response = await fetch(`${API_BASE}/team/purchases`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },
};

// Resource API
export const resourceApi = {
  // Get all resources with optional type filter
  async getAll(type?: string): Promise<Resource[]> {
    const url = type
      ? `${API_BASE}/resources?type=${encodeURIComponent(type)}`
      : `${API_BASE}/resources`;
    const response = await fetch(url, {
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get single resource by ID
  async getById(id: number): Promise<Resource> {
    const response = await fetch(`${API_BASE}/resources/${id}`, {
      credentials: "include",
    });
    return handleResponse(response);
  },
};

// Purchase API
export const purchaseApi = {
  // Create a single purchase
  async create(resourceId: number, quantity: number): Promise<Purchase> {
    const response = await fetch(`${API_BASE}/team/purchases`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resource_id: resourceId, quantity }),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Create batch purchase (checkout cart)
  async createBatch(request: BatchPurchaseRequest): Promise<Purchase[]> {
    const response = await fetch(`${API_BASE}/team/purchases/batch`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Return a purchase (marks as physically returned, no refund)
  async return(purchaseId: number): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE}/team/purchases/${purchaseId}/return`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      }
    );
    return handleResponse(response);
  },

  // Get team's purchases
  async getTeamPurchases(needsReturn?: boolean): Promise<Purchase[]> {
    const url = needsReturn
      ? `${API_BASE}/team/purchases?needs_return=true`
      : `${API_BASE}/team/purchases`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },
};

// Admin API
export const adminApi = {
  // Get all purchases (admin only)
  async getAllPurchases(
    status?: string,
    teamId?: number,
    needsReturn?: boolean
  ): Promise<Purchase[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (teamId) params.append("team_id", teamId.toString());
    if (needsReturn) params.append("needs_return", "true");

    const url =
      params.toString() === ""
        ? `${API_BASE}/admin/purchases`
        : `${API_BASE}/admin/purchases?${params.toString()}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Update purchase status (admin only)
  async updatePurchaseStatus(
    purchaseId: number,
    action: "confirm" | "cancel"
  ): Promise<Purchase> {
    const response = await fetch(
      `${API_BASE}/admin/purchases/${purchaseId}/action`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
        credentials: "include",
      }
    );
    return handleResponse(response);
  },

  // Update batch purchase status with quantity adjustments (admin only)
  async updateBatchPurchaseStatus(items: PurchaseItemAction[]): Promise<{
    message: string;
    results: Array<{
      purchase_id: number;
      success: boolean;
      error?: string;
      status?: string;
      quantity?: number;
    }>;
  }> {
    const response = await fetch(`${API_BASE}/admin/purchases/batch/action`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get all teams (admin only)
  async getAllTeams(): Promise<TeamProfile[]> {
    const response = await fetch(`${API_BASE}/admin/teams`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Mark purchase as returned (admin only)
  async markPurchaseAsReturned(
    purchaseId: number
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE}/admin/purchases/${purchaseId}/mark-returned`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      }
    );
    return handleResponse(response);
  },

  // Unmark purchase as returned (admin only)
  async unmarkPurchaseAsReturned(
    purchaseId: number
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE}/admin/purchases/${purchaseId}/unmark-returned`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      }
    );
    return handleResponse(response);
  },

  // Get all team compositions (admin only)
  async getAllTeamCompositions(): Promise<TeamComposition[]> {
    const response = await fetch(`${API_BASE}/admin/team-compositions`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Toggle team slot (admin only)
  async toggleTeamSlot(
    teamId: number,
    request: ToggleSlotRequest
  ): Promise<TeamComposition> {
    const response = await fetch(
      `${API_BASE}/admin/team-compositions/${teamId}/toggle`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        credentials: "include",
      }
    );
    return handleResponse(response);
  },
};

// Cart management in localStorage
export const cartManager = {
  CART_KEY: "shopping_cart",

  // Get cart items
  getCart(): CartItem[] {
    const cartJson = localStorage.getItem(this.CART_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
  },

  // Add item to cart
  addItem(resource: Resource, quantity: number): void {
    const cart = this.getCart();
    const existingIndex = cart.findIndex(
      (item) => item.resource.id === resource.id
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ resource, quantity });
    }

    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
  },

  // Update item quantity
  updateQuantity(resourceId: number, quantity: number): void {
    const cart = this.getCart();
    const existingIndex = cart.findIndex(
      (item) => item.resource.id === resourceId
    );

    if (existingIndex >= 0) {
      if (quantity <= 0) {
        cart.splice(existingIndex, 1);
      } else {
        cart[existingIndex].quantity = quantity;
      }
      localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
    }
  },

  // Remove item from cart
  removeItem(resourceId: number): void {
    const cart = this.getCart().filter(
      (item) => item.resource.id !== resourceId
    );
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
  },

  // Clear cart
  clearCart(): void {
    localStorage.removeItem(this.CART_KEY);
  },

  // Get total cost
  getTotalCost(): number {
    return this.getCart().reduce(
      (total, item) => total + item.resource.cost * item.quantity,
      0
    );
  },

  // Get total items count
  getItemsCount(): number {
    return this.getCart().reduce((total, item) => total + item.quantity, 0);
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{
    status: string;
    version: string;
    uptime: number;
    auth_mode: "protected" | "unprotected";
  }> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse(response);
  },
};

export { ApiError };
