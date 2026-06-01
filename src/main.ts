import './style.css'
import {
  CROP_LIST,
  CROPS,
  cropUnlocked,
  getCrop,
  isDiscoveredCropId,
  RARITY_LABEL,
  SEASON_LABEL,
  type CropId,
} from './data/crops'
import { DISCOVERY_RECIPES } from './data/discoveries'
import {
  FIELD_LIST,
  FERTILIZER_LABEL,
  IRRIGATION_LABEL,
  tractorEffectTags,
  type FieldId,
} from './data/fields'
import { TRACTOR_LIST, TRACTORS, type TractorId } from './data/tractors'
import type { UpgradeCategory } from './data/upgrades'
import { UPGRADE_NODES } from './data/upgrades'
import type { PanelId } from './game/Game'
import { GameLoop } from './game/Game'
import { Sfx } from './game/Audio'
import type { ToolMode } from './game/types'
import { ACHIEVEMENTS } from './systems/Achievements'
import { isInSeason, SEASON_EMOJI } from './systems/Seasons'
import { WEATHER_EMOJI, WEATHER_LABEL } from './systems/Weather'
import { PRESTIGE_COIN_BONUS, PRESTIGE_GROWTH_BONUS, PRESTIGE_MIN_COINS, PRESTIGE_MIN_EARNED } from './systems/Prestige'
import { clearSave } from './systems/SaveSystem'

const CATEGORY_LABEL: Record<UpgradeCategory, string> = {
  water: 'Watering mastery',
  tractor: 'Tractor antics',
  backpack: 'Hefty packs',
  land: 'More dirt to love',
  crops: 'Cuter seedlings',
  automation: 'Farm helpers',
  value: 'Market charm',
  decor: 'Playground props',
}

const canvas = document.getElementById('game') as HTMLCanvasElement
const coinsEl = document.getElementById('coins')!
const coinSticker = document.querySelector('.coin-sticker')!
const capacityEl = document.getElementById('capacity')!
const capacityBtn = document.getElementById('btn-capacity')!
const toastEl = document.getElementById('toast')!
const cropSelect = document.getElementById('crop-select') as HTMLSelectElement
const backdrop = document.getElementById('backdrop')!
const automationStatusEl = document.getElementById('automation-status')!
const comboBadge = document.getElementById('combo-badge')!
const dailyBtn = document.getElementById('btn-daily')!
const dailyLabel = document.getElementById('daily-label')!
const seasonBadge = document.getElementById('season-badge')!
const weatherBadge = document.getElementById('weather-badge')!
const prestigeBadge = document.getElementById('prestige-badge')!
const fieldBadge = document.getElementById('field-badge')!
const eventBanner = document.getElementById('event-banner')!
const fieldStrip = document.getElementById('field-strip')!
const tractorStatusEl = document.getElementById('tractor-status')!
const celebrationEl = document.getElementById('celebration')!
const celebrationEmoji = document.getElementById('celebration-emoji')!
const celebrationName = document.getElementById('celebration-name')!

const panels = {
  shop: document.getElementById('panel-shop')!,
  upgrades: document.getElementById('panel-upgrades')!,
  inventory: document.getElementById('panel-inventory')!,
  journal: document.getElementById('panel-journal')!,
  empire: document.getElementById('panel-empire')!,
}

function showToast(text: string): void {
  toastEl.textContent = text
  toastEl.classList.add('visible')
  window.clearTimeout((showToast as unknown as { t?: number }).t)
  ;(showToast as unknown as { t: number }).t = window.setTimeout(() => {
    toastEl.classList.remove('visible')
  }, 2400)
}

function bumpCoins(): void {
  coinSticker.classList.add('bump')
  window.setTimeout(() => coinSticker.classList.remove('bump'), 220)
}

function bumpCapacity(): void {
  capacityBtn.classList.add('bump')
  window.setTimeout(() => capacityBtn.classList.remove('bump'), 220)
}

function showCelebration(emoji: string, name: string): void {
  celebrationEmoji.textContent = emoji
  celebrationName.textContent = name
  celebrationEl.classList.remove('hidden')
  celebrationEl.classList.add('pop')
  window.clearTimeout((showCelebration as unknown as { t?: number }).t)
  ;(showCelebration as unknown as { t: number }).t = window.setTimeout(() => {
    celebrationEl.classList.add('hidden')
    celebrationEl.classList.remove('pop')
  }, 2600)
}

