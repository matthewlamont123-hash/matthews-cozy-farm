import type { CropId } from '../data/crops'
import { CROPS, type CropRarity } from '../data/crops'

const RARITY_ORDER: Record<CropRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  gold: 3,
  rainbow: 4,
}

export class Inventory {
  seeds: Map<CropId, number> = new Map()
  /** Harvested crops waiting to be sold */
  harvest: Map<CropId, number> = new Map()
  capacity = 16

  get usedSlots(): number {
    let n = 0
    for (const v of this.harvest.values()) n += v
    return n
  }

  get freeSlots(): number {
    return Math.max(0, this.capacity - this.usedSlots)
  }

  get fillRatio(): number {
    if (this.capacity <= 0) return 0
    return this.usedSlots / this.capacity
  }

  addSeeds(cropId: CropId, amount: number): void {
    this.seeds.set(cropId, (this.seeds.get(cropId) ?? 0) + amount)
  }

  tryConsumeSeed(cropId: CropId): boolean {
    const n = this.seeds.get(cropId) ?? 0
    if (n <= 0) return false
    this.seeds.set(cropId, n - 1)
    return true
  }

  /** Pick any seed the player has (for auto-plant fallback). */
  pickAnySeed(): CropId | null {
    for (const [id, qty] of this.seeds.entries()) {
      if (qty > 0) return id
    }
    return null
  }

  /** Returns how many units actually stored (may be partial if backpack full). */
  addHarvest(cropId: CropId, amount: number): number {
    const free = this.freeSlots
    const take = Math.min(free, amount)
    if (take <= 0) return 0
    this.harvest.set(cropId, (this.harvest.get(cropId) ?? 0) + take)
    return take
  }

  /** Sorted harvest entries by rarity then name. */
  sortedHarvest(): [CropId, number][] {
    const entries = [...this.harvest.entries()].filter(([, q]) => q > 0)
    entries.sort((a, b) => {
      const ra = RARITY_ORDER[CROPS[a[0]].rarity]
      const rb = RARITY_ORDER[CROPS[b[0]].rarity]
      if (ra !== rb) return rb - ra
      return CROPS[a[0]].name.localeCompare(CROPS[b[0]].name)
    })
    return entries
  }

  autoSort(): void {
    /* Map preserves insertion order; rebuild sorted */
    const sorted = this.sortedHarvest()
    this.harvest.clear()
    for (const [id, qty] of sorted) this.harvest.set(id, qty)
  }

  totalHarvestValue(priceFor: (id: CropId, qty: number) => number): number {
    let sum = 0
    for (const [id, qty] of this.harvest.entries()) {
      if (qty > 0) sum += priceFor(id, qty)
    }
    return sum
  }

  sellAll(coinsFor: (id: CropId, qty: number) => number): number {
    let earned = 0
    for (const [id, qty] of this.harvest.entries()) {
      if (qty <= 0) continue
      earned += coinsFor(id, qty)
    }
    this.harvest.clear()
    return earned
  }

  sellCrop(cropId: CropId, qty: number, unitPrice: number): number {
    const have = this.harvest.get(cropId) ?? 0
    const take = Math.min(have, qty)
    if (take <= 0) return 0
    this.harvest.set(cropId, have - take)
    if (this.harvest.get(cropId) === 0) this.harvest.delete(cropId)
    return take * unitPrice
  }

  toJSON(): { seeds: Record<string, number>; harvest: Record<string, number>; capacity: number } {
    return {
      seeds: Object.fromEntries(this.seeds),
      harvest: Object.fromEntries(this.harvest),
      capacity: this.capacity,
    }
  }

  static fromJSON(data: {
    seeds?: Record<string, number>
    harvest?: Record<string, number>
    capacity?: number
  }): Inventory {
    const inv = new Inventory()
    inv.capacity = data.capacity ?? 16
    if (data.seeds) {
      for (const [k, v] of Object.entries(data.seeds)) {
        inv.seeds.set(k as CropId, v)
      }
    }
    if (data.harvest) {
      for (const [k, v] of Object.entries(data.harvest)) {
        inv.harvest.set(k as CropId, v)
      }
    }
    return inv
  }
}
