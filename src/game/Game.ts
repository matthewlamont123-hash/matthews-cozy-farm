import { CROPS, sellPriceWithBonus, type CropId } from '../data/crops'
import { findRecipe } from '../data/hybrids'
import { BASE_PLOT_SIZE } from '../data/upgrades'
import { getNode } from '../data/upgrades'
import { Sfx } from './Audio'
import { ParticleSystem } from './Particles'
import {
  type DecoDraw,
  type RenderFrame,
  drawSceneLayers,
  farmScreenOffset,
  renderFarm,
  screenToGrid,
  tilePixelPos,
} from './Renderer'
import type { ToolMode } from './types'
import { AchievementSystem } from '../systems/Achievements'
import { AutomationSystem } from '../systems/Automation'
import {
  canClaimDaily,
  comboBonus,
  computeDailyReward,
  goldenWindfallChance,
  nextStreak,
  registerHarvestCombo,
  rollRareBonus,
  tickCombo,
} from '../systems/Economy'
import { Farm } from '../systems/Farm'
import { Inventory } from '../systems/Inventory'
import { activePets } from '../systems/Pets'
import {
  canPrestige,
  prestigeCoinMult,
  prestigeGrowthMult,
  prestigeRewardCoins,
} from '../systems/Prestige'
import { QuestSystem } from '../systems/Quests'
import { activeSeason, seasonSellMult } from '../systems/Seasons'
import type { ActiveSeason } from '../systems/Seasons'
import { Shop } from '../systems/Shop'
import { UpgradesSystem } from '../systems/UpgradesSystem'
import { applyLoadedFarm, loadGame, saveGame } from '../systems/SaveSystem'
import { WeatherSystem, weatherGrowthMult, weatherWaterMult } from '../systems/Weather'

const DEFAULT_UPGRADES = ['water_1', 'pack_1'] as const

export type PanelId = 'none' | 'shop' | 'upgrades' | 'inventory' | 'journal'

export interface GameUICallbacks {
  onToast: (msg: string) => void
  onCoins: (n: number) => void
  onBackpack: (used: number, cap: number) => void
  onPanelState: (panel: PanelId) => void
  onToolMode: (t: ToolMode) => void
  onSelectedCrop: (c: CropId) => void
  onShopRefresh: () => void
  onUpgradesRefresh: () => void
  onInventoryRefresh: () => void
  onJournalRefresh?: () => void
  onAutomationStatus?: (line: string) => void
  onDailyReady?: (ready: boolean, streak: number) => void
  onCombo?: (count: number) => void
  onSeasonWeather?: (season: ActiveSeason, weather: string) => void
  onAchievement?: (name: string) => void
}

export class GameLoop {
  farm: Farm
  inventory: Inventory
  coins = { value: 120 }
  shop: Shop
  upgrades: UpgradesSystem
  automation = new AutomationSystem()
  weather = new WeatherSystem()
  quests = new QuestSystem()
  achievements = new AchievementSystem()
  discoveredHybrids = new Set<CropId>()
  prestigeLevel = 0
  useRealSeason = true
  gameDay = 0
  particles = new ParticleSystem()
  tool: ToolMode = 'hoe'
  selectedCrop: CropId = 'turnip'
  panel: PanelId = 'none'
  time = 0
  tractorPulse = 0
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  ui: GameUICallbacks

  combo = { count: 0, timer: 0 }
  dailyStreak = 0
  lastDailyClaim = -1

  private accumulator = 0
  private saveTimer = 0
  private dragging = false
  private dragVisited = new Set<string>()
  private dragHighlight: { gx: number; gy: number } | null = null
  hoverHighlight: { gx: number; gy: number } | null = null
  clickHighlight: { gx: number; gy: number; t: number } | null = null
  private activePointerId: number | null = null
  private shake = 0
  private expansionAnim = 0
  private seasonTimer = 0

