import {
  BASE_PLOT_SIZE,
  MAX_LAND_EXPANSIONS,
  UPGRADE_NODES,
  getNode,
  type UpgradeCategory,
  type UpgradeNode,
} from '../data/upgrades'
import type { AutomationKind } from '../game/types'
import type { Inventory } from './Inventory'
import type { Farm } from './Farm'

export class UpgradesSystem {
  owned = new Set<string>()
  unlockedDecors = new Set<string>()
  tractorRadius = 0
  growthSpeedMult = 1
  cropValueMult = 1
  harvestSpeedMult = 1
  automation: Record<AutomationKind, number> = {
    till: 0,
    plant: 0,
    water: 0,
    harvest: 0,
    sell: 0,
  }
  /** Applied backpack capacity from upgrades */
  private backpackSlots = 16
  expansionsPurchased = 0
  private inventory: Inventory
  private farm: Farm

  constructor(inventory: Inventory, farm: Farm) {
    this.inventory = inventory
    this.farm = farm
  }

  setFarm(farm: Farm): void {
    this.farm = farm
  }

  hydrateFromOwned(): void {
    this.tractorRadius = 0
    this.growthSpeedMult = 1
    this.cropValueMult = 1
    this.harvestSpeedMult = 1
    this.backpackSlots = 16
    this.expansionsPurchased = 0
    this.unlockedDecors.clear()
    this.automation = { till: 0, plant: 0, water: 0, harvest: 0, sell: 0 }

    for (const id of this.owned) {
      const n = getNode(id)
      if (!n) continue
      this.applyEffect(n, false)
    }
    this.inventory.capacity = Math.max(this.inventory.capacity, this.backpackSlots)
  }

  isOwned(id: string): boolean {
    return this.owned.has(id)
  }

  canUnlock(node: UpgradeNode): boolean {
    if (this.owned.has(node.id)) return false
    for (const req of node.requires) {
      if (!this.owned.has(req)) return false
    }
    return true
  }

  affordable(node: UpgradeNode, coins: number): boolean {
    return coins >= node.cost
  }

  /**
   * @returns false if cannot purchase
   */
  tryPurchase(node: UpgradeNode, coinsRef: { value: number }): boolean {
    if (!this.canUnlock(node)) return false
    if (coinsRef.value < node.cost) return false
    coinsRef.value -= node.cost
    this.owned.add(node.id)
    this.applyEffect(node, true)
    return true
  }

  private applyEffect(n: UpgradeNode, _mutateFarm: boolean): void {
    const e = n.effect
    switch (e.type) {
      case 'water_tier':
        this.growthSpeedMult = Math.max(this.growthSpeedMult, e.growthMult)
        break
      case 'tractor_radius':
        this.tractorRadius = Math.max(this.tractorRadius, e.radius)
        break
      case 'backpack_slots':
        this.backpackSlots = Math.max(this.backpackSlots, e.slots)
        this.inventory.capacity = this.backpackSlots
        break
      case 'grid_expand':
        this.expansionsPurchased += e.addRowsCols
        break
      case 'unlock_crop_tier':
        break
      case 'decor':
        this.unlockedDecors.add(e.decorId)
        break
      case 'automation':
        this.automation[e.kind] = Math.max(this.automation[e.kind], e.level)
        break
      case 'crop_value':
        this.cropValueMult = Math.max(this.cropValueMult, e.mult)
        break
      case 'harvest_speed':
        this.harvestSpeedMult = Math.max(this.harvestSpeedMult, e.mult)
        break
      default:
        break
    }
  }

  applyPendingLandExpansion(): void {
    const size = this.currentPlotSize()
    if (farmSizeMatches(this.farm, size)) return
    this.farm.resize(size, size)
  }

  currentPlotSize(): number {
    return BASE_PLOT_SIZE + this.expansionsPurchased
  }

  maxPlotSize(): number {
    return BASE_PLOT_SIZE + MAX_LAND_EXPANSIONS
  }

  listByCategory(cat: UpgradeCategory): UpgradeNode[] {
    return UPGRADE_NODES.filter((n) => n.category === cat)
  }
}

function farmSizeMatches(farm: Farm, size: number): boolean {
  return farm.w === size && farm.h === size
}
