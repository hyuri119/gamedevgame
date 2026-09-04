import {
  game,
  shipCap,
  hasTenant,
  storeCatalog,
  man,
  year,
  month,
  type Studio,
  type CatalogGame,
  type RoleBonus,
} from './state.svelte'
import {
  findHardware,
  supportsDl,
  availableStores,
  productionCost,
  hardwarePower,
} from './hardware.svelte'
import { effStats, activeEmployees } from './employees.svelte'

const DLC_TARGET_PER_POWER = 30 // DLC開発目標値（本編 power×120 の 1/4）
const DLC_COST_PER_POWER = 100_000 // DLC制作費（ハードpower比例）
const DLC_PRICE_DIVISOR = 4 // DLC価格 = 本体価格の 1/4
const DLC_SALES_BASE = 0.1 // 本編期待売上に対する1本目のDLC売上比率
const DLC_DECAY = 0.6 // 2本目以降の逓減率
const DLC_BOOST_WEEKS = 8 // 高評価DLCによる本編再燃ブーストの週数
const DLC_FAME_SCORE = 32 // 知名度が上がるDLCレビュー点のしきい値

const DLC_NAME_TEMPLATES = [
  '追加シナリオ',
  '新キャラセット',
  '追加マップ',
  '追加ダンジョン',
  'BGMコレクション',
  'コスチューム集',
  '追加モード',
]

const SHIP_LEVEL_COST = 1_000_000 // 出荷レベルアップ費用（1レベルあたり。レベルに比例して上昇）
const BULK_SHIP_LEVELS = 10 // 大型生産力増強で上がるレベル数
const BULK_SHIP_COST_MUL = 100 // 大型生産力増強の費用倍率（通常の100倍）

// ---- 出荷レベル（本家式。初期上限1万本・月1回レベルアップ可） ----

function shipMonthKey(): number {
  return year() * 100 + month()
}

export function shipLevelCost(): number {
  return SHIP_LEVEL_COST * (game.shipLevel ?? 1)
}

export function bulkShipCost(): number {
  return shipLevelCost() * BULK_SHIP_COST_MUL
}

export function canLevelUpShip(): boolean {
  return game.shipLevelMonth !== shipMonthKey()
}

export function levelUpShip() {
  if (!canLevelUpShip()) {
    game.lastReport = '出荷レベルアップは月に1回までです'
    return
  }
  const cost = shipLevelCost()
  if (game.money < cost) {
    game.lastReport = `レベルアップ費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.shipLevel = (game.shipLevel ?? 1) + 1
  game.shipLevelMonth = shipMonthKey()
  game.lastReport = `出荷レベルが Lv${game.shipLevel} に上がりました（上限 ${shipCap().toLocaleString()}本）`
}

export function bulkShipBoost() {
  const cost = bulkShipCost()
  if (game.money < cost) {
    game.lastReport = `増強費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.shipLevel = (game.shipLevel ?? 1) + BULK_SHIP_LEVELS
  game.lastReport = `大型生産力増強！出荷レベルが Lv${game.shipLevel} に上がりました（上限 ${shipCap().toLocaleString()}本）`
}

export function ship(quantity: number, studioId: number, storeId?: string) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio || !studio.completed) return
  const q = Math.min(Math.floor(quantity / 1000) * 1000, shipCap())
  const hw = findHardware(studio.completed.hardwareId)
  const store = storeId ? storeCatalog.find((s) => s.id === storeId) : undefined
  const useDl = !!store && supportsDl(studio.completed.hardwareId)
  const unitProd = useDl ? 0 : productionCost(hw)
  const cost = unitProd * q
  if (q <= 0) {
    game.lastReport = '出荷本数を入力してください'
    return
  }
  if (game.money < cost) {
    game.lastReport = `生産費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  const storeFee = useDl ? Math.round(studio.completed.price * store!.commission) : 0
  const reachMul = useDl ? (store!.reachMul ?? 1) : 1
  game.sales.push({
    studioName: studio.name,
    game: {
      ...studio.completed,
      weeksOnSale: 0,
      expectedSales: Math.round(studio.completed.expectedSales * reachMul),
      storeFee,
    },
    inventory: q,
    currentSold: 0,
  })
  studio.completed = null
  const channel = useDl ? ` / ${store!.name}（DL）` : ''
  game.lastReport = `${q.toLocaleString()}本 出荷しました（生産費 ${man(cost)}${channel}）`
}

// カタログ作品の再出荷（月にどれか1本だけ）
export function canRestock(): boolean {
  return game.restockMonth !== shipMonthKey()
}

export function restock(idx: number, quantity: number) {
  const g = game.catalog[idx]
  if (!g) return
  if (!canRestock()) {
    game.lastReport = '再出荷は月に1本までです'
    return
  }
  const q = Math.floor(Math.floor(quantity) / 1000) * 1000
  if (q <= 0) return
  const hw = findHardware(g.hardwareId)
  const cost = productionCost(hw) * q
  if (game.money < cost) {
    game.lastReport = `生産費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  g.inventory += q
  game.restockMonth = shipMonthKey()
  game.lastReport = `「${g.name}」を再出荷しました（+${q.toLocaleString()}本 / 生産費 ${man(cost)}）`
}

