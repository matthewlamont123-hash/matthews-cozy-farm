import { DISCOVERY_RECIPES } from '../data/discoveries'
import { DISCOVERED_CROP_IDS } from '../data/discoveries'
import { FIELD_LIST, type FieldId } from '../data/fields'
import { TRACTOR_LIST, type TractorId } from '../data/tractors'
import type { MutationKind } from './Mutations'

export interface DiscoveryEntry {
  id: string
  discoveredAt: number
}

export class DiscoveryJournal {
  crops = new Map<string, DiscoveryEntry>()
  mutations = new Set<MutationKind>()
  tractors = new Set<TractorId>()
  fields = new Set<FieldId>(['starter'])

  discoverCrop(id: string): boolean {
    if (this.crops.has(id)) return false
    this.crops.set(id, { id, discoveredAt: Date.now() })
    return true
  }

  discoverMutation(kind: MutationKind): void {
    this.mutations.add(kind)
  }

  discoverTractor(id: TractorId): void {
    this.tractors.add(id)
  }

  discoverField(id: FieldId): void {
    this.fields.add(id)
  }

  cropCompletion(): number {
    const total = DISCOVERED_CROP_IDS.length
    const found = DISCOVERED_CROP_IDS.filter((id) => this.crops.has(id)).length
    return total > 0 ? Math.floor((found / total) * 100) : 0
  }

  recipeCompletion(): number {
    const found = DISCOVERY_RECIPES.filter((r) => this.crops.has(r.result)).length
    return Math.floor((found / DISCOVERY_RECIPES.length) * 100)
  }

  tractorCompletion(owned: Set<TractorId>): number {
    return Math.floor((owned.size / TRACTOR_LIST.length) * 100)
  }

  fieldCompletion(unlocked: Set<FieldId>): number {
    return Math.floor((unlocked.size / FIELD_LIST.length) * 100)
  }

  hydrate(data: {
    crops: Record<string, number>
    mutations: MutationKind[]
    tractors: TractorId[]
    fields: FieldId[]
  }): void {
    this.crops.clear()
    for (const [id, t] of Object.entries(data.crops)) {
      this.crops.set(id, { id, discoveredAt: t })
    }
    this.mutations = new Set(data.mutations)
    this.tractors = new Set(data.tractors)
    this.fields = new Set(data.fields.length ? data.fields : ['starter'])
  }

  toJSON() {
    return {
      crops: Object.fromEntries([...this.crops.entries()].map(([k, v]) => [k, v.discoveredAt])),
      mutations: [...this.mutations],
      tractors: [...this.tractors],
      fields: [...this.fields],
    }
  }
}
