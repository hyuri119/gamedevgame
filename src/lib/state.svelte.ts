import { kumiawase } from './data'
import employeesData from '../../data/employees.json'
import tenantsData from '../../data/tenants.json'
import technologiesData from '../../data/technologies.json'
import contractsData from '../../data/contracts.json'
import storesData from '../../data/stores.json'

export interface Employee {
  id: string
  name: string
  role: string
  level: number
  fun: number
  creativity: number
  graphics: number
  music: number
  speed: number
  salary: number
  contract: number
  availableFrom?: number
  jobLevels?: Record<string, number>
  stress?: number
  resting?: boolean
}

export interface DevProject {
  name: string
  genre: string
  content: string
  hardwareId: string
  stage: '開発' | 'バグ取り'
  progress: number
  bug: number
  exhibited: boolean
  bonus: { fun: number; creativity: number; graphics: number; music: number }
}

export interface CompletedGame {
  name: string
  genre: string
  content: string
  hardwareId: string
  fun: number
  creativity: number
  graphics: number
  music: number
  bug: number
  reviewScore: number
  hallOfFame: boolean
  expectedSales: number
  forecastSales: number
  price: number
  licenseFee: number
  storeFee: number
  weeksOnSale: number
  exhibited: boolean
}

export interface Studio {
  id: number
  name: string
  leadId: string | null
  dev: DevProject | null
  completed: CompletedGame | null
  contractId: string | null
  dlc: DlcProject | null
}

// DLC制作プロジェクト（スタジオを占有する小規模開発）
export interface DlcProject {
  catalogIdx: number
  baseName: string
  name: string
  price: number
  cost: number
  nth: number // 何本目のDLCか（1始まり。売上逓減に使用）
  progress: number
  target: number
}

export interface OnSaleGame {
  studioName: string
  game: CompletedGame
  inventory: number
  currentSold: number
}

export interface SalesPoint {
  week: number
  revenue: number
  sold: number
}

export interface OwnHardware {
  id: string
  name: string
  type: string
  releaseYear: number
  installBase: number // 寿命台数（目標）
  media: string[]
  licenseFee: number
  networkCost: number // 週間ネットワーク維持費
  params: { power: number; popularity: number }
}

export interface HwProject {
  name: string
  type: string
  power: number
  progress: number
  target: number
  cost: number
}

export interface ArcadeProject {
  name: string
  genre: string
  content: string
  boardId: string
  stage: '開発' | 'バグ取り'
  progress: number
  bug: number
}

export interface ArcadeGame {
  name: string
  genre: string
  content: string
  boardId: string
  opeRate: number // 稼働率 0〜100
  weeksLeft: number
  ported: boolean
  fun: number
  creativity: number
  graphics: number
  music: number
}

export interface CatalogGame {
  name: string
  genre: string
  content: string
  hardwareId: string
  reviewScore: number
  hallOfFame: boolean
  expectedSales: number
  price: number
  licenseFee: number
  storeFee: number
  inventory: number
  soldTotal: number
  exhibited: boolean
  dlcs?: DlcInfo[]
  dlcCapBonus?: number // DLC評価による本編ロングテール上限の引き上げ量
  boostWeeks?: number // 本編再燃ブーストの残り週数
  boostRate?: number // ブースト中の週次追加需要率（expectedSales 比）
}

// 発売済みDLCの情報（デジタル販売のため在庫なし）
export interface DlcInfo {
  name: string
  reviewScore: number
  price: number
  expectedSales: number
  storeFee: number
  weeksOnSale: number
  soldTotal: number
}

export interface Contract {
  id: string
  name: string
  desc: string
  reward: number
  deadline: number
  minFame: number
  target: number
}

interface ActiveContract {
  id: string
  name: string
  reward: number
  deadline: number
  target: number
  progress: number
  elapsed: number
  studioId: number
}

export type OfficeLayout = 'focused' | 'standard' | 'relaxed'

export type GameEvent = { type: 'decks' }

export const contractCatalog: Contract[] = contractsData.contracts

export interface Store {
  id: string
  name: string
  realName: string
  releaseYear: number
  commission: number
  reachMul: number
  desc: string
}
export const storeCatalog: Store[] = storesData.stores

export const START_YEAR = 1983
export const WEEKS_PER_YEAR = 48
export const SALES_SHARE = [0, 0.35, 0.25, 0.15, 0.1, 0.08, 0.07]
const COMPAT: Record<string, number> = {
  '☆': 1.5,
  '◎': 1.2,
  '◯': 1.0,
  '◇': 0.85,
  '△': 0.7,
  '✕': 0.5,
}
export const COMPAT_REVIEW: Record<string, number> = {
  '☆': 4,
  '◎': 2,
  '◯': 1,
  '◇': 0,
  '△': -2,
  '✕': -4,
}
export const HALL_OF_FAME_SCORE = 32
const MAX_TENANTS = 3
export const MAX_STUDIOS = 5
const SHIP_CAP_BASE = 500_000
const SHIP_CAP_FACTORY = 2_000_000
export const ARCADE_DEV_TARGET = 120
export const ARCADE_WEEKS = 24
export const ARCADE_INCOME = 30_000

export const employeePool: Employee[] = employeesData.employees

export interface Tenant {
  id: string
  name: string
  effect: string
  cost: number
}
export const tenantCatalog: Tenant[] = tenantsData.tenants

export interface Technology {
  id: string
  name: string
  maxLevel: number
  costs: number[]
  desc: string[]
}
export const techCatalog: Technology[] = technologiesData.technologies