function showEventBanner(label: string): void {
  eventBanner.textContent = label
  eventBanner.classList.remove('hidden')
  eventBanner.classList.add('pulse')
  window.clearTimeout((showEventBanner as unknown as { t?: number }).t)
  ;(showEventBanner as unknown as { t: number }).t = window.setTimeout(() => {
    eventBanner.classList.add('hidden')
    eventBanner.classList.remove('pulse')
  }, 5000)
}

function cropLabel(id: string, loop: GameLoop): { emoji: string; name: string } {
  if (isDiscoveredCropId(id)) {
    const known = loop.discoveredCrops.has(id)
    if (!known) return { emoji: '❓', name: '???' }
    const r = DISCOVERY_RECIPES.find((x) => x.result === id)
    return { emoji: r?.emoji ?? '🌱', name: r?.name ?? 'Unknown' }
  }
  const def = CROPS[id as CropId]
  return def ? { emoji: def.emoji, name: def.name } : { emoji: '🌱', name: id }
}

function populateCropSelect(loop: GameLoop): void {
  cropSelect.innerHTML = ''
  const options: { id: string; label: string; disabled: boolean }[] = []
  for (const c of CROP_LIST) {
    const unlocked = cropUnlocked(c, loop.upgrades.owned, loop.discoveredCrops)
    options.push({
      id: c.id,
      label: `${c.emoji} ${c.name}${c.maxHarvests && c.maxHarvests > 1 ? ` · ×${c.maxHarvests}` : ''}`,
      disabled: !unlocked,
    })
  }
  for (const r of DISCOVERY_RECIPES) {
    if (!loop.discoveredCrops.has(r.result)) continue
    const seeds = loop.inventory.seeds.get(r.result) ?? 0
    if (seeds <= 0 && !options.some((o) => o.id === r.result)) {
      options.push({ id: r.result, label: `${r.emoji} ${r.name} (discovered)`, disabled: false })
    } else if (seeds > 0) {
      options.push({ id: r.result, label: `${r.emoji} ${r.name} · ${seeds} seeds`, disabled: false })
    }
  }
  for (const opt of options) {
    const el = document.createElement('option')
    el.value = opt.id
    el.textContent = opt.label + (opt.disabled ? ' (locked)' : '')
    el.disabled = opt.disabled
    cropSelect.appendChild(el)
  }
  cropSelect.value = loop.selectedCrop
}

function updateTractorStatus(loop: GameLoop): void {
  const eq = loop.fieldManager.activeEquipment()
  const field = FIELD_LIST.find((f) => f.id === loop.fieldManager.activeId)
  if (!eq.tractorId) {
    tractorStatusEl.textContent = '🚜 No tractor assigned'
    tractorStatusEl.title = 'Open Empire to buy and assign a tractor to this field'
    return
  }
  const t = TRACTORS[eq.tractorId]
  const tags = tractorEffectTags(t).slice(0, 2).join(' · ')
  tractorStatusEl.textContent = `${t.emoji} ${t.name}${tags ? ` · ${tags}` : ''}`
  tractorStatusEl.title = `${t.description} (${field?.name ?? 'field'})`
}

