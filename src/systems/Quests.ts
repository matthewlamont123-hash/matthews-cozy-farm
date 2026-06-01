import type { CropId, GameCropId } from '../data/crops'

export interface QuestReward {
  coins?: number
  seeds?: Partial<Record<CropId, number>>
}

export interface QuestDef {
  id: string
  npc: string
  emoji: string
  description: string
  type: 'deliver' | 'harvest_count' | 'sell_total'
  crop?: CropId
  qty: number
  reward: QuestReward
}

export const QUEST_POOL: QuestDef[] = [
  {
    id: 'q_turnip_8',
    npc: 'Old Maple',
    emoji: '🦉',
    description: 'Deliver 8 turnips for soup night.',
    type: 'deliver',
    crop: 'turnip',
    qty: 8,
    reward: { coins: 45, seeds: { carrot: 4 } },
  },
  {
    id: 'q_pumpkin_10',
    npc: 'Old Maple',
    emoji: '🦉',
    description: 'Bring 10 pumpkins for the pie festival.',
    type: 'deliver',
    crop: 'pumpkin',
    qty: 10,
    reward: { coins: 220, seeds: { corn: 6 } },
  },
  {
    id: 'q_carrot_12',
    npc: 'Bunny Baker',
    emoji: '🐰',
    description: 'Need 12 carrots for cozy muffins.',
    type: 'deliver',
    crop: 'carrot',
    qty: 12,
    reward: { coins: 90, seeds: { wheat: 5 } },
  },
  {
    id: 'q_tomato_8',
    npc: 'Bunny Baker',
    emoji: '🐰',
    description: '8 tomatoes for garden salsa.',
    type: 'deliver',
    crop: 'tomato',
    qty: 8,
    reward: { coins: 130, seeds: { sunflower: 3 } },
  },
  {
    id: 'q_harvest_30',
    npc: 'Sprout Kid',
    emoji: '🧒',
    description: 'Harvest 30 crops total.',
    type: 'harvest_count',
    qty: 30,
    reward: { coins: 100, seeds: { turnip: 6 } },
  },
  {
    id: 'q_harvest_100',
    npc: 'Sprout Kid',
    emoji: '🧒',
    description: 'Harvest 100 crops — you got this!',
    type: 'harvest_count',
    qty: 100,
    reward: { coins: 350, seeds: { strawberry: 4 } },
  },
  {
    id: 'q_sell_500',
    npc: 'Market Mouse',
    emoji: '🐭',
    description: 'Earn 500 coins from selling.',
    type: 'sell_total',
    qty: 500,
    reward: { coins: 120, seeds: { potato: 5 } },
  },
]

export class QuestSystem {
  activeId: string | null = null
  progress = 0
  completed = new Set<string>()

  pickNext(): QuestDef | null {
    const available = QUEST_POOL.filter((q) => !this.completed.has(q.id) && q.id !== this.activeId)
    if (available.length === 0) return null
    return available[Math.floor(Math.random() * available.length)]!
  }

  startQuest(q: QuestDef): void {
    this.activeId = q.id
    this.progress = 0
  }

  activeQuest(): QuestDef | undefined {
    if (!this.activeId) return undefined
    return QUEST_POOL.find((q) => q.id === this.activeId)
  }

  /** Deliver crop from satchel harvest stash. */
  tryDeliver(cropId: CropId, harvest: Map<GameCropId, number>): number {
    const q = this.activeQuest()
    if (!q || q.type !== 'deliver' || q.crop !== cropId) return 0
    const have = harvest.get(cropId) ?? 0
    const need = q.qty - this.progress
    const take = Math.min(have, need)
    if (take <= 0) return 0
    harvest.set(cropId, have - take)
    if (harvest.get(cropId) === 0) harvest.delete(cropId)
    this.progress += take
    return take
  }

  addHarvestProgress(n: number): void {
    const q = this.activeQuest()
    if (!q || q.type !== 'harvest_count') return
    this.progress = Math.min(q.qty, this.progress + n)
  }

  addSellProgress(coins: number): void {
    const q = this.activeQuest()
    if (!q || q.type !== 'sell_total') return
    this.progress = Math.min(q.qty, this.progress + coins)
  }

  isComplete(): boolean {
    const q = this.activeQuest()
    if (!q) return false
    return this.progress >= q.qty
  }

  complete(): QuestDef | null {
    const q = this.activeQuest()
    if (!q || !this.isComplete()) return null
    this.completed.add(q.id)
    this.activeId = null
    this.progress = 0
    return q
  }

  hydrate(activeId: string | null, progress: number, completed: string[]): void {
    this.activeId = activeId
    this.progress = progress
    this.completed = new Set(completed)
    if (!this.activeId) {
      const next = this.pickNext()
      if (next) this.startQuest(next)
    }
  }
}
