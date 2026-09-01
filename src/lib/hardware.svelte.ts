import { hardware } from './data'
import {
  game,
  currentYear,
  techLevel,
  storeCatalog,
  START_YEAR,
  man,
  compatMark,
  compatCoeff,
  licenseFeeMultiplier,
  freeStudio,
  HALL_OF_FAME_SCORE,
  COMPAT_REVIEW,
  ARCADE_WEEKS,
  ARCADE_INCOME,
  type RoleBonus,
  type Store,
} from './state.svelte'
import { effStats, activeEmployees } from './employees.svelte'

const DEV_TARGET_PER_POWER = 120
const PEAK_YEARS = 5
const PC_SALES_COEFF = 0.3 // PCはバランス上売れにくい
const MARKET_GROWTH_START = 0.1
const MARKET_GROWTH_PER_YEAR = 0.05

export function findHardware(id: string) {
  return hardware.hardware.find((h) => h.id === id) ?? game.ownHardware.find((h) => h.id === id)
}

export function hwName(id: string): string {
  return findHardware(id)?.name ?? id
}

// PCの性能は時代に合わせて成長（1983年=1、10年ごとに+2）
function pcPower(year: number): number {
  return Math.min(10, 1 + Math.floor((year - START_YEAR) / 10) * 2)
}

export function hardwarePower(id: string, year?: number): number {
  const hw = findHardware(id)
  if (!hw) return 5
  if (hw.type === 'pc') return pcPower(year ?? currentYear())
  return hw.params?.power ?? 5
}

// 開発目標値: ハードのスペック(power)に比例して増える。高スペックほど作り込める＝時間がかかる
export function devTarget(hardwareId: string, year?: number): number {
  return hardwarePower(hardwareId, year) * DEV_TARGET_PER_POWER
}

export function effectiveInstallBase(id: string, year: number): number {
  const hw = findHardware(id)
  if (!hw || hw.installBase == null) return 0
  const age = year - hw.releaseYear
  let factor = Math.min(1, (age + 1) / PEAK_YEARS)
  if (age >= PEAK_YEARS) {
    factor *= Math.max(0.2, Math.pow(0.9, age - PEAK_YEARS + 1))
  }
  return Math.round(hw.installBase * factor)
}

export function licenseCost(id: string): number {
  const hw = findHardware(id)
  if (!hw || hw.installBase == null) return 0
  if (hw.type === 'pc') return 0
  return Math.round(hw.installBase * 2)
}

export function hasLicense(id: string): boolean {
  if (game.ownHardware.some((h) => h.id === id)) return true
  const hw = findHardware(id)
  if (hw?.type === 'pc') return true
  return game.licenses.includes(id)
}

export function buyLicense(id: string) {
  if (hasLicense(id)) return
  const cost = licenseCost(id)
  if (game.money < cost) {
    game.lastReport = `ライセンス取得費が足りません（${hwName(id)} は ${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.licenses.push(id)
  game.lastReport = `${hwName(id)} のライセンスを取得しました（${man(cost)}）`
}

export function productionCost(hw: ReturnType<typeof findHardware>): number {
  const media = (hw?.media ?? []).join('')
  const base = media.includes('カセット') ? 1000 : 300
  return Math.round(base * (1 - 0.1 * techLevel('compress')))
}

export function unitCost(hardwareId: string): number {
  return productionCost(findHardware(hardwareId))
}

export function supportsDl(hardwareId: string): boolean {
  const hw = findHardware(hardwareId)
  if (!hw) return false
  return hw.type === 'pc' || (hw.media ?? []).includes('ダウンロード')
}

export function availableStores(hardwareId: string): Store[] {
  if (!supportsDl(hardwareId)) return []
  return storeCatalog.filter((s) => s.releaseYear <= currentYear())
}

export function fameCoeff(fame: number): number {
  return 1 + (fame / 100) * 0.5
}

// 市場係数（ハード種別による売れやすさの差）
export function marketFactor(hw: ReturnType<typeof findHardware>): number {
  return hw?.type === 'pc' ? PC_SALES_COEFF : 1.0
}

// 市場成長係数: 序盤は市場が小さい（10%）ため売上が少なく、年を追うごとに成長して最大1.0倍へ
export function marketGrowth(year: number): number {
  const t = Math.max(0, year - START_YEAR)
  return Math.min(1, MARKET_GROWTH_START + t * MARKET_GROWTH_PER_YEAR)
}

// 自社ハード開発
export function canDevelopHardware(): boolean {
  return game.employees.some((e) => e.role === 'ハードエンジニア' || e.role === 'スーパーハッカー')
}

export function startHardware(name: string, type: string, power: number) {
  if (game.hwProject) {
    game.lastReport = 'すでに自社ハードを開発中です'
    return
  }
  if (!canDevelopHardware()) {
    game.lastReport = 'ハードエンジニア（またはスーパーハッカー）が必要です'
    return
  }
  const cost = power * 200_000_000
  if (game.money < cost) {
    game.lastReport = `開発費が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.hwProject = { name, type, power, progress: 0, target: power * 4, cost }
  game.lastReport = `自社ハード「${name}」の開発を開始しました（性能${power}・開発費${man(cost)}）`
}

export function completeHardware(): string {
  const p = game.hwProject!
  const installBase = p.power * 1_000_000
  const networkCost = p.power >= 7 ? p.power * 200_000 : 0
  game.ownHardware.push({
    id: 'own-' + (game.ownHardware.length + 1),
    name: p.name,
    type: p.type,
    releaseYear: currentYear(),
    installBase,
    media: p.type === '家庭用' ? ['光ディスク'] : ['カセット'],
    licenseFee: 0,
    networkCost,
    params: { power: p.power, popularity: p.power },
  })
  game.hwProject = null
  game.fame = Math.min(100, game.fame + 5)
  return `自社ハード「${p.name}」が完成！ 普及見込み ${Math.round(installBase / 10000).toLocaleString()}万台（ライセンス料0円で開発可能）`
}

// アーケードゲーム開発
export function startArcade(name: string, genre: string, content: string, boardId: string) {
  if (game.arcadeProject) {
    game.lastReport = 'すでにアーケードゲームを開発中です'
    return
  }
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください'
    return
  }
  game.arcadeProject = { name, genre, content, boardId, stage: '開発', progress: 0, bug: 0 }
  game.lastReport = `アーケード「${name}」の開発を開始しました（${genre} × ${content} / ${hwName(boardId)}）`
}