function buildFieldStrip(loop: GameLoop): void {
  fieldStrip.innerHTML = ''
  const unlockedCount = loop.fieldManager.unlocked.size
  const label = document.createElement('span')
  label.className = 'field-bar-label'
  label.textContent = `Fields ${unlockedCount}/${FIELD_LIST.length}`
  fieldStrip.appendChild(label)

  for (const f of FIELD_LIST) {
    const unlocked = loop.fieldManager.unlocked.has(f.id)
    const active = loop.fieldManager.activeId === f.id
    const canAfford = loop.coins.value >= f.unlockCost
    const size =
      f.id === 'starter'
        ? `${loop.fieldManager.maxPlotSize()}×${loop.fieldManager.maxPlotSize()}`
        : `${f.baseSize}×${f.baseSize}`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className =
      'field-chip' +
      (active ? ' active' : '') +
      (!unlocked ? ' locked' : '') +
      (!unlocked && canAfford ? ' can-afford' : '')
    btn.title = unlocked
      ? `${f.description} (${size})`
      : canAfford
        ? `Tap to unlock for ${f.unlockCost}¢`
        : `Unlock in Empire for ${f.unlockCost}¢`
    btn.innerHTML = unlocked
      ? `${f.emoji} ${f.name} <span class="field-chip-size">${size}</span>`
      : `🔒 ${f.emoji} ${f.unlockCost}¢`
    btn.addEventListener('click', () => {
      Sfx.ui()
      if (unlocked) {
        loop.switchField(f.id)
        buildFieldStrip(loop)
        updateTractorStatus(loop)
        return
      }
      if (canAfford && f.unlockCost > 0) {
        loop.unlockField(f.id)
        buildFieldStrip(loop)
        updateTractorStatus(loop)
        return
      }
      loop.openPanel('empire')
      showToast(`Save ${f.unlockCost}¢ to unlock ${f.name}`)
    })
    fieldStrip.appendChild(btn)
  }
  const activeField = FIELD_LIST.find((f) => f.id === loop.fieldManager.activeId)
  fieldBadge.textContent = `${activeField?.emoji ?? '🌱'} ${activeField?.name ?? 'Field'}`
}

function buildShop(loop: GameLoop): void {
  const root = document.getElementById('shop-rows')!
  root.innerHTML = ''
  const season = loop.currentSeason()
  for (const c of CROP_LIST) {
    const locked = !cropUnlocked(c, loop.upgrades.owned, loop.discoveredHybrids)
    const sell = loop.unitSellPrice(c.id)
    const inSeason = isInSeason(c, season)
    const seasonTag = inSeason ? '<span class="tag tiny season-bonus">In season +15%</span>' : ''
    const multi =
      c.maxHarvests && c.maxHarvests > 1
        ? `<span class="tag tiny">Multi ×${c.maxHarvests}</span>`
        : ''
    const card = document.createElement('article')
    card.className = `catalog-card rarity-${c.rarity}` + (locked ? ' locked' : '')
    card.title = locked
      ? c.isHybrid
        ? 'Discover via breeding in Journal'
        : 'Unlock via Upgrade grove'
      : `${c.name} — ${SEASON_LABEL[c.season]} · ${RARITY_LABEL[c.rarity]}`
    card.innerHTML = `
      <div class="catalog-art">${c.emoji}</div>
      <div>
        <strong>${c.name}</strong>
        <div class="muted small">${sell}¢ each · ${c.baseGrowSeconds}s · ${SEASON_LABEL[c.season]}</div>
        ${seasonTag}
        ${multi}
      </div>
      <div class="row-actions">
        <span class="tag">${c.seedBuyPrice}¢</span>
        <button type="button" data-seed="${c.id}" title="Buy 1 seed">×1</button>
        <button type="button" data-seed-bundle="${c.id}" title="Buy 10 seeds">×10</button>
      </div>`
    if (locked) {
      card.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.disabled = true
      })
    }
    root.appendChild(card)
  }
  root.querySelectorAll<HTMLButtonElement>('[data-seed]').forEach((btn) => {
    btn.addEventListener('click', () => loop.buySeed(btn.dataset.seed as CropId))
  })
  root.querySelectorAll<HTMLButtonElement>('[data-seed-bundle]').forEach((btn) => {
    btn.addEventListener('click', () => loop.buySeedBundle(btn.dataset.seedBundle as CropId))
  })
}

