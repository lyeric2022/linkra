/**
 * Price calculation utilities
 * Price is determined by Elo rating: price = elo_rating / 100
 */

/**
 * Calculate market price from Elo rating
 * @param eloRating Elo rating (defaults to 1500 if null/undefined)
 * @returns Market price in dollars
 */
export function calculatePrice(eloRating: number | null | undefined): number {
  const elo = eloRating || 1500
  return elo / 100
}

/**
 * Format price for display
 * @param eloRating Elo rating (defaults to 1500 if null/undefined)
 * @returns Formatted price string (e.g., "$15.00")
 */
export function formatPrice(eloRating: number | null | undefined): string {
  const price = calculatePrice(eloRating)
  return `$${price.toFixed(2)}`
}