// カタログ作品の在庫処分（リサイクルショップがあれば買い取り）
export function disposeCatalog(idx: number) {
  const g = game.catalog[idx]
  if (!g || g.inventory <= 0) return
  if (hasTenant('recycle')) {
    const refund = g.inventory * 500
    game.money += refund
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分（リサイクル回収 +${man(refund)}）`
  } else {
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分しました`
  }
  g.inventory = 0
}

// ---- DLC（発売済み作品への追加コンテンツ。DLストア経由でデジタル販売） ----

export function canMakeDlc(g: CatalogGame): boolean {
  return supportsDl(g.hardwareId) && availableStores(g.hardwareId).length > 0
}

export function dlcCostOf(hardwareId: string): number {
  return hardwarePower(hardwareId) * DLC_COST_PER_POWER
}

export function startDlc(catalogIdx: number, studioId: number) {
  const g = game.catalog[catalogIdx]
  const studio = game.studios.find((s) => s.id === studioId)
  if (!g || !studio) return
  if (!canMakeDlc(g)) {
    game.lastReport = 'この作品はDLCを配信できません（DL対応ハード・DLストア解禁が必要）'
    return
  }
  if (studio.dev || studio.completed || studio.contractId || studio.dlc) return
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください'
    return
  }
  if (game.studios.some((s) => s.dlc?.catalogIdx === catalogIdx)) {
    game.lastReport = `「${g.name}」のDLCはすでに制作中です`
    return
  }
  const cost = dlcCostOf(g.hardwareId)
  if (game.money < cost) {
    game.lastReport = `制作費が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  const power = hardwarePower(g.hardwareId)
  const nth = (g.dlcs?.length ?? 0) + 1
  const base = DLC_NAME_TEMPLATES[(nth - 1) % DLC_NAME_TEMPLATES.length]
  const round = Math.floor((nth - 1) / DLC_NAME_TEMPLATES.length)
  studio.dlc = {
    catalogIdx,
    baseName: g.name,
    name: round > 0 ? `${base}${round + 1}` : base,
    price: Math.max(100, Math.round(g.price / DLC_PRICE_DIVISOR)),
    cost,
    nth,
    progress: 0,
    target: power * DLC_TARGET_PER_POWER,
  }
  game.lastReport = `「${g.name}」のDLC「${studio.dlc.name}」の制作を開始しました（${studio.name} / 制作費 ${man(cost)}）`
}

export function cancelDlc(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio || !studio.dlc) return
  game.lastReport = `DLC「${studio.dlc.name}」の制作を中止しました（制作費は返還されません）`
  studio.dlc = null
}

export function completeDlc(studio: Studio): string {
  const p = studio.dlc!
  const g = game.catalog[p.catalogIdx]
  studio.dlc = null
  if (!g) return ''
  // レビュー: 本編スコア（40点満点）を基準に、チームのおもしろさ/独創性と乱数で加減
  const act = activeEmployees()
  const n = act.length || 1
  const avg = (key: keyof RoleBonus) => act.reduce((s, e) => s + effStats(e)[key], 0) / n
  const teamBonus = ((avg('fun') * 0.5 + avg('creativity') * 0.5) / 100) * 8
  const roll = (Math.random() - 0.3) * 6
  const reviewScore = Math.max(0, Math.min(40, Math.round(g.reviewScore * 0.7 + teamBonus + roll)))
  const salesMul = 0.7 + (reviewScore / 40) * 0.6 // 0.7〜1.3倍
  const expectedSales = Math.max(
    50,
    Math.round(g.expectedSales * DLC_SALES_BASE * Math.pow(DLC_DECAY, p.nth - 1) * salesMul),
  )
  const store = availableStores(g.hardwareId).at(-1)
  const storeFee = store ? Math.round(p.price * store.commission) : 0
  const dlcs = g.dlcs ?? (g.dlcs = [])
  dlcs.push({
    name: p.name,
    reviewScore,
    price: p.price,
    expectedSales,
    storeFee,
    weeksOnSale: 0,
    soldTotal: 0,
  })
  // 本編再燃: 評価が良いほどロングテール上限を引き上げ、週次需要もブースト
  g.dlcCapBonus = (g.dlcCapBonus ?? 0) + (reviewScore / 40) * 0.3
  g.boostWeeks = DLC_BOOST_WEEKS
  g.boostRate = 0.01 + (reviewScore / 40) * 0.04
  let msg = `「${g.name}」のDLC「${p.name}」が完成しました！レビュー ${reviewScore}点`
  if (reviewScore >= DLC_FAME_SCORE) {
    game.fame = Math.min(100, game.fame + 2)
    msg += '（知名度 +2）'
  }
  return msg
}