export interface RoleBonus {
  fun: number
  creativity: number
  graphics: number
  music: number
  speed: number
}

export interface RoleDef {
  to: string[]
  level: number
  bonus: RoleBonus
}

const initialState = {
  money: 100_000_000,
  week: 13, // 4月スタート（1983年4月）
  employees: [] as Employee[],
  scoutCandidates: [] as Employee[],
  fame: 0,
  tenants: [] as string[],
  techs: {} as Record<string, number>,
  licenses: [] as string[],
  ownHardware: [] as OwnHardware[],
  hwProject: null as HwProject | null,
  arcadeProject: null as ArcadeProject | null,
  arcadeGames: [] as ArcadeGame[],
  yearGames: [] as { name: string; reviewScore: number; graphics: number; music: number }[],
  contestYear: 0,
  grandPrix: 0,
  catalog: [] as CatalogGame[],
  sales: [] as OnSaleGame[],
  salesHistory: [] as SalesPoint[],
  hallOfFame: [] as CompletedGame[],
  activeContract: null as ActiveContract | null,
  doneContracts: [] as string[],
  totalSales: 0,
  lastReport: 'ようこそ！社員を雇用してゲーム開発を始めましょう。' as string,
  gameOver: false,
  officeLevel: 0,
  desks: 4,
  layout: 'standard' as OfficeLayout,
  loungeLevel: 1,
  awards: { design: 0, music: 0 },
  salaryYear: 1,
  event: null as GameEvent | null,
  autoExhibit: false,
  exhibitYear: 0,
  saveSlot: 0,
}

export function initialStudios(): Studio[] {
  return [
    { id: 1, name: '本社', leadId: null, dev: null, completed: null, contractId: null, dlc: null },
  ]
}

export const game = $state({ ...structuredClone(initialState), studios: initialStudios() })

export function nextStudioId(): number {
  return Math.max(...game.studios.map((s) => s.id), 0) + 1
}

export function year(): number {
  return Math.floor((game.week - 1) / WEEKS_PER_YEAR) + 1
}

export function month(): number {
  return Math.floor(((game.week - 1) % WEEKS_PER_YEAR) / 4) + 1
}

export function weekOfMonth(): number {
  return Math.floor((game.week - 1) % 4) + 1
}

export function currentYear(): number {
  return START_YEAR + year() - 1
}

export function hasTenant(id: string): boolean {
  return game.tenants.includes(id)
}

export function buyTenant(id: string) {
  const t = tenantCatalog.find((x) => x.id === id)
  if (!t) return
  if (hasTenant(id)) return
  if (game.tenants.length >= MAX_TENANTS) {
    game.lastReport = 'テナントは最大3つまでです'
    return
  }
  if (game.money < t.cost) {
    game.lastReport = `建設費用が足りません（${t.name} は ${man(t.cost)} 必要）`
    return
  }
  game.money -= t.cost
  game.tenants.push(id)
  game.lastReport = `${t.name} を導入しました（${t.effect}）`
}

export function shipCap(): number {
  return hasTenant('factory') ? SHIP_CAP_FACTORY : SHIP_CAP_BASE
}

export function licenseFeeMultiplier(): number {
  return hasTenant('lawyer') ? 0.7 : 1.0
}

export function techLevel(id: string): number {
  return game.techs[id] ?? 0
}

export function techDesc(id: string): string {
  const t = techCatalog.find((x) => x.id === id)
  const lv = techLevel(id)
  if (!t) return ''
  return lv === 0 ? '未取得' : t.desc[lv - 1]
}

export function buyTech(id: string) {
  const t = techCatalog.find((x) => x.id === id)
  if (!t) return
  const lv = techLevel(id)
  if (lv >= t.maxLevel) return
  const cost = t.costs[lv]
  if (game.money < cost) {
    game.lastReport = `研究費用が足りません（${t.name} Lv${lv + 1} は ${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.techs[id] = lv + 1
  game.lastReport = `テクノロジー「${t.name}」を Lv${lv + 1} に（${t.desc[lv]}）`
}

// 金額の短縮表示: 1万円以上は万円、1億円以上は億円で表示
export function man(yen: number): string {
  const v = Math.round(yen)
  const abs = Math.abs(v)
  if (abs >= 100_000_000)
    return `${(v / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}億円`
  if (abs >= 10000) return `${Math.round(v / 10000).toLocaleString()}万円`
  return `${v.toLocaleString()}円`
}

export function compatMark(genre: string, content: string): string {
  return kumiawase.matrix.get(content)?.get(genre) ?? '◇'
}

export function compatCoeff(genre: string, content: string): number {
  return COMPAT[compatMark(genre, content)] ?? 0.85
}

export function freeStudio(): Studio | undefined {
  return game.studios.find((s) => !s.dev && !s.completed && !s.contractId && !s.dlc)
}

// 売上予測（真の期待売上の±15%。1000本単位に丸めた表示用。旧セーブ互換でフォールバックあり）
export function forecastSalesOf(g: { expectedSales: number; forecastSales?: number }): number {
  return g.forecastSales ?? g.expectedSales
}

export function makeForecast(expected: number): number {
  const h = (((expected * 2654435761) >>> 0) % 1000) / 1000
  const noisy = expected * (0.85 + h * 0.3)
  return Math.max(1000, Math.round(noisy / 1000) * 1000)
}

export function resetGame() {
  Object.assign(game, structuredClone(initialState))
  game.studios = initialStudios()
}
