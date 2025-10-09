import { Resource, Purchase, cartManager, purchaseApi } from "./api";

export interface CartValidationResult {
  success: boolean;
  error?: string;
  maxQuantityAllowed?: number;
}

/**
 * Validates if a resource can be added to cart with the specified quantity
 * Checks:
 * - Resource availability (quantity in stock)
 * - Team quota (max per team considering existing purchases)
 * - Cart limits
 */
export async function validateAddToCart(
  resource: Resource,
  quantityToAdd: number
): Promise<CartValidationResult> {
  // Check if resource is active
  if (!resource.is_active) {
    return {
      success: false,
      error: "This resource is not available",
    };
  }

  // Check if quantity is valid
  if (quantityToAdd <= 0) {
    return {
      success: false,
      error: "Quantity must be greater than 0",
    };
  }

  // Check if enough stock available
  if (resource.quantity < quantityToAdd) {
    return {
      success: false,
      error: `Seulement ${resource.quantity} article(s) disponible(s)`,
      maxQuantityAllowed: resource.quantity,
    };
  }

  try {
    // Get team's existing purchases for this resource
    const purchases = await purchaseApi.getTeamPurchases();

    // Calculate total quantity already purchased (confirmed + pending)
    const purchasedQuantity = purchases
      .filter(
        (p: Purchase) =>
          p.resource_id === resource.id &&
          (p.status === "confirmé" || p.status === "en attente") &&
          !p.is_returned
      )
      .reduce((sum: number, p: Purchase) => sum + p.quantity, 0);

    // Get quantity already in cart
    const cartItems = cartManager.getCart();
    const cartItem = cartItems.find((item) => item.resource.id === resource.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;

    // Calculate total quantity if we add the new items
    const totalQuantity = purchasedQuantity + quantityInCart + quantityToAdd;

    // Check against max per team
    if (totalQuantity > resource.max_per_team) {
      const remainingQuota =
        resource.max_per_team - purchasedQuantity - quantityInCart;
      return {
        success: false,
        error: `Maximum ${
          resource.max_per_team
        } par équipe. Vous avez ${purchasedQuantity} acheté/en attente et ${quantityInCart} dans le panier. Seulement ${Math.max(
          0,
          remainingQuota
        )} de plus autorisés.`,
        maxQuantityAllowed: Math.max(0, remainingQuota),
      };
    }

    // Also check against available stock
    const maxByStock = resource.quantity - quantityInCart;
    if (quantityToAdd > maxByStock) {
      return {
        success: false,
        error: `Seulement ${maxByStock} article(s) de plus peuvent être ajoutés au panier (${quantityInCart} déjà dans le panier)`,
        maxQuantityAllowed: maxByStock,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error validating cart addition:", error);
    return {
      success: false,
      error: "Failed to validate purchase limits",
    };
  }
}

/**
 * Gets the maximum quantity that can be added to cart for a resource
 */
export async function getMaxQuantityAllowed(
  resource: Resource
): Promise<number> {
  if (!resource.is_active) {
    return 0;
  }

  try {
    const purchases = await purchaseApi.getTeamPurchases();

    const purchasedQuantity = purchases
      .filter(
        (p: Purchase) =>
          p.resource_id === resource.id &&
          (p.status === "confirmé" || p.status === "en attente") &&
          !p.is_returned
      )
      .reduce((sum: number, p: Purchase) => sum + p.quantity, 0);

    const cartItems = cartManager.getCart();
    const cartItem = cartItems.find((item) => item.resource.id === resource.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;

    const remainingByQuota =
      resource.max_per_team - purchasedQuantity - quantityInCart;
    const remainingByStock = resource.quantity - quantityInCart;

    return Math.max(0, Math.min(remainingByQuota, remainingByStock));
  } catch (error) {
    console.error("Error calculating max quantity:", error);
    return 0;
  }
}

/**
 * Gets purchase statistics for a resource
 */
export async function getResourcePurchaseStats(resourceId: number): Promise<{
  purchased: number;
  pending: number;
  inCart: number;
  remainingQuota: number;
}> {
  try {
    const purchases = await purchaseApi.getTeamPurchases();

    const resourcePurchases = purchases.filter(
      (p: Purchase) => p.resource_id === resourceId && !p.is_returned
    );

    const purchased = resourcePurchases
      .filter((p: Purchase) => p.status === "confirmé")
      .reduce((sum: number, p: Purchase) => sum + p.quantity, 0);

    const pending = resourcePurchases
      .filter((p: Purchase) => p.status === "en attente")
      .reduce((sum: number, p: Purchase) => sum + p.quantity, 0);

    const cartItems = cartManager.getCart();
    const cartItem = cartItems.find((item) => item.resource.id === resourceId);
    const inCart = cartItem ? cartItem.quantity : 0;

    return {
      purchased,
      pending,
      inCart,
      remainingQuota: 0, // Will be calculated with resource max_per_team
    };
  } catch (error) {
    console.error("Error getting purchase stats:", error);
    return {
      purchased: 0,
      pending: 0,
      inCart: 0,
      remainingQuota: 0,
    };
  }
}
