import {
  game,
  initialStudios,
  PLAYER_EMPLOYEE,
  START_YEAR,
  WEEKS_PER_YEAR,
  man,
  type CompletedGame,
} from './state.svelte'

const SAVE_KEY_PREFIX = 'gamedev-sim-save'
const SAVE_SLOTS = 3
const SAVE_VERSION = 1
const LEGACY_SAVE_KEY = 'gamedev-sim-save'

function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}-${slot}`
}

export function saveSlots(): number {
  return SAVE_SLOTS
}

export function currentSlot(): number {
  return game.saveSlot
}

export function saveGame(slot?: number) {
  if (typeof localStorage === 'undefined') return
  const s = slot ?? game.saveSlot
  game.saveSlot = s
  localStorage.setItem(
    slotKey(s),
    JSON.stringify({ version: SAVE_VERSION, state: $state.snapshot(game) }),
  )
}

export function loadGame(slot?: number): boolean {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function')
      return false
    const s = slot ?? game.saveSlot
    let raw = localStorage.getItem(slotKey(s))
    if (!raw && s === 0) raw = localStorage.getItem(LEGACY_SAVE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const state =
      parsed && typeof parsed === 'object' && parsed.version !== undefined ? parsed.state : parsed
    Object.assign(game, state)
    game.saveSlot = s
    if (Array.isArray(game.techs)) game.techs = {}
    if (!Array.isArray(game.studios) || game.studios.length === 0) game.studios = initialStudios()
    if (!Array.isArray(game.sales)) game.sales = []
    if (!Array.isArray(game.salesHistory)) game.salesHistory = []
    // 旧セーブ移行: studio.onSale → game.sales
    for (const st of game.studios as unknown as Record<string, unknown>[]) {
      if (st.contractId === undefined) st.contractId = null
      if (st.dlc === undefined) st.dlc = null
      if (st.completed && (st.completed as CompletedGame).storeFee === undefined)
        (st.completed as CompletedGame).storeFee = 0
      if (st.onSale) {
        game.sales.push({
          studioName: st.name as string,
          game: st.onSale as CompletedGame,
          inventory: (st.inventory as number) ?? 0,
          currentSold: (st.currentSold as number) ?? 0,
        })
        delete st.onSale
        delete st.inventory
        delete st.currentSold
      }
    }
    for (const g of game.catalog) {
      if (g.exhibited === undefined) g.exhibited = false
      if (g.storeFee === undefined) g.storeFee = 0
      if (!Array.isArray(g.dlcs)) g.dlcs = []
    }
    if (game.event === undefined) game.event = null
    if (game.autoExhibit === undefined) game.autoExhibit = false
    if (game.exhibitYear === undefined) game.exhibitYear = 0
    if (game.officeLevel === undefined) game.officeLevel = 0
    if (game.shipLevel === undefined) game.shipLevel = 1
    if (game.shipLevelMonth === undefined) game.shipLevelMonth = 0
    if (game.restockMonth === undefined) game.restockMonth = 0
    if (!game.hwBoost) game.hwBoost = {}
    if (game.desks === undefined) game.desks = 4
    if (game.layout === undefined) game.layout = 'standard'
    if (game.loungeLevel === undefined) game.loungeLevel = 1
    if (!game.awards) game.awards = { design: 0, music: 0 }
    // 旧セーブ移行: 職業レベルの初期化
    for (const e of game.employees) {
      if (!e.jobLevels || Object.keys(e.jobLevels).length === 0) e.jobLevels = { [e.role]: 1 }
      if (e.stress === undefined) e.stress = 0
      e.resting = e.resting === true
    }
    // 旧セーブ移行: 初期社員（社長）の補完
    if (!game.employees.some((e) => e.id === 'player')) {
      game.employees.unshift({ ...PLAYER_EMPLOYEE, jobLevels: { ...PLAYER_EMPLOYEE.jobLevels } })
    }
    return true
  } catch {
    return false
  }
}

export function peekSlot(slot: number): string {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function')
      return '空き'
    const raw =
      localStorage.getItem(slotKey(slot)) ??
      (slot === 0 ? localStorage.getItem(LEGACY_SAVE_KEY) : null)
    if (!raw) return '空き'
    const d = JSON.parse(raw)
    const st = d && typeof d === 'object' && d.version !== undefined ? d.state : d
    const w = st.week ?? 1
    const y = START_YEAR + Math.floor((w - 1) / WEEKS_PER_YEAR)
    const m = Math.floor(((w - 1) % WEEKS_PER_YEAR) / 4) + 1
    return `${y}年${m}月 / 資金 ${man(Number(st.money ?? 0))} / 知名度 ${st.fame ?? 0}`
  } catch {
    return '空き'
  }
}