function buildUpgrades(loop: GameLoop): void {
  const root = document.getElementById('upgrade-columns')!
  root.innerHTML = ''
  const categories = Array.from(new Set(UPGRADE_NODES.map((n) => n.category)))
  for (const cat of categories) {
    const col = document.createElement('div')
    col.className = 'upgrade-col'
    const h = document.createElement('h3')
    h.textContent = CATEGORY_LABEL[cat]
    col.appendChild(h)
    const list = document.createElement('div')
    list.className = 'node-list'
    for (const node of UPGRADE_NODES.filter((n) => n.category === cat)) {
      const row = document.createElement('div')
      const owned = loop.upgrades.isOwned(node.id)
      const can = loop.upgrades.canUnlock(node)
      const afford = loop.upgrades.affordable(node, loop.coins.value)
      row.className =
        'node' + (owned ? ' owned' : '') + (!can || (!afford && !owned) ? ' dim' : '')
      row.title = node.description
      const lockHint =
        !can && !owned && node.requires.length
          ? `<p class="muted tiny">Needs: ${node.requires.map((r) => UPGRADE_NODES.find((n) => n.id === r)?.name ?? r).join(', ')}</p>`
          : ''
      row.innerHTML = `
        <div>
          <strong>${node.name}</strong>
          <p class="muted small">${node.description}</p>
          ${lockHint}
        </div>
        <div class="node-foot">
          <span class="tag">${node.cost === 0 ? 'free' : `${node.cost}¢`}</span>
          <button type="button" data-upgrade="${node.id}" title="${node.description}" ${owned || !can || !afford ? 'disabled' : ''}>
            ${owned ? 'Owned' : 'Unlock'}
          </button>
        </div>`
      list.appendChild(row)
    }
    col.appendChild(list)
    root.appendChild(col)
  }
  root.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((btn) => {
    btn.addEventListener('click', () => loop.tryBuyUpgrade(btn.dataset.upgrade!))
  })
}

function buildJournal(loop: GameLoop): void {
  const qRoot = document.getElementById('journal-quests')!
  const dRoot = document.getElementById('journal-discover')!
  const bRoot = document.getElementById('journal-breed')!
  const aRoot = document.getElementById('journal-achieve')!
  const pRoot = document.getElementById('journal-prestige')!

  const cropPct = loop.journal.cropCompletion()
  const recipePct = loop.journal.recipeCompletion()
  dRoot.innerHTML = `
    <div class="journal-card">
      <strong>Discovery progress</strong>
      <p class="muted small">Crops ${cropPct}% · Recipes ${recipePct}% · Fields ${loop.journal.fieldCompletion(loop.fieldManager.unlocked)}% · Tractors ${loop.journal.tractorCompletion(loop.ownedTractors)}%</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${recipePct}%"></div></div>
    </div>
    <div class="discovery-grid">
      ${DISCOVERY_RECIPES.map((r) => {
        const known = loop.discoveredCrops.has(r.result)
        const pa = cropLabel(r.parentA, loop)
        const pb = cropLabel(r.parentB, loop)
        return `
          <div class="journal-card discovery-card ${known ? 'owned' : ''} rarity-${r.rarity}">
            <strong>${known ? r.emoji : '❓'} ${known ? r.name : '???'}</strong>
            <p class="muted tiny">${pa.emoji}+${pb.emoji} · ${RARITY_LABEL[r.rarity]} · ${r.cost}¢</p>
            ${known ? `<span class="tag tiny">Discovered</span>` : `<button type="button" data-breed-a="${r.parentA}" data-breed-b="${r.parentB}">Combine</button>`}
          </div>`
      }).join('')}
    </div>`

  dRoot.querySelectorAll<HTMLButtonElement>('[data-breed-a]').forEach((btn) => {
    btn.addEventListener('click', () => loop.tryBreed(btn.dataset.breedA!, btn.dataset.breedB!))
  })

  const q = loop.quests.activeQuest()
  if (q) {
    const pct = Math.min(100, Math.floor((loop.quests.progress / q.qty) * 100))
    qRoot.innerHTML = `
      <div class="journal-card">
        <div class="npc-head">${q.emoji} <strong>${q.npc}</strong></div>
        <p>${q.description}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p class="muted small">${loop.quests.progress} / ${q.qty}</p>
        ${q.type === 'deliver' ? '<button type="button" class="primary" id="btn-deliver">Deliver from satchel</button>' : ''}
      </div>`
    qRoot.querySelector('#btn-deliver')?.addEventListener('click', () => loop.deliverQuest())
  } else {
    qRoot.innerHTML = `<div class="muted">All quests done for now. Check back later!</div>`
  }

  bRoot.innerHTML = DISCOVERY_RECIPES.slice(0, 24).map((r) => {
    const known = loop.discoveredCrops.has(r.result)
    const pa = cropLabel(r.parentA, loop)
    const pb = cropLabel(r.parentB, loop)
    return `
      <div class="journal-card ${known ? 'owned' : ''}">
        <strong>${known ? r.emoji : '❓'} ${known ? r.name : 'Unknown crop'}</strong>
        <p class="muted small">${pa.emoji}+${pb.emoji} → ${known ? r.name : '?'} · ${r.cost}¢</p>
        <button type="button" data-breed-a="${r.parentA}" data-breed-b="${r.parentB}" ${known ? 'disabled' : ''}>Combine</button>
      </div>`
  }).join('') + `<p class="muted small">See Discover tab for all ${DISCOVERY_RECIPES.length} recipes.</p>`
  bRoot.querySelectorAll<HTMLButtonElement>('[data-breed-a]').forEach((btn) => {
    btn.addEventListener('click', () => loop.tryBreed(btn.dataset.breedA!, btn.dataset.breedB!))
  })

  aRoot.innerHTML = ACHIEVEMENTS.map((a) => {
    const got = loop.achievements.unlocked.has(a.id)
    return `
      <div class="journal-card ${got ? 'owned' : 'dim'}">
        <strong>${a.emoji} ${a.name}</strong>
        <p class="muted small">${a.description}</p>
        <span class="tag">${got ? 'Unlocked' : 'Locked'}</span>
      </div>`
  }).join('')

  const canPrestige =
    loop.coins.value >= PRESTIGE_MIN_COINS || loop.achievements.stats.totalCoinsEarned >= PRESTIGE_MIN_EARNED
  pRoot.innerHTML = `
    <div class="journal-card">
      <strong>Prestige level ${loop.prestigeLevel}</strong>
      <p class="muted small">Permanent +${Math.round(loop.prestigeLevel * PRESTIGE_COIN_BONUS * 100)}% sell · +${Math.round(loop.prestigeLevel * PRESTIGE_GROWTH_BONUS * 100)}% growth</p>
      <p class="small">Reset farm & upgrades for stronger permanent bonuses. Keeps achievements, hybrids & decor.</p>
      <button type="button" class="primary" id="btn-prestige" ${canPrestige ? '' : 'disabled'}>Prestige farm</button>
      <button type="button" class="ghost-btn" id="btn-season-toggle">Seasons: ${loop.useRealSeason ? 'Calendar' : 'Rotating'}</button>
    </div>`
  pRoot.querySelector('#btn-prestige')?.addEventListener('click', () => loop.doPrestige())
  pRoot.querySelector('#btn-season-toggle')?.addEventListener('click', () => {
    loop.toggleSeasonMode()
    buildJournal(loop)
  })

  prestigeBadge.textContent = `⭐ ${loop.prestigeLevel}`
  prestigeBadge.classList.toggle('hidden', loop.prestigeLevel <= 0)
}

