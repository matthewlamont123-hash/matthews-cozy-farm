import './style.css'
import { CROP_LIST, CROPS, cropUnlocked, RARITY_LABEL, SEASON_LABEL, type CropId } from './data/crops'
import type { UpgradeCategory } from './data/upgrades'
import { UPGRADE_NODES } from './data/upgrades'
import type { PanelId } from './game/Game'
import { GameLoop } from './game/Game'
import { Sfx } from './game/Audio'
import type { ToolMode } from './game/types'
import { HYBRID_RECIPES } from './data/hybrids'
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

const panels = {
  shop: document.getElementById('panel-shop')!,
  upgrades: document.getElementById('panel-upgrades')!,
  inventory: document.getElementById('panel-inventory')!,
  journal: document.getElementById('panel-journal')!,
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

function populateCropSelect(loop: GameLoop): void {
  cropSelect.innerHTML = ''
  for (const c of CROP_LIST) {
    const opt = document.createElement('option')
    opt.value = c.id
    const multi = c.maxHarvests && c.maxHarvests > 1 ? ` · ×${c.maxHarvests}` : ''
    opt.textContent = `${c.emoji} ${c.name}${multi}`
    if (!cropUnlocked(c, loop.upgrades.owned, loop.discoveredHybrids)) {
      opt.disabled = true
      opt.textContent += c.isHybrid ? ' (breed)' : ' (upgrade)'
    }
    cropSelect.appendChild(opt)
  }
  cropSelect.value = loop.selectedCrop
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
  const bRoot = document.getElementById('journal-breed')!
  const aRoot = document.getElementById('journal-achieve')!
  const pRoot = document.getElementById('journal-prestige')!

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

  bRoot.innerHTML = HYBRID_RECIPES.map((r) => {
    const known = loop.discoveredHybrids.has(r.result)
    const res = CROPS[r.result]
    const pa = CROPS[r.parentA]
    const pb = CROPS[r.parentB]
    return `
      <div class="journal-card ${known ? 'owned' : ''}">
        <strong>${known ? res.emoji : '❓'} ${known ? res.name : 'Unknown hybrid'}</strong>
        <p class="muted small">${pa.emoji}+${pb.emoji} → ${known ? res.name : '?'} · ${r.cost}¢</p>
        <button type="button" data-breed-a="${r.parentA}" data-breed-b="${r.parentB}">Breed</button>
      </div>`
  }).join('')
  bRoot.querySelectorAll<HTMLButtonElement>('[data-breed-a]').forEach((btn) => {
    btn.addEventListener('click', () =>
      loop.tryBreed(btn.dataset.breedA as CropId, btn.dataset.breedB as CropId),
    )
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
    const def = CROPS[id]
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