export function finishArcade() {
  if (!game.arcadeProject || game.arcadeProject.stage !== 'バグ取り') return
  const msg = completeArcade()
  game.lastReport = msg
}

export function completeArcade(): string {
  const p = game.arcadeProject!
  const power = hardwarePower(p.boardId)
  const cap = power * 10
  const act = activeEmployees()
  const n = act.length || 1
  const avg = (key: keyof RoleBonus) => act.reduce((s, e) => s + effStats(e)[key], 0) / n
  const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)))

  const fun = clamp100(avg('fun') * 1.2)
  const creativity = clamp100(avg('creativity') * 1.2)
  const graphics = Math.min(cap, clamp100(avg('graphics') * 1.2))
  const music = Math.min(cap, clamp100(avg('music') * 1.2))
  const bug = Math.max(0, Math.min(30, Math.round(p.bug)))

  const score = Math.max(
    0,
    0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music - bug * 0.8,
  )
  const opeRate = Math.max(0, Math.min(100, Math.round(score * compatCoeff(p.genre, p.content))))

  game.arcadeGames.push({
    name: p.name,
    genre: p.genre,
    content: p.content,
    boardId: p.boardId,
    opeRate,
    weeksLeft: ARCADE_WEEKS,
    ported: false,
    fun,
    creativity,
    graphics,
    music,
  })
  game.arcadeProject = null
  return `アーケード「${p.name}」が完成！ 稼働率 ${opeRate}（週間インカム ${man(opeRate * ARCADE_INCOME)}）`
}

// アーケード作品を家庭用に移植（稼働率60以上、知名度上乗せ）
export function portArcade(idx: number) {
  const ag = game.arcadeGames[idx]
  if (!ag || ag.ported) return
  if (ag.opeRate < 60) {
    game.lastReport = '移植には稼働率60以上が必要です'
    return
  }
  const studio = freeStudio()
  if (!studio) {
    game.lastReport = '空いているスタジオがありません'
    return
  }
  const y = currentYear()
  const homeHw = hardware.hardware
    .filter(
      (h) =>
        h.type !== 'arcade' &&
        h.installBase != null &&
        h.releaseYear <= y &&
        (h.endYear == null || h.endYear >= y),
    )
    .sort((a, b) => (b.installBase ?? 0) - (a.installBase ?? 0))[0]
  if (!homeHw) {
    game.lastReport = '移植先の家庭用ハードがありません'
    return
  }
  const hw = findHardware(homeHw.id)!
  const power = hardwarePower(homeHw.id)
  const cap = power * 10

  const fun = Math.min(100, ag.fun + 10)
  const creativity = Math.min(100, ag.creativity + 10)
  const graphics = Math.min(cap, ag.graphics + 10)
  const music = Math.min(cap, ag.music + 10)

  const score = Math.max(0, 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music)
  const mark = compatMark(ag.genre, ag.content)
  const reviewScore = Math.max(
    0,
    Math.min(40, Math.round((score / 100) * 40 + (COMPAT_REVIEW[mark] ?? 0))),
  )
  const hallOfFame = reviewScore >= HALL_OF_FAME_SCORE

  const quality = 0.5 + score / 100
  const compat = compatCoeff(ag.genre, ag.content)
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * marketFactor(hw) * marketGrowth(y)
  const expectedSales = Math.round(effectiveInstallBase(homeHw.id, y) * reach)

  studio.completed = {
    name: ag.name + '（移植版）',
    genre: ag.genre,
    content: ag.content,
    hardwareId: homeHw.id,
    fun,
    creativity,
    graphics,
    music,
    bug: 0,
    reviewScore,
    hallOfFame,
    expectedSales,
    price: 5800,
    licenseFee: Math.round((hw.licenseFee ?? 0) * licenseFeeMultiplier()),
    storeFee: 0,
    weeksOnSale: 0,
    exhibited: false,
  }
  ag.ported = true
  game.fame = Math.min(100, game.fame + 5)
  if (hallOfFame) game.hallOfFame.push({ ...studio.completed })
  game.lastReport = `アーケード「${ag.name}」を家庭用に移植しました（知名度 +5）`
}