  constructor(canvas: HTMLCanvasElement, ui: GameUICallbacks) {
    this.canvas = canvas
    const c = canvas.getContext('2d')
    if (!c) throw new Error('2d context')
    this.ctx = c
    this.ui = ui
    this.farm = new Farm(BASE_PLOT_SIZE, BASE_PLOT_SIZE)
    this.inventory = new Inventory()
    this.upgrades = new UpgradesSystem(this.inventory, this.farm)
    this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredHybrids)

    const loaded = loadGame()
    if (loaded) {
      this.coins.value = loaded.coins
      applyLoadedFarm(this.farm, loaded)
      this.inventory = Inventory.fromJSON({
        seeds: loaded.seeds,
        harvest: loaded.harvest,
        capacity: loaded.capacity,
      })
      this.upgrades = new UpgradesSystem(this.inventory, this.farm)
      loaded.upgrades.forEach((id) => this.upgrades.owned.add(id))
      this.upgrades.hydrateFromOwned()
      this.automation.hydrate(loaded.automation)
      for (const [kind, lvl] of Object.entries(this.upgrades.automation)) {
        if (lvl > 0) this.automation.setLevel(kind as keyof typeof this.upgrades.automation, lvl)
      }
      this.prestigeLevel = loaded.prestigeLevel
      this.discoveredHybrids = new Set(loaded.discoveredHybrids)
      this.useRealSeason = loaded.useRealSeason
      this.gameDay = loaded.gameDay
      this.weather.hydrate(loaded.weather)
      this.achievements.hydrate(loaded.unlockedAchievements, loaded.stats)
      this.quests.hydrate(loaded.activeQuestId, loaded.questProgress, loaded.completedQuestIds)
      this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredHybrids)
      this.selectedCrop = loaded.selectedCrop
      this.tool = loaded.tool
      this.combo.count = loaded.comboCount
      this.combo.timer = loaded.comboTimer
      this.dailyStreak = loaded.dailyStreak
      this.lastDailyClaim = loaded.lastDailyClaim
    } else {
      DEFAULT_UPGRADES.forEach((id) => this.upgrades.owned.add(id))
      this.upgrades.hydrateFromOwned()
      this.inventory.addSeeds('turnip', 10)
      this.inventory.addSeeds('carrot', 8)
      this.inventory.addSeeds('corn', 5)
      const firstQuest = this.quests.pickNext()
      if (firstQuest) this.quests.startQuest(firstQuest)
    }

    this.refreshShopBinding()
    if (!loaded) saveGame(this.snapshot())
    this.pushHud()
    this.pushDailyStatus()
    this.pushSeasonWeather()
    this.ui.onAutomationStatus?.(this.automation.statusLine())
    this.resize()
  }

  currentSeason(): ActiveSeason {
    return activeSeason(this.useRealSeason, this.gameDay)
  }

  unitSellPrice(cropId: CropId): number {
    const def = CROPS[cropId]
    let price = sellPriceWithBonus(def.sellPrice, this.upgrades.cropValueMult)
    price = Math.floor(price * seasonSellMult(def, this.currentSeason()) * prestigeCoinMult(this.prestigeLevel))
    return Math.max(1, price)
  }

  growthMult(): number {
    return this.upgrades.growthSpeedMult * prestigeGrowthMult(this.prestigeLevel)
  }

  private trackCoinsEarned(amount: number): void {
    if (amount <= 0) return
    this.achievements.stats.totalCoinsEarned += amount
    this.quests.addSellProgress(amount)
    this.checkAchievements()
  }

  private checkAchievements(): void {
    for (const a of this.achievements.checkNew()) {
      this.ui.onAchievement?.(a.name)
      this.ui.onToast(`${a.emoji} Achievement: ${a.name}`)
      Sfx.unlock()
    }
  }

  private refreshShopBinding(): void {
    this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredHybrids)
  }

  snapshot() {
    return {
      coins: this.coins.value,
      farm: this.farm,
      inventory: this.inventory,
      upgrades: this.upgrades.owned,
      decors: this.upgrades.unlockedDecors,
      selectedCrop: this.selectedCrop,
      tool: this.tool,
      automation: this.automation.levels,
      dailyStreak: this.dailyStreak,
      lastDailyClaim: this.lastDailyClaim,
      comboCount: this.combo.count,
      comboTimer: this.combo.timer,
      prestigeLevel: this.prestigeLevel,
      stats: this.achievements.stats,
      unlockedAchievements: this.achievements.unlocked,
      activeQuestId: this.quests.activeId,
      questProgress: this.quests.progress,
      completedQuestIds: [...this.quests.completed],
      discoveredHybrids: this.discoveredHybrids,
      gameDay: this.gameDay,
      useRealSeason: this.useRealSeason,
      weather: this.weather.kind,
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    this.canvas.width = Math.floor(rect.width * dpr)
    this.canvas.height = Math.floor(rect.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  tileSizePx(): number {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const maxSize = this.upgrades.maxPlotSize()
    const m = Math.max(this.farm.w, maxSize)
    const byW = (w - 120) / m - 10
    const byH = (h - 180) / m - 10
    return Math.max(40, Math.min(68, Math.floor(Math.min(byW, byH))))
  }

  private canvasCoords(clientX: number, clientY: number): { sx: number; sy: number; vw: number; vh: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      sx: clientX - rect.left,
      sy: clientY - rect.top,
      vw: rect.width,
      vh: rect.height,
    }
  }

  private cellCenter(gx: number, gy: number, vw: number, vh: number): { x: number; y: number } {
    const tileSize = this.tileSizePx()
    const { ox, oy } = farmScreenOffset(this.farm, this.upgrades.maxPlotSize(), tileSize, vw, vh)
    const { cx, cy } = tilePixelPos(ox, oy, gx, gy, tileSize)
    return { x: cx, y: cy - 8 }
  }

  private decoLayout(vw: number, vh: number, ox: number, oy: number): DecoDraw[] {
    const spots: DecoDraw[] = []
    const d = this.upgrades.unlockedDecors
    if (d.has('pinwheel')) {
      spots.push({ id: 'pinwheel', x: Math.max(24, ox - 54), y: oy + this.farm.h * 52, phase: 0.2 })
    }
    if (d.has('scarecrow')) {
      spots.push({ id: 'scarecrow', x: vw - 110, y: oy + 50, phase: 1 })
    }
    if (d.has('cloud')) {
      spots.push({ id: 'cloud', x: vw * 0.18, y: vh * 0.22, phase: 2.1 })
    }
    return spots
  }

  pointerDown(clientX: number, clientY: number, pointerId: number): void {
    const { sx, sy, vw, vh } = this.canvasCoords(clientX, clientY)
    const hit = screenToGrid(sx, sy, this.farm, this.upgrades.maxPlotSize(), this.tileSizePx(), vw, vh)
    if (!hit || hit.locked) return

    this.clickHighlight = { gx: hit.gx, gy: hit.gy, t: 1 }

    this.activePointerId = pointerId
    try {
      this.canvas.setPointerCapture(pointerId)
    } catch {
      /* ignore */
    }

    if (this.tool === 'harvest') {
      this.dragging = true
      this.dragVisited.clear()
    }
    this.applyAt(hit.gx, hit.gy, sx, sy, vw, vh, this.tool === 'harvest')
  }

  pointerMove(clientX: number, clientY: number): void {
    const { sx, sy, vw, vh } = this.canvasCoords(clientX, clientY)
    const hit = screenToGrid(sx, sy, this.farm, this.upgrades.maxPlotSize(), this.tileSizePx(), vw, vh)
    this.hoverHighlight = hit && !hit.locked ? { gx: hit.gx, gy: hit.gy } : null
    this.dragHighlight = hit && !hit.locked ? { gx: hit.gx, gy: hit.gy } : null

    if (!this.dragging || this.tool !== 'harvest') return
    if (!hit || hit.locked) return
    this.applyAt(hit.gx, hit.gy, sx, sy, vw, vh, true)
  }

  pointerUp(): void {
    this.endPointer()
  }

  endPointer(): void {
    this.dragging = false
    this.dragVisited.clear()
    this.dragHighlight = null
    if (this.activePointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId)
      } catch {
        /* ignore */
      }
      this.activePointerId = null
    }
  }

  private applyAt(
    gx: number,
    gy: number,
    sx: number,
    sy: number,
    vw: number,
    vh: number,
    isDrag: boolean,
  ): void {
    if (isDrag) {
      const key = `${gx},${gy}`
      if (this.dragVisited.has(key)) return
      this.dragVisited.add(key)
    }

    if (this.tool === 'hoe') {
      if (this.farm.hoe(gx, gy)) this.tractorPulse = 0.15
      return
    }
    if (this.tool === 'water') {
      if (this.farm.water(gx, gy)) {
        this.particles.sparkles(sx, sy, 6)
        Sfx.water()
      }
      return
    }
    if (this.tool === 'plant') {
      if (!this.inventory.tryConsumeSeed(this.selectedCrop)) {
        this.ui.onToast('Need seeds')
        return
      }
      if (this.farm.plant(gx, gy, this.selectedCrop)) {
        this.particles.sparkles(sx, sy, 3)
        Sfx.plant()
        return
      }
      this.inventory.addSeeds(this.selectedCrop, 1)
      this.ui.onToast('Till soil first')
      return
    }
    if (this.tool === 'harvest') {
      this.harvestAt(gx, gy, vw, vh)
    }
  }

  private harvestAt(gx: number, gy: number, vw: number, vh: number): void {
    const radius = this.upgrades.tractorRadius
    const candidates = this.farm.collectMatureInRadius(gx, gy, radius)
    if (candidates.length === 0) return

    const free = this.inventory.freeSlots
    if (free <= 0) {
      this.ui.onToast('Satchel full')
      return
    }

    const toPick = candidates.slice(0, free)
    const overflow = candidates.length > free
    const harvested: CropId[] = []

    for (const { gx: cx, gy: cy } of toPick) {
      const id = this.farm.pickCrop(cx, cy)
      if (!id) continue
      harvested.push(id)
      const p = this.cellCenter(cx, cy, vw, vh)
      const def = CROPS[id]
      this.particles.harvestJuice(p.x, p.y, def.top, def.emoji)
    }

    if (harvested.length === 0) return

    Sfx.harvest()
    this.shake = Math.min(0.18, this.shake + 0.06)
    registerHarvestCombo(this.combo, 0, this.upgrades.harvestSpeedMult)
    this.ui.onCombo?.(this.combo.count)
    this.achievements.stats.totalHarvests += harvested.length
    this.achievements.stats.maxCombo = Math.max(this.achievements.stats.maxCombo, this.combo.count)
    this.quests.addHarvestProgress(harvested.length)
    this.checkAchievements()

    const comboMult = 1 + comboBonus(this.combo, this.upgrades.harvestSpeedMult)
    let bonusCoins = 0

    for (const id of harvested) {
      this.inventory.addHarvest(id, 1)
      if (this.upgrades.owned.has('crop_tier_5') && Math.random() < goldenWindfallChance(id)) {
        bonusCoins += Math.floor(this.unitSellPrice(id) * 0.45)
      }
      const rare = rollRareBonus(id, this.upgrades.owned)
      if (rare?.type === 'coins') {
        bonusCoins += rare.amount
        const p = this.cellCenter(gx, gy, vw, vh)
        this.particles.floatText(p.x, p.y - 50, `✨ +${rare.amount}`)
      } else if (rare?.type === 'seed') {
        this.inventory.addSeeds(rare.cropId, 1)
        this.ui.onToast(`Lucky seed! ${CROPS[rare.cropId].emoji}`)
      }
    }

    if (comboMult > 1 && harvested.length >= 2) {
      const comboExtra = Math.floor(
        harvested.reduce((s, id) => s + this.unitSellPrice(id), 0) * (comboMult - 1),
      )
      if (comboExtra > 0) {
        bonusCoins += comboExtra
        const p = this.cellCenter(gx, gy, vw, vh)
        this.particles.floatText(p.x, p.y - 24, `×${this.combo.count} combo!`)
      }
    }

    if (bonusCoins > 0) {
      this.coins.value += bonusCoins
      this.trackCoinsEarned(bonusCoins)
      this.ui.onToast(`Bonus harvest! +${bonusCoins} coins`)
      const p = this.cellCenter(gx, gy, vw, vh)
      this.particles.floatText(p.x, p.y - 40, `+${bonusCoins}`)
    }

    if (overflow) this.ui.onToast('Satchel full')
    this.tractorPulse = 0.9
    this.pushHud(true)
  }

  private autoSell(): number {
    if (this.inventory.usedSlots <= 0) return 0
    const sum = this.inventory.sellAll((id, qty) => this.unitSellPrice(id) * qty)
    if (sum <= 0) return 0
    this.coins.value += sum
    this.trackCoinsEarned(sum)
    this.achievements.stats.totalSells += 1
    Sfx.sell()
    const rect = this.canvas.getBoundingClientRect()
    this.particles.burstCoins(rect.width / 2, rect.height / 4, 8)
    this.particles.floatText(rect.width / 2, rect.height / 4 - 20, `+${sum}`)
    this.pushHud(true)
    return sum
  }

  setTool(t: ToolMode): void {
    this.tool = t
    this.ui.onToolMode(t)
  }

  setCrop(c: CropId): void {
    this.selectedCrop = c
    this.ui.onSelectedCrop(c)
  }

  openPanel(p: PanelId): void {
    this.panel = p
    this.ui.onPanelState(p)
    if (p === 'shop') this.ui.onShopRefresh()
    if (p === 'upgrades') this.ui.onUpgradesRefresh()
    if (p === 'inventory') {
      this.inventory.autoSort()
      this.ui.onInventoryRefresh()
    }
    if (p === 'journal') this.ui.onJournalRefresh?.()
  }

  buySeed(id: CropId): void {
    this.refreshShopBinding()
    if (this.shop.buySeed(id)) {
      this.ui.onToast(`Snagged ${CROPS[id].name} seeds`)
      this.pushHud()
      this.ui.onShopRefresh()
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Not enough coins or locked crop')
  }

  buySeedBundle(id: CropId): void {
    this.refreshShopBinding()
    const n = this.shop.buySeedBulk(id, 10)
    if (n > 0) {
      this.ui.onToast(`Bought ×${n} ${CROPS[id].name}`)
      this.pushHud()
      this.ui.onShopRefresh()
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Cannot buy bundle right now')
  }

  tryBuyUpgrade(nodeId: string): void {
    const node = getNode(nodeId)
    if (!node) return
    this.refreshShopBinding()
    const prevSize = this.farm.w
    const ok = this.upgrades.tryPurchase(node, this.coins)
    if (ok) {
      this.upgrades.applyPendingLandExpansion()
      if (this.farm.w > prevSize) {
        this.expansionAnim = 1
        Sfx.unlock()
      }
      for (const [kind, lvl] of Object.entries(this.upgrades.automation)) {
        if (lvl > 0) this.automation.setLevel(kind as keyof typeof this.upgrades.automation, lvl)
      }
      this.refreshShopBinding()
      this.ui.onToast(`${node.name} unlocked`)
      if (node.category === 'tractor' || node.category === 'automation') {
        this.tractorPulse = 1.2
        Sfx.unlock()
      }
      this.pushHud()
      this.ui.onUpgradesRefresh()
      this.ui.onAutomationStatus?.(this.automation.statusLine())
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Requirements or coins blocking upgrade')
  }

  claimDaily(): void {
    if (!canClaimDaily(this.lastDailyClaim)) {
      this.ui.onToast('Daily gift already claimed')
      return
    }
    const streak = nextStreak(this.lastDailyClaim, this.dailyStreak)
    const reward = computeDailyReward(streak)
    this.dailyStreak = streak
    this.lastDailyClaim = Math.floor(Date.now() / 86_400_000)
    this.achievements.stats.dailyStreakBest = Math.max(this.achievements.stats.dailyStreakBest, streak)
    this.coins.value += reward.coins
    this.trackCoinsEarned(reward.coins)
    for (const [id, qty] of Object.entries(reward.seeds)) {
      if (qty) this.inventory.addSeeds(id as CropId, qty)
    }
    Sfx.unlock()
    this.ui.onToast(`Day ${streak} gift! +${reward.coins} coins`)
    this.pushHud()
    this.pushDailyStatus()
    saveGame(this.snapshot())
  }

  tryBreed(parentA: CropId, parentB: CropId): boolean {
    const recipe = findRecipe(parentA, parentB)
    if (!recipe) {
      this.ui.onToast('Those crops cannot breed')
      return false
    }
    if (this.coins.value < recipe.cost) {
      this.ui.onToast('Need more coins for breeding')
      return false
    }
    const seedsA = this.inventory.seeds.get(recipe.parentA) ?? 0
    const seedsB = this.inventory.seeds.get(recipe.parentB) ?? 0
    if (seedsA < 1 || seedsB < 1) {
      this.ui.onToast('Need 1 seed of each parent crop')
      return false
    }
    this.coins.value -= recipe.cost
    this.inventory.seeds.set(recipe.parentA, seedsA - 1)
    this.inventory.seeds.set(recipe.parentB, seedsB - 1)
    if (this.inventory.seeds.get(recipe.parentA) === 0) this.inventory.seeds.delete(recipe.parentA)
    if (this.inventory.seeds.get(recipe.parentB) === 0) this.inventory.seeds.delete(recipe.parentB)
    this.inventory.addSeeds(recipe.result, recipe.seedYield)
    const wasNew = !this.discoveredHybrids.has(recipe.result)
    this.discoveredHybrids.add(recipe.result)
    if (wasNew) {
      this.achievements.stats.hybridsDiscovered += 1
      this.checkAchievements()
    }
    Sfx.plant()
    this.ui.onToast(`Bred ${CROPS[recipe.result].emoji} ${CROPS[recipe.result].name}!`)
    this.refreshShopBinding()
    this.pushHud()
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
    return true
  }

  deliverQuest(): void {
    const q = this.quests.activeQuest()
    if (!q || q.type !== 'deliver' || !q.crop) {
      this.ui.onToast('No delivery quest active')
      return
    }
    const delivered = this.quests.tryDeliver(q.crop, this.inventory.harvest)
    if (delivered <= 0) {
      this.ui.onToast(`Need ${q.crop} in satchel`)
      return
    }
    this.ui.onToast(`Delivered ${delivered} ${CROPS[q.crop].name}`)
    if (this.quests.isComplete()) this.finishQuest()
    else {
      this.pushHud(true)
      this.ui.onJournalRefresh?.()
    }
    saveGame(this.snapshot())
  }

  private finishQuest(): void {
    const q = this.quests.complete()
    if (!q) return
    this.achievements.stats.questsCompleted += 1
    if (q.reward.coins) {
      this.coins.value += q.reward.coins
      this.trackCoinsEarned(q.reward.coins)
    }
    if (q.reward.seeds) {
      for (const [id, qty] of Object.entries(q.reward.seeds)) {
        if (qty) this.inventory.addSeeds(id as CropId, qty)
      }
    }
    Sfx.unlock()
    this.ui.onToast(`${q.npc} thanks you! Quest complete.`)
    const next = this.quests.pickNext()
    if (next) this.quests.startQuest(next)
    this.checkAchievements()
    this.pushHud(true)
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
  }

  toggleSeasonMode(): void {
    this.useRealSeason = !this.useRealSeason
    this.ui.onToast(this.useRealSeason ? 'Seasons follow calendar' : 'Seasons rotate in-game')
    this.pushSeasonWeather()
    saveGame(this.snapshot())
  }

  doPrestige(): boolean {
    if (!canPrestige(this.coins.value, this.achievements.stats.totalCoinsEarned, this.prestigeLevel)) {
      this.ui.onToast(`Need ${800} coins or ${4000} total earned`)
      return false
    }
    const decor = [...this.upgrades.owned].filter((id) => id.startsWith('decor_'))
    this.prestigeLevel += 1
    this.achievements.stats.prestiges = this.prestigeLevel
    const bonus = prestigeRewardCoins(this.prestigeLevel)
    this.coins.value = 120 + bonus
    this.farm = new Farm(BASE_PLOT_SIZE, BASE_PLOT_SIZE)
    this.inventory.harvest.clear()
    this.upgrades = new UpgradesSystem(this.inventory, this.farm)
    this.upgrades.owned.clear()
    decor.forEach((id) => this.upgrades.owned.add(id))
    DEFAULT_UPGRADES.forEach((id) => this.upgrades.owned.add(id))
    this.upgrades.hydrateFromOwned()
    this.automation.levels = { till: 0, plant: 0, water: 0, harvest: 0, sell: 0 }
    this.selectedCrop = 'turnip'
    this.checkAchievements()
    Sfx.unlock()
    this.ui.onToast(`Prestige ${this.prestigeLevel}! Permanent bonuses increased.`)
    this.refreshShopBinding()
    this.pushHud(true)
    this.ui.onUpgradesRefresh()
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
    return true
  }

  sellHarvest(): void {
    const sum = this.inventory.sellAll((id, qty) => this.unitSellPrice(id) * qty)
    if (sum <= 0) {
      this.ui.onToast('Satchel is empty')
      return
    }
    this.coins.value += sum
    this.trackCoinsEarned(sum)
    this.achievements.stats.totalSells += 1
    if (this.quests.isComplete()) this.finishQuest()
    this.checkAchievements()
    const rect = this.canvas.getBoundingClientRect()
    this.particles.burstCoins(
      rect.width / 2,
      rect.height / 3,
      Math.min(20, 5 + Math.floor(sum / 10)),
    )
    Sfx.sell()
    this.ui.onToast(`+${sum} coins`)
    this.pushHud(true)
    saveGame(this.snapshot())
  }

  pushHud(refreshInventory = false): void {
    this.ui.onCoins(this.coins.value)
    this.ui.onBackpack(this.inventory.usedSlots, this.inventory.capacity)
    if (refreshInventory) this.ui.onInventoryRefresh()
  }

  pushDailyStatus(): void {
    this.ui.onDailyReady?.(canClaimDaily(this.lastDailyClaim), this.dailyStreak)
  }

  pushSeasonWeather(): void {
    const season = this.currentSeason()
    this.ui.onSeasonWeather?.(season, this.weather.kind)
  }

  tick(dt: number): void {
    this.time += dt
    this.accumulator += dt
    this.saveTimer += dt
    this.particles.update(dt)
    tickCombo(this.combo, dt)
    if (this.combo.count === 0) this.ui.onCombo?.(0)

    if (!this.useRealSeason) {
      this.seasonTimer += dt
      if (this.seasonTimer >= 180) {
        this.seasonTimer = 0
        this.gameDay += 1
        this.pushSeasonWeather()
      }
    }

    if (this.weather.tick(dt)) this.pushSeasonWeather()

    const season = this.currentSeason()
    const wGrowth = weatherGrowthMult(this.weather.kind)
    const wWater = weatherWaterMult(this.weather.kind)

    while (this.accumulator >= 1 / 30) {
      this.accumulator -= 1 / 30
      this.farm.tickGrowth(1 / 30, this.growthMult(), season, wGrowth)
    }

    const autoActions = this.automation.tick(
      dt,
      this.farm,
      this.inventory,
      this.selectedCrop,
      () => this.autoSell(),
      wWater,
    )
    if (autoActions.length > 0) {
      let autoHarvests = 0
      for (const a of autoActions) {
        if (a.kind === 'harvest') autoHarvests += 1
        if (a.gx !== undefined && a.gy !== undefined) {
          const rect = this.canvas.getBoundingClientRect()
          const p = this.cellCenter(a.gx, a.gy, rect.width, rect.height)
          if (a.kind === 'water') this.particles.sparkles(p.x, p.y, 3)
          if (a.kind === 'harvest' && a.cropId) {
            this.particles.sparkles(p.x, p.y, 4)
            Sfx.harvest()
          }
          if (a.kind === 'plant') Sfx.plant()
        }
        if (a.kind === 'sell' && a.sold) {
          this.ui.onToast(`Auto-sold +${a.sold} coins`)
        }
      }
      if (autoHarvests > 0) {
        this.achievements.stats.totalHarvests += autoHarvests
        this.quests.addHarvestProgress(autoHarvests)
        if (this.quests.isComplete()) this.finishQuest()
        this.checkAchievements()
      }
      this.ui.onAutomationStatus?.(this.automation.statusLine())
      this.pushHud(autoActions.some((a) => a.kind === 'harvest' || a.kind === 'sell'))
    }

    if (this.tractorPulse > 0) this.tractorPulse = Math.max(0, this.tractorPulse - dt * 1.6)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.4)
    if (this.expansionAnim > 0) this.expansionAnim = Math.max(0, this.expansionAnim - dt * 0.8)
    if (this.clickHighlight && this.clickHighlight.t > 0) {
      this.clickHighlight.t = Math.max(0, this.clickHighlight.t - dt * 5)
      if (this.clickHighlight.t <= 0) this.clickHighlight = null
    }

    if (this.saveTimer >= 12) {
      this.saveTimer = 0
      saveGame(this.snapshot())
    }

    const rect = this.canvas.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height

    this.ctx.save()
    if (this.shake > 0) {
      const mag = this.shake * 5
      this.ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag)
    }

    drawSceneLayers(this.ctx, vw, vh, this.time)
    this.particles.tickAmbient(vw, vh, dt)

    const tileSize = this.tileSizePx()
    const maxPlot = this.upgrades.maxPlotSize()
    const { ox, oy } = farmScreenOffset(this.farm, maxPlot, tileSize, vw, vh)

    const frame: RenderFrame = {
      farm: this.farm,
      maxPlotSize: maxPlot,
      tileSize,
      decoSpots: this.decoLayout(vw, vh, ox, oy),
      tractorPulse: this.tractorPulse,
      tractorRadius: this.upgrades.tractorRadius,
      hasTractor: this.upgrades.tractorRadius > 0,
      growthSpeedMult: this.growthMult(),
      dragHighlight: this.dragHighlight,
      hoverHighlight: this.hoverHighlight,
      clickHighlight: this.clickHighlight,
      expansionAnim: this.expansionAnim,
      autoFlashes: this.automation.recentFlashes,
      weather: this.weather.kind,
      petSpots: activePets(this.automation.levels, ox, oy, this.farm.w * tileSize),
    }
    renderFarm(this.ctx, frame, this.time, vw, vh)

    this.ctx.restore()

    this.ctx.save()
    this.particles.draw(this.ctx)
    this.ctx.restore()
  }
}
