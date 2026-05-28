import { CROPS, cropUnlocked, type CropId } from '../data/crops'
import type { Inventory } from './Inventory'

export class Shop {
  private coinsRef: { value: number }
  private inventory: Inventory
  private ownedUpgrades: Set<string>
  private discoveredHybrids: Set<CropId>

  constructor(
    coinsRef: { value: number },
    inventory: Inventory,
    ownedUpgrades: Set<string>,
    discoveredHybrids: Set<CropId> = new Set(),
  ) {
    this.coinsRef = coinsRef
    this.inventory = inventory
    this.ownedUpgrades = ownedUpgrades
    this.discoveredHybrids = discoveredHybrids
  }

  get coins(): number {
    return this.coinsRef.value
  }

  set coins(v: number) {
    this.coinsRef.value = v
  }

  canBuySeed(cropId: CropId): boolean {
    const def = CROPS[cropId]
    if (!cropUnlocked(def, this.ownedUpgrades, this.discoveredHybrids)) return false
    return this.coins >= def.seedBuyPrice
  }

  buySeed(cropId: CropId): boolean {
    const def = CROPS[cropId]
    if (!cropUnlocked(def, this.ownedUpgrades, this.discoveredHybrids)) return false
    if (this.coins < def.seedBuyPrice) return false
    this.coins -= def.seedBuyPrice
    this.inventory.addSeeds(cropId, 1)
    return true
  }

  buySeedBulk(cropId: CropId, amount: number): number {
    let bought = 0
    for (let i = 0; i < amount; i++) {
      if (!this.buySeed(cropId)) break
      bought++
    }
    return bought
  }
}
