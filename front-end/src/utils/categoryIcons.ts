/**
 * Shared category-to-icon mapping used by useStore, AddTransactionModal, and
 * TransactionDetailsModal.  Having a single source of truth prevents the three
 * copies from drifting out of sync. (I5)
 */
export const CATEGORY_ICON_MAP: Record<string, string> = {
  food: 'restaurant',
  groceries: 'local_grocery_store',
  grocery: 'local_grocery_store',
  transport: 'commute',
  transportation: 'commute',
  travel: 'flight_takeoff',
  shopping: 'shopping_bag',
  bills: 'receipt_long',
  bill: 'receipt_long',
  utilities: 'bolt',
  health: 'health_and_safety',
  healthcare: 'health_and_safety',
  medical: 'health_and_safety',
  entertainment: 'movie',
  dining: 'restaurant',
  salary: 'payments',
  income: 'savings',
  housing: 'home',
  rent: 'home',
  fitness: 'fitness_center',
  gym: 'fitness_center',
  education: 'school',
  pets: 'pets',
  gifts: 'card_giftcard',
  subscriptions: 'subscriptions',
}

/**
 * Derives a Material Symbols icon name from a category string.
 * Falls back to a sensible type-based default when the category is not in the map.
 */
export function iconForCategory(category: string, txType: 'expense' | 'income' = 'expense'): string {
  return CATEGORY_ICON_MAP[category.toLowerCase()] ?? (txType === 'income' ? 'account_balance' : 'shopping_cart')
}

/**
 * Variant used by the store's recalculateBudget — returns a category icon or
 * the generic 'category' fallback (no type context needed there).
 */
export function categoryIcon(category: string): string {
  return CATEGORY_ICON_MAP[category.toLowerCase()] ?? 'category'
}
