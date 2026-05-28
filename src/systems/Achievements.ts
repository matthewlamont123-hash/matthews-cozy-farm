export interface AchievementStats {
  totalHarvests: number
  totalSells: number
  totalCoinsEarned: number
  maxCombo: number
  questsCompleted: number
  prestiges: number
  hybridsDiscovered: number
  dailyStreakBest: number
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  emoji: string
  check: (s: AchievementStats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_harvest', name: 'First Pick', description: 'Harvest your first crop.', emoji: '🌱', check: (s) => s.totalHarvests >= 1 },
  { id: 'harvest_50', name: 'Busy Farmer', description: 'Harvest 50 crops.', emoji: '🧺', check: (s) => s.totalHarvests >= 50 },
  { id: 'harvest_500', name: 'Harvest Hero', description: 'Harvest 500 crops.', emoji: '🏆', check: (s) => s.totalHarvests >= 500 },
  { id: 'combo_5', name: 'Quick Hands', description: 'Reach a 5× harvest combo.', emoji: '⚡', check: (s) => s.maxCombo >= 5 },
  { id: 'combo_10', name: 'Combo King', description: 'Reach a 10× harvest combo.', emoji: '👑', check: (s) => s.maxCombo >= 10 },
  { id: 'sell_1000', name: 'Market Regular', description: 'Earn 1,000 coins total.', emoji: '🪙', check: (s) => s.totalCoinsEarned >= 1000 },
  { id: 'sell_10000', name: 'Tycoon Soil', description: 'Earn 10,000 coins total.', emoji: '💰', check: (s) => s.totalCoinsEarned >= 10000 },
  { id: 'quest_3', name: 'Helpful Neighbor', description: 'Complete 3 NPC quests.', emoji: '🤝', check: (s) => s.questsCompleted >= 3 },
  { id: 'prestige_1', name: 'Fresh Start', description: 'Prestige once.', emoji: '🌅', check: (s) => s.prestiges >= 1 },
  { id: 'hybrid_1', name: 'Plant Scientist', description: 'Discover a hybrid crop.', emoji: '🧬', check: (s) => s.hybridsDiscovered >= 1 },
  { id: 'streak_7', name: 'Week of Cozy', description: 'Reach a 7-day daily streak.', emoji: '🎁', check: (s) => s.dailyStreakBest >= 7 },
]

export class AchievementSystem {
  unlocked = new Set<string>()
  stats: AchievementStats = {
    totalHarvests: 0,
    totalSells: 0,
    totalCoinsEarned: 0,
    maxCombo: 0,
    questsCompleted: 0,
    prestiges: 0,
    hybridsDiscovered: 0,
    dailyStreakBest: 0,
  }

  checkNew(): AchievementDef[] {
    const fresh: AchievementDef[] = []
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue
      if (a.check(this.stats)) {
        this.unlocked.add(a.id)
        fresh.push(a)
      }
    }
    return fresh
  }

  hydrate(unlocked: string[], stats: Partial<AchievementStats>): void {
    this.unlocked = new Set(unlocked)
    this.stats = { ...this.stats, ...stats }
  }
}