function buildEmpire(loop: GameLoop): void {
  const stats = document.getElementById('empire-stats')!
  const fieldsRoot = document.getElementById('empire-fields')!
  const tractorsRoot = document.getElementById('empire-tractors')!
  stats.innerHTML = `
    <p class="empire-intro">
      <strong>How it works:</strong> Unlock fields below, tap them in the bar above the farm to visit.
      Buy tractors in the garage, then assign <em>one tractor per field</em> — bonuses apply while you're on that field.
    </p>`

  fieldsRoot.innerHTML = FIELD_LIST.map((f) => {
    const unlocked = loop.fieldManager.unlocked.has(f.id)
    const active = loop.fieldManager.activeId === f.id
    const eq = loop.fieldManager.equipment[f.id]
    const assigned = eq.tractorId ? TRACTORS[eq.tractorId] : null
    const tractorOpts = TRACTOR_LIST.filter((t) => loop.ownedTractors.has(t.id))
      .map(
        (t) =>
          `<option value="${t.id}" ${eq.tractorId === t.id ? 'selected' : ''}>${t.emoji} ${t.name}</option>`,
      )
      .join('')
    const size = f.id === 'starter' ? `${loop.fieldManager.maxPlotSize()}×${loop.fieldManager.maxPlotSize()}` : `${f.baseSize}×${f.baseSize}`
    return `
      <article class="journal-card empire-card ${unlocked ? '' : 'dim'} ${active ? 'owned' : ''}">
        <div class="empire-head"><span>${f.emoji}</span><strong>${f.name}</strong><span class="tag tiny">${size}</span>${active ? '<span class="tag tiny">Here now</span>' : ''}</div>
        <p class="muted tiny">${f.description}</p>
        <p class="tiny">💧 ${IRRIGATION_LABEL[eq.irrigation]} · 🌿 ${FERTILIZER_LABEL[eq.fertilizer]}</p>
        ${unlocked && assigned ? `<p class="tiny">${assigned.emoji} <strong>${assigned.name}</strong> — ${tractorEffectTags(assigned).join(' · ')}</p>` : ''}
        <div class="row-actions">
          ${unlocked
            ? `<button type="button" data-field-go="${f.id}">${active ? 'Playing here' : 'Visit field'}</button>
               <button type="button" data-field-irr="${f.id}" ${eq.irrigation >= 3 ? 'disabled' : ''}>💧 Irrigation</button>
               <button type="button" data-field-fert="${f.id}" ${eq.fertilizer >= 3 ? 'disabled' : ''}>🌿 Fertilizer</button>`
            : `<button type="button" data-field-unlock="${f.id}">Unlock for ${f.unlockCost}¢</button>`}
        </div>
        ${
          unlocked
            ? `<div class="tractor-assign">
                 <label for="tractor-${f.id}">Tractor on this field</label>
                 <select id="tractor-${f.id}" data-field-tractor="${f.id}">
                   <option value="">— None —</option>
                   ${tractorOpts}
                 </select>
               </div>`
            : ''
        }
      </article>`
  }).join('')

  fieldsRoot.querySelectorAll<HTMLButtonElement>('[data-field-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loop.switchField(btn.dataset.fieldGo as FieldId)
      buildFieldStrip(loop)
      updateTractorStatus(loop)
      buildEmpire(loop)
    })
  })
  fieldsRoot.querySelectorAll<HTMLButtonElement>('[data-field-unlock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loop.unlockField(btn.dataset.fieldUnlock as FieldId)
      buildFieldStrip(loop)
      updateTractorStatus(loop)
    })
  })
  fieldsRoot.querySelectorAll<HTMLButtonElement>('[data-field-irr]').forEach((btn) => {
    btn.addEventListener('click', () => loop.upgradeFieldIrrigation(btn.dataset.fieldIrr as FieldId))
  })
  fieldsRoot.querySelectorAll<HTMLButtonElement>('[data-field-fert]').forEach((btn) => {
    btn.addEventListener('click', () => loop.upgradeFieldFertilizer(btn.dataset.fieldFert as FieldId))
  })
  fieldsRoot.querySelectorAll<HTMLSelectElement>('[data-field-tractor]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.fieldTractor as FieldId
      const val = sel.value as TractorId | ''
      loop.assignTractor(id, val || null)
    })
  })

  tractorsRoot.innerHTML = TRACTOR_LIST.map((t) => {
    const owned = loop.ownedTractors.has(t.id)
    const tags = tractorEffectTags(t)
      .map((tag) => `<span class="tractor-tag">${tag}</span>`)
      .join('')
    return `
      <article class="journal-card ${owned ? 'owned' : ''}">
        <strong>${t.emoji} ${t.name}</strong>
        <p class="muted tiny">${t.description}</p>
        <div class="tractor-tags">${tags}</div>
        <div class="row-actions">
          ${owned ? '<span class="tag">In garage — assign above ↑</span>' : `<button type="button" data-buy-tractor="${t.id}">${t.unlockCost === 0 ? 'Starter (owned)' : `Buy for ${t.unlockCost}¢`}</button>`}
        </div>
      </article>`
  }).join('')
  tractorsRoot.querySelectorAll<HTMLButtonElement>('[data-buy-tractor]').forEach((btn) => {
    btn.addEventListener('click', () => loop.buyTractor(btn.dataset.buyTractor as TractorId))
  })
}

