export const PRESTIGE_COIN_BONUS = 0.05
export const PRESTIGE_GROWTH_BONUS = 0.03
export const PRESTIGE_MIN_COINS = 800
export const PRESTIGE_MIN_EARNED = 4000

export function prestigeCoinMult(level: number): number {
  return 1 + level * PRESTIGE_COIN_BONUS
}

export function prestigeGrowthMult(level: number): number {
  return 1 + level * PRESTIGE_GROWTH_BONUS
}

export function canPrestige(coins: number, totalEarned: number, prestigeLevel: number): boolean {
  void prestigeLevel
  return coins >= PRESTIGE_MIN_COINS || totalEarned >= PRESTIGE_MIN_EARNED
}

export function prestigeRewardCoins(level: number): number {
  return 80 + level * 40
}