function setJournalTab(tab: string): void {
  document.querySelectorAll('.journal-tabs .tab').forEach((t) => {
    t.classList.toggle('active', (t as HTMLButtonElement).dataset.tab === tab)
  })
  document.querySelectorAll('.journal-section').forEach((s) => s.classList.add('hidden'))
  document.getElementById(`journal-${tab}`)?.classList.remove('hidden')
}

function buildInventory(loop: GameLoop): void {
  const root = document.getElementById('inv-rows')!
  const meta = document.getElementById('inv-meta')!
  root.innerHTML = ''
  loop.inventory.autoSort()
  const totalVal = loop.inventory.totalHarvestValue((id, qty) => loop.unitSellPrice(id) * qty)
  meta.textContent = `${loop.inventory.usedSlots} / ${loop.inventory.capacity} slots · worth ~${totalVal}¢`
  if (loop.inventory.harvest.size === 0) {
    root.innerHTML = `<div class="muted">Nothing harvested yet.</div>`
    return
  }
  for (const [id, qty] of loop.inventory.sortedHarvest()) {
    const def = getCrop(id)
    const row = document.createElement('div')
    row.className = `row rarity-row rarity-${def.rarity}`
    row.title = `${def.name} — ${RARITY_LABEL[def.rarity]} · ${loop.unitSellPrice(id)}¢ each`
    row.innerHTML = `
      <div>
        <strong>${def.emoji} ${def.name}</strong>
        <div class="muted tiny">${RARITY_LABEL[def.rarity]} · ${SEASON_LABEL[def.season]}</div>
      </div>
      <div class="tag">×${qty}</div>`
    root.appendChild(row)
  }
}

function setPanelVisible(loop: GameLoop, id: PanelId): void {
  Object.values(panels).forEach((p) => {
    p.classList.add('hidden')
    p.setAttribute('aria-hidden', 'true')
    p.setAttribute('inert', '')
  })

  const showBackdrop = id === 'shop' || id === 'inventory'
  backdrop.classList.toggle('hidden', !showBackdrop)
  backdrop.setAttribute('aria-hidden', showBackdrop ? 'false' : 'true')
  if (showBackdrop) backdrop.removeAttribute('inert')
  else backdrop.setAttribute('inert', '')

  if (id === 'shop') {
    panels.shop.classList.remove('hidden')
    panels.shop.setAttribute('aria-hidden', 'false')
    panels.shop.removeAttribute('inert')
  } else if (id === 'upgrades') {
    panels.upgrades.classList.remove('hidden')
    panels.upgrades.setAttribute('aria-hidden', 'false')
    panels.upgrades.removeAttribute('inert')
  } else if (id === 'inventory') {
    panels.inventory.classList.remove('hidden')
    panels.inventory.setAttribute('aria-hidden', 'false')
    panels.inventory.removeAttribute('inert')
  } else if (id === 'journal') {
    panels.journal.classList.remove('hidden')
    panels.journal.setAttribute('aria-hidden', 'false')
    panels.journal.removeAttribute('inert')
  } else if (id === 'empire') {
    panels.empire.classList.remove('hidden')
    panels.empire.setAttribute('aria-hidden', 'false')
    panels.empire.removeAttribute('inert')
  }

  document.body.classList.toggle('panel-open', id !== 'none')
  const plantBar = document.getElementById('plant-bar')!
  plantBar.style.display = id === 'none' && loop.tool === 'plant' ? 'flex' : 'none'
}

const game = new GameLoop(canvas, {
  onToast: showToast,
  onCoins: (n) => {
    coinsEl.textContent = String(Math.floor(n))
    bumpCoins()
  },
  onBackpack: (() => {
    let lastUsed = -1
    return (u: number, c: number) => {
      capacityEl.textContent = `${u} / ${c}`
      if (u !== lastUsed) {
        bumpCapacity()
        lastUsed = u
      }
    }
  })(),
  onPanelState: (p) => setPanelVisible(game, p),
  onToolMode: (t) => {
    document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === t)
    })
    canvas.dataset.tool = t
    const plantBar = document.getElementById('plant-bar')!
    plantBar.style.display = game.panel === 'none' && t === 'plant' ? 'flex' : 'none'
  },
  onSelectedCrop: (c) => {
    cropSelect.value = c
  },
  onShopRefresh: () => buildShop(game),
  onUpgradesRefresh: () => {
    buildUpgrades(game)
    populateCropSelect(game)
    buildShop(game)
  },
  onInventoryRefresh: () => buildInventory(game),
  onJournalRefresh: () => buildJournal(game),
  onEmpireRefresh: () => {
    buildEmpire(game)
    buildFieldStrip(game)
    updateTractorStatus(game)
  },
  onDiscovery: (emoji, name) => {
    showCelebration(emoji, name)
    buildJournal(game)
    populateCropSelect(game)
  },
  onWorldEvent: (label) => showEventBanner(label),
  onFieldChange: () => {
    buildFieldStrip(game)
    updateTractorStatus(game)
  },
  onAutomationStatus: (line) => {
    automationStatusEl.textContent = line
  },
  onDailyReady: (ready, streak) => {
    dailyBtn.classList.toggle('hidden', !ready)
    dailyLabel.textContent = ready ? (streak > 0 ? `Day ${streak + 1}` : 'Daily') : 'Daily'
    if (ready) dailyBtn.classList.add('pulse')
    else dailyBtn.classList.remove('pulse')
  },
  onCombo: (count) => {
    if (count >= 2) {
      comboBadge.textContent = `×${count} combo!`
      comboBadge.classList.remove('hidden')
      comboBadge.classList.add('pop')
      window.setTimeout(() => comboBadge.classList.remove('pop'), 200)
    } else {
      comboBadge.classList.add('hidden')
    }
  },
  onSeasonWeather: (season, weather) => {
    seasonBadge.textContent = `${SEASON_EMOJI[season]} ${season.charAt(0).toUpperCase() + season.slice(1)}`
    weatherBadge.textContent = `${WEATHER_EMOJI[weather as keyof typeof WEATHER_EMOJI]} ${WEATHER_LABEL[weather as keyof typeof WEATHER_LABEL]}`
  },
  onAchievement: () => buildJournal(game),
})

function bindCanvasInput(loop: GameLoop): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    canvas.focus()
    loop.pointerDown(e.clientX, e.clientY, e.pointerId)
  })

  canvas.addEventListener('pointermove', (e) => {
    loop.pointerMove(e.clientX, e.clientY)
  })

  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return
    loop.endPointer()
  })

  canvas.addEventListener('pointercancel', () => loop.endPointer())

  canvas.addEventListener('pointerleave', () => {
    loop.hoverHighlight = null
  })

  window.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return
    loop.endPointer()
  })

  canvas.addEventListener('keydown', (e) => {
    const keys: Record<string, ToolMode> = {
      '1': 'hoe',
      '2': 'plant',
      '3': 'water',
      '4': 'harvest',
    }
    if (keys[e.key]) loop.setTool(keys[e.key])
  })
}

bindCanvasInput(game)

document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
  btn.addEventListener('click', () => {
    Sfx.ui()
    game.setTool(btn.dataset.tool as ToolMode)
  })
})

document.getElementById('btn-shop')!.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'shop' ? 'none' : 'shop')
})
document.getElementById('btn-upgrades')!.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'upgrades' ? 'none' : 'upgrades')
})
document.getElementById('btn-inventory')!.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'inventory' ? 'none' : 'inventory')
})
document.getElementById('btn-empire')!.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'empire' ? 'none' : 'empire')
})
document.getElementById('btn-journal')!.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'journal' ? 'none' : 'journal')
})

document.querySelectorAll<HTMLButtonElement>('.journal-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    Sfx.ui()
    setJournalTab(tab.dataset.tab!)
  })
})

backdrop.addEventListener('click', () => game.openPanel('none'))

document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((btn) =>
  btn.addEventListener('click', () => game.openPanel('none')),
)

cropSelect.addEventListener('change', () => {
  game.setCrop(cropSelect.value as CropId)
})

document.getElementById('btn-sell')!.addEventListener('click', (e) => {
  e.stopPropagation()
  Sfx.ui()
  game.sellHarvest()
})

document.getElementById('btn-sort')!.addEventListener('click', (e) => {
  e.stopPropagation()
  Sfx.ui()
  game.inventory.autoSort()
  buildInventory(game)
  showToast('Satchel sorted')
})

dailyBtn.addEventListener('click', () => {
  Sfx.daily()
  game.claimDaily()
})

capacityBtn.addEventListener('click', () => {
  Sfx.ui()
  game.openPanel(game.panel === 'inventory' ? 'none' : 'inventory')
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  if (confirm('Reset your saved farm forever on this browser?')) {
    clearSave()
    location.reload()
  }
})

const ro = new ResizeObserver(() => game.resize())
ro.observe(canvas)

populateCropSelect(game)
buildShop(game)
buildUpgrades(game)
buildInventory(game)
buildJournal(game)
buildEmpire(game)
buildFieldStrip(game)
updateTractorStatus(game)
automationStatusEl.textContent = game.automation.statusLine()
setPanelVisible(game, 'none')
canvas.dataset.tool = game.tool

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  game.tick(dt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
