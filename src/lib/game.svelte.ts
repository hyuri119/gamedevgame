import { hardware, kumiawase } from './data';
import employeesData from '../../data/employees.json';
import tenantsData from '../../data/tenants.json';
import technologiesData from '../../data/technologies.json';
import rolesData from '../../data/roles.json';
import contractsData from '../../data/contracts.json';
import storesData from '../../data/stores.json';

export interface Employee {
  id: string;
  name: string;
  role: string;
  level: number;
  fun: number;
  creativity: number;
  graphics: number;
  music: number;
  speed: number;
  salary: number;
  contract: number;
  availableFrom?: number;
}

export interface DevProject {
  name: string;
  genre: string;
  content: string;
  hardwareId: string;
  stage: '開発' | 'バグ取り';
  progress: number;
  bug: number;
  exhibited: boolean;
  bonus: { fun: number; creativity: number; graphics: number; music: number };
}

export interface CompletedGame {
  name: string;
  genre: string;
  content: string;
  hardwareId: string;
  fun: number;
  creativity: number;
  graphics: number;
  music: number;
  bug: number;
  reviewScore: number;
  hallOfFame: boolean;
  expectedSales: number;
  price: number;
  licenseFee: number;
  storeFee: number;
  weeksOnSale: number;
  exhibited: boolean;
}

export interface Studio {
  id: number;
  name: string;
  leadId: string | null;
  dev: DevProject | null;
  completed: CompletedGame | null;
  contractId: string | null;
}

export interface OnSaleGame {
  studioName: string;
  game: CompletedGame;
  inventory: number;
  currentSold: number;
}

export interface SalesPoint {
  week: number;
  revenue: number;
  sold: number;
}

export interface OwnHardware {
  id: string;
  name: string;
  type: string;
  releaseYear: number;
  installBase: number; // 寿命台数（目標）
  media: string[];
  licenseFee: number;
  networkCost: number; // 週間ネットワーク維持費
  params: { power: number; popularity: number };
}

export interface HwProject {
  name: string;
  type: string;
  power: number;
  progress: number;
  target: number;
  cost: number;
}

export interface ArcadeProject {
  name: string;
  genre: string;
  content: string;
  boardId: string;
  stage: '開発' | 'バグ取り';
  progress: number;
  bug: number;
}

export interface ArcadeGame {
  name: string;
  genre: string;
  content: string;
  boardId: string;
  opeRate: number; // 稼働率 0〜100
  weeksLeft: number;
  ported: boolean;
  fun: number;
  creativity: number;
  graphics: number;
  music: number;
}

export interface CatalogGame {
  name: string;
  genre: string;
  content: string;
  hardwareId: string;
  reviewScore: number;
  hallOfFame: boolean;
  expectedSales: number;
  price: number;
  licenseFee: number;
  storeFee: number;
  inventory: number;
  soldTotal: number;
  exhibited: boolean;
}

export interface Contract {
  id: string;
  name: string;
  desc: string;
  reward: number;
  deadline: number;
  minFame: number;
  target: number;
}

interface ActiveContract {
  id: string;
  name: string;
  reward: number;
  deadline: number;
  target: number;
  progress: number;
  elapsed: number;
  studioId: number;
}

export type GameEvent = { type: 'decks' };

export const contractCatalog: Contract[] = contractsData.contracts;

export interface Store {
  id: string;
  name: string;
  realName: string;
  releaseYear: number;
  commission: number;
  reachMul: number;
  desc: string;
}
export const storeCatalog: Store[] = storesData.stores;

export const START_YEAR = 1983;
export const WEEKS_PER_YEAR = 48;
const DEV_TARGET_PER_POWER = 120;
const PEAK_YEARS = 5;
const SALES_SHARE = [0, 0.35, 0.25, 0.15, 0.1, 0.08, 0.07];
const LONG_TAIL_RATE = 0.005; // ロングテール週間販売率（期待売上の0.5%/週）
const LONG_TAIL_CAP = 1.5; // 累計需要の上限（期待売上の1.5倍）
const COMPAT: Record<string, number> = { '☆': 1.5, '◎': 1.2, '◯': 1.0, '◇': 0.85, '△': 0.7, '✕': 0.5 };
const COMPAT_REVIEW: Record<string, number> = { '☆': 4, '◎': 2, '◯': 1, '◇': 0, '△': -2, '✕': -4 };
const HALL_OF_FAME_SCORE = 32;
const SAVE_KEY_PREFIX = 'gamedev-sim-save';
const SAVE_SLOTS = 3;
const LEGACY_SAVE_KEY = 'gamedev-sim-save';
const MAX_TENANTS = 3;
const MAX_STUDIOS = 5;
const SHIP_CAP_BASE = 500_000;
const SHIP_CAP_FACTORY = 2_000_000;
const STUDIO_COST = 300_000_000;
const ARCADE_DEV_TARGET = 120;
const ARCADE_WEEKS = 24;
const ARCADE_INCOME = 30_000;
const PC_SALES_COEFF = 0.3; // PCはバランス上売れにくい

export const employeePool: Employee[] = employeesData.employees;

export interface Tenant {
  id: string;
  name: string;
  effect: string;
  cost: number;
}
export const tenantCatalog: Tenant[] = tenantsData.tenants;

export interface Technology {
  id: string;
  name: string;
  maxLevel: number;
  costs: number[];
  desc: string[];
}
export const techCatalog: Technology[] = technologiesData.technologies;

const roles = rolesData.roles as Record<string, { to: string; level: number }>;

function findHardware(id: string) {
  return hardware.hardware.find((h) => h.id === id) ?? game.ownHardware.find((h) => h.id === id);
}

export function hwName(id: string): string {
  return findHardware(id)?.name ?? id;
}

// 金額の短縮表示: 1万円以上は万円、1億円以上は億円で表示
export function man(yen: number): string {
  const v = Math.round(yen);
  const abs = Math.abs(v);
  if (abs >= 100_000_000) return `${(v / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}億円`;
  if (abs >= 10000) return `${Math.round(v / 10000).toLocaleString()}万円`;
  return `${v.toLocaleString()}円`;
}

// PCの性能は時代に合わせて成長（1983年=1、10年ごとに+2）
function pcPower(year: number): number {
  return Math.min(10, 1 + Math.floor((year - START_YEAR) / 10) * 2);
}

export function hardwarePower(id: string, year?: number): number {
  const hw = findHardware(id);
  if (!hw) return 5;
  if (hw.type === 'pc') return pcPower(year ?? currentYear());
  return hw.params?.power ?? 5;
}

// 開発目標値: ハードのスペック(power)に比例して増える。高スペックほど作り込める＝時間がかかる
export function devTarget(hardwareId: string, year?: number): number {
  return hardwarePower(hardwareId, year) * DEV_TARGET_PER_POWER;
}

export function compatMark(genre: string, content: string): string {
  return kumiawase.matrix.get(content)?.get(genre) ?? '◇';
}

function compatCoeff(genre: string, content: string): number {
  return COMPAT[compatMark(genre, content)] ?? 0.85;
}

function productionCost(hw: ReturnType<typeof findHardware>): number {
  const media = (hw?.media ?? []).join('');
  const base = media.includes('カセット') ? 1000 : 300;
  return Math.round(base * (1 - 0.1 * techLevel('compress')));
}

export function unitCost(hardwareId: string): number {
  return productionCost(findHardware(hardwareId));
}

export function supportsDl(hardwareId: string): boolean {
  const hw = findHardware(hardwareId);
  if (!hw) return false;
  return hw.type === 'pc' || (hw.media ?? []).includes('ダウンロード');
}

export function availableStores(hardwareId: string): Store[] {
  if (!supportsDl(hardwareId)) return [];
  return storeCatalog.filter((s) => s.releaseYear <= currentYear());
}

export function freeStudio(): Studio | undefined {
  return game.studios.find((s) => !s.dev && !s.completed && !s.contractId);
}

export function effectiveInstallBase(id: string, year: number): number {
  const hw = findHardware(id);
  if (!hw || hw.installBase == null) return 0;
  const age = year - hw.releaseYear;
  const factor = Math.min(1, (age + 1) / PEAK_YEARS);
  return Math.round(hw.installBase * factor);
}

function fameCoeff(fame: number): number {
  return 1 + (fame / 100) * 0.5;
}

// 市場係数（ハード種別による売れやすさの差）
function marketFactor(hw: ReturnType<typeof findHardware>): number {
  return hw?.type === 'pc' ? PC_SALES_COEFF : 1.0;
}

// 市場成長係数: 序盤は市場が小さい（10%）ため売上が少なく、年を追うごとに成長して最大1.0倍へ
const MARKET_GROWTH_START = 0.1;
const MARKET_GROWTH_PER_YEAR = 0.05;
function marketGrowth(year: number): number {
  const t = Math.max(0, year - START_YEAR);
  return Math.min(1, MARKET_GROWTH_START + t * MARKET_GROWTH_PER_YEAR);
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
  salaryYear: 1,
  event: null as GameEvent | null,
  autoExhibit: false,
  exhibitYear: 0,
  saveSlot: 0,
};

function initialStudios(): Studio[] {
  return [
    { id: 1, name: '本社', leadId: null, dev: null, completed: null, contractId: null }
  ];
}

export const game = $state({ ...structuredClone(initialState), studios: initialStudios() });

function nextStudioId(): number {
  return Math.max(...game.studios.map((s) => s.id), 0) + 1;
}

export function year(): number {
  return Math.floor((game.week - 1) / WEEKS_PER_YEAR) + 1;
}

export function month(): number {
  return Math.floor(((game.week - 1) % WEEKS_PER_YEAR) / 4) + 1;
}

export function currentYear(): number {
  return START_YEAR + year() - 1;
}

export function hasTenant(id: string): boolean {
  return game.tenants.includes(id);
}

export function buyTenant(id: string) {
  const t = tenantCatalog.find((x) => x.id === id);
  if (!t) return;
  if (hasTenant(id)) return;
  if (game.tenants.length >= MAX_TENANTS) {
    game.lastReport = 'テナントは最大3つまでです';
    return;
  }
  if (game.money < t.cost) {
    game.lastReport = `建設費用が足りません（${t.name} は ${man(t.cost)} 必要）`;
    return;
  }
  game.money -= t.cost;
  game.tenants.push(id);
  game.lastReport = `${t.name} を導入しました（${t.effect}）`;
}

export function shipCap(): number {
  return hasTenant('factory') ? SHIP_CAP_FACTORY : SHIP_CAP_BASE;
}

export function licenseCost(id: string): number {
  const hw = findHardware(id);
  if (!hw || hw.installBase == null) return 0;
  if (hw.type === 'pc') return 0;
  return Math.round(hw.installBase * 2);
}

export function hasLicense(id: string): boolean {
  if (game.ownHardware.some((h) => h.id === id)) return true;
  const hw = findHardware(id);
  if (hw?.type === 'pc') return true;
  return game.licenses.includes(id);
}

export function buyLicense(id: string) {
  if (hasLicense(id)) return;
  const cost = licenseCost(id);
  if (game.money < cost) {
    game.lastReport = `ライセンス取得費が足りません（${hwName(id)} は ${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  game.licenses.push(id);
  game.lastReport = `${hwName(id)} のライセンスを取得しました（${man(cost)}）`;
}

function licenseFeeMultiplier(): number {
  return hasTenant('lawyer') ? 0.7 : 1.0;
}

export function techLevel(id: string): number {
  return game.techs[id] ?? 0;
}

export function techDesc(id: string): string {
  const t = techCatalog.find((x) => x.id === id);
  const lv = techLevel(id);
  if (!t) return '';
  return lv === 0 ? '未取得' : t.desc[lv - 1];
}

export function buyTech(id: string) {
  const t = techCatalog.find((x) => x.id === id);
  if (!t) return;
  const lv = techLevel(id);
  if (lv >= t.maxLevel) return;
  const cost = t.costs[lv];
  if (game.money < cost) {
    game.lastReport = `研究費用が足りません（${t.name} Lv${lv + 1} は ${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  game.techs[id] = lv + 1;
  game.lastReport = `テクノロジー「${t.name}」を Lv${lv + 1} に（${t.desc[lv]}）`;
}

export function canEvolve(emp: Employee): boolean {
  const r = roles[emp.role];
  return !!r && emp.level >= r.level;
}

export function evolve(id: string) {
  const emp = game.employees.find((e) => e.id === id);
  if (!emp) return;
  const r = roles[emp.role];
  if (!r) {
    game.lastReport = `${emp.name} はこれ以上進化できません`;
    return;
  }
  if (emp.level < r.level) {
    game.lastReport = `${emp.name} の進化には Lv${r.level} 必要です`;
    return;
  }
  const cost = 30_000_000;
  if (game.money < cost) {
    game.lastReport = `進化費用が足りません（${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  emp.fun = Math.min(100, emp.fun + 10);
  emp.creativity = Math.min(100, emp.creativity + 10);
  emp.graphics = Math.min(100, emp.graphics + 10);
  emp.music = Math.min(100, emp.music + 10);
  emp.speed = Math.min(100, emp.speed + 5);
  emp.role = r.to;
  game.lastReport = `${emp.name} が ${r.to} に進化しました！`;
}

export function train(id: string) {
  const emp = game.employees.find((e) => e.id === id);
  if (!emp) return;
  if (emp.level >= 10) {
    game.lastReport = `${emp.name} はレベル上限です`;
    return;
  }
  const cost = emp.level * 5_000_000;
  if (game.money < cost) {
    game.lastReport = `教育費用が足りません（${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  emp.fun = Math.min(100, emp.fun + 5);
  emp.creativity = Math.min(100, emp.creativity + 5);
  emp.graphics = Math.min(100, emp.graphics + 5);
  emp.music = Math.min(100, emp.music + 5);
  emp.speed = Math.min(100, emp.speed + 3);
  emp.salary = Math.round(emp.salary * 1.08);
  emp.level += 1;
  game.lastReport = `${emp.name} を教育しました（Lv ${emp.level - 1} → ${emp.level}、年俸 ${(emp.salary / 10000).toLocaleString()}万円）`;
}

export function hire(id: string) {
  const emp = employeePool.find((e) => e.id === id);
  if (!emp) return;
  if (game.employees.some((e) => e.id === id)) return;
  if (game.money < emp.contract) {
    game.lastReport = `契約金が足りません（${emp.name} は ${man(emp.contract)} 必要）`;
    return;
  }
  game.money -= emp.contract;
  game.employees.push({ ...emp });
  game.scoutCandidates = game.scoutCandidates.filter((c) => c.id !== id);
  game.lastReport = `${emp.name}（${emp.role}）を雇用しました（契約金 ${man(emp.contract)}）`;
}

// スカウト（雇用候補をランダムに数人提示）
export function scout() {
  const y = currentYear();
  const unhired = employeePool.filter(
    (e) => !game.employees.some((h) => h.id === e.id) && (e.availableFrom ?? START_YEAR) <= y
  );
  const shuffled = [...unhired].sort(() => Math.random() - 0.5);
  game.scoutCandidates = shuffled.slice(0, 4);
  if (game.scoutCandidates.length === 0) {
    game.lastReport = '雇用できる候補がいません';
  } else {
    game.lastReport = `${game.scoutCandidates.length}人の候補が見つかりました`;
  }
}

export function fire(id: string) {
  game.employees = game.employees.filter((e) => e.id !== id);
  for (const s of game.studios) {
    if (s.leadId === id) s.leadId = null;
  }
}

// スタジオ発足（責任者に Lv5 以上の社員が必要）
export function foundStudio(name: string, leadId: string) {
  const lead = game.employees.find((e) => e.id === leadId);
  if (!lead) {
    game.lastReport = '責任者となる社員を選んでください';
    return;
  }
  if (lead.level < 5) {
    game.lastReport = '責任者には Lv5 以上の社員が必要です';
    return;
  }
  if (game.studios.some((s) => s.leadId === leadId)) {
    game.lastReport = `${lead.name} は既に別のスタジオの責任者です`;
    return;
  }
  if (game.studios.length >= MAX_STUDIOS) {
    game.lastReport = `スタジオは最大${MAX_STUDIOS}つまでです`;
    return;
  }
  if (game.money < STUDIO_COST) {
    game.lastReport = `発足費用が足りません（${man(STUDIO_COST)} 必要）`;
    return;
  }
  game.money -= STUDIO_COST;
  game.studios.push({
    id: nextStudioId(),
    name,
    leadId,
    dev: null,
    completed: null,
    contractId: null
  });
  game.lastReport = `新スタジオ「${name}」を発足しました（責任者: ${lead.name}）`;
}

// 他社買収（子会社として運用、責任者不要・知名度アップ。交渉失敗リスクあり）
export function acquireCompany() {
  if (game.studios.length >= MAX_STUDIOS) {
    game.lastReport = `スタジオは最大${MAX_STUDIOS}つまでです`;
    return;
  }
  const negotiateFee = 200_000_000;
  const buyPrice = 600_000_000;
  if (game.money < negotiateFee) {
    game.lastReport = `交渉費用が足りません（${man(negotiateFee)} 必要）`;
    return;
  }
  game.money -= negotiateFee;
  if (Math.random() < 0.25) {
    game.lastReport = `買収交渉が決裂しました…交渉費用 ${man(negotiateFee)} を失いました`;
    return;
  }
  if (game.money < buyPrice) {
    game.lastReport = `買収資金が不足したため交渉が白紙に…（交渉費 ${man(negotiateFee)} を失いました）`;
    return;
  }
  game.money -= buyPrice;
  game.studios.push({
    id: nextStudioId(),
    name: `子会社${game.studios.length}`,
    leadId: null,
    dev: null,
    completed: null,
    contractId: null
  });
  game.fame = Math.min(100, game.fame + 10);
  const n = game.employees.filter((e) => e.id.startsWith('acquired')).length + 1;
  game.employees.push({
    id: 'acquired' + n,
    name: `買収した社員${n}`,
    role: 'プログラマ',
    level: 2,
    fun: 20,
    creativity: 15,
    graphics: 20,
    music: 10,
    speed: 20,
    salary: 3_000_000,
    contract: 0
  });
  game.lastReport = '他社を買収し、子会社として運用します（知名度 +10、社員1名を引き継ぎ）';
}

// 自社ハード開発
export function canDevelopHardware(): boolean {
  return game.employees.some((e) => e.role === 'ハードエンジニア' || e.role === 'スーパーハッカー');
}

export function startHardware(name: string, type: string, power: number) {
  if (game.hwProject) {
    game.lastReport = 'すでに自社ハードを開発中です';
    return;
  }
  if (!canDevelopHardware()) {
    game.lastReport = 'ハードエンジニア（またはスーパーハッカー）が必要です';
    return;
  }
  const cost = power * 200_000_000;
  if (game.money < cost) {
    game.lastReport = `開発費が足りません（${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  game.hwProject = { name, type, power, progress: 0, target: power * 4, cost };
  game.lastReport = `自社ハード「${name}」の開発を開始しました（性能${power}・開発費${man(cost)}）`;
}

function completeHardware(): string {
  const p = game.hwProject!;
  const installBase = p.power * 1_000_000;
  const networkCost = p.power >= 7 ? p.power * 200_000 : 0;
  game.ownHardware.push({
    id: 'own-' + (game.ownHardware.length + 1),
    name: p.name,
    type: p.type,
    releaseYear: currentYear(),
    installBase,
    media: p.type === '家庭用' ? ['光ディスク'] : ['カセット'],
    licenseFee: 0,
    networkCost,
    params: { power: p.power, popularity: p.power }
  });
  game.hwProject = null;
  game.fame = Math.min(100, game.fame + 5);
  return `自社ハード「${p.name}」が完成！ 普及見込み ${Math.round(installBase / 10000).toLocaleString()}万台（ライセンス料0円で開発可能）`;
}

// アーケードゲーム開発
export function startArcade(name: string, genre: string, content: string, boardId: string) {
  if (game.arcadeProject) {
    game.lastReport = 'すでにアーケードゲームを開発中です';
    return;
  }
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  game.arcadeProject = { name, genre, content, boardId, stage: '開発', progress: 0, bug: 0 };
  game.lastReport = `アーケード「${name}」の開発を開始しました（${genre} × ${content} / ${hwName(boardId)}）`;
}

export function finishArcade() {
  if (!game.arcadeProject || game.arcadeProject.stage !== 'バグ取り') return;
  const msg = completeArcade();
  game.lastReport = msg;
}

function completeArcade(): string {
  const p = game.arcadeProject!;
  const power = hardwarePower(p.boardId);
  const cap = power * 10;
  const n = game.employees.length || 1;
  const avg = (key: 'fun' | 'creativity' | 'graphics' | 'music') =>
    game.employees.reduce((s, e) => s + e[key], 0) / n;
  const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  const fun = clamp100(avg('fun') * 1.2);
  const creativity = clamp100(avg('creativity') * 1.2);
  const graphics = Math.min(cap, clamp100(avg('graphics') * 1.2));
  const music = Math.min(cap, clamp100(avg('music') * 1.2));
  const bug = Math.max(0, Math.min(30, Math.round(p.bug)));

  const score = Math.max(0, 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music - bug * 0.8);
  const opeRate = Math.max(0, Math.min(100, Math.round(score * compatCoeff(p.genre, p.content))));

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
    music
  });
  game.arcadeProject = null;
  return `アーケード「${p.name}」が完成！ 稼働率 ${opeRate}（週間インカム ${man(opeRate * ARCADE_INCOME)}）`;
}

// アーケード作品を家庭用に移植（稼働率60以上、知名度上乗せ）
export function portArcade(idx: number) {
  const ag = game.arcadeGames[idx];
  if (!ag || ag.ported) return;
  if (ag.opeRate < 60) {
    game.lastReport = '移植には稼働率60以上が必要です';
    return;
  }
  const studio = freeStudio();
  if (!studio) {
    game.lastReport = '空いているスタジオがありません';
    return;
  }
  const y = currentYear();
  const homeHw = hardware.hardware
    .filter((h) => h.type !== 'arcade' && h.installBase != null && h.releaseYear <= y && (h.endYear == null || h.endYear >= y))
    .sort((a, b) => (b.installBase ?? 0) - (a.installBase ?? 0))[0];
  if (!homeHw) {
    game.lastReport = '移植先の家庭用ハードがありません';
    return;
  }
  const hw = findHardware(homeHw.id)!;
  const power = hardwarePower(homeHw.id);
  const cap = power * 10;

  const fun = Math.min(100, ag.fun + 10);
  const creativity = Math.min(100, ag.creativity + 10);
  const graphics = Math.min(cap, ag.graphics + 10);
  const music = Math.min(cap, ag.music + 10);

  const score = Math.max(0, 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music);
  const mark = compatMark(ag.genre, ag.content);
  const reviewScore = Math.max(0, Math.min(40, Math.round((score / 100) * 40 + (COMPAT_REVIEW[mark] ?? 0))));
  const hallOfFame = reviewScore >= HALL_OF_FAME_SCORE;

  const quality = 0.5 + score / 100;
  const compat = compatCoeff(ag.genre, ag.content);
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * marketFactor(hw) * marketGrowth(y);
  const expectedSales = Math.round(effectiveInstallBase(homeHw.id, y) * reach);

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
    exhibited: false
  };
  ag.ported = true;
  game.fame = Math.min(100, game.fame + 5);
  if (hallOfFame) game.hallOfFame.push({ ...studio.completed });
  game.lastReport = `アーケード「${ag.name}」を家庭用に移植しました（知名度 +5）`;
}

export function startDev(name: string, genre: string, content: string, hardwareId: string, studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio) return;
  if (studio.dev || studio.completed || studio.contractId) return;
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  const hw = findHardware(hardwareId);
  if (!hw) return;
  studio.dev = {
    name,
    genre,
    content,
    hardwareId,
    stage: '開発',
    progress: 0,
    bug: 0,
    exhibited: false,
    bonus: { fun: 0, creativity: 0, graphics: 0, music: 0 }
  };
  game.lastReport = `「${name}」の開発を開始しました（${studio.name} / ${genre} × ${content} / ${hw.name}）`;
}

export function startSequel(hof: CompletedGame, studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio) return;
  if (studio.dev || studio.completed || studio.contractId) return;
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  studio.dev = {
    name: hof.name + '2',
    genre: hof.genre,
    content: hof.content,
    hardwareId: hof.hardwareId,
    stage: '開発',
    progress: 40,
    bug: 0,
    exhibited: false,
    bonus: {
      fun: hof.fun * 0.4,
      creativity: hof.creativity * 0.4,
      graphics: hof.graphics * 0.4,
      music: hof.music * 0.4
    }
  };
  game.lastReport = `続編「${studio.dev.name}」の開発を開始しました（${studio.name} / 前作の実績を引き継ぎ）`;
}

const EXHIBIT_FEE = 5_000_000;

function performExhibit(studio: Studio): string | null {
  const target = studio.completed ?? studio.dev;
  if (!target || target.exhibited) return null;
  if (game.money < EXHIBIT_FEE) return null;
  game.money -= EXHIBIT_FEE;
  let gain = 3;
  if (studio.completed) gain += Math.round(studio.completed.reviewScore / 8);
  game.fame = Math.min(100, game.fame + gain);
  target.exhibited = true;
  return `「${target.name}」をゲームデックスに出展しました（知名度 +${gain}）`;
}

function performCatalogExhibit(g: CatalogGame): string | null {
  if (g.exhibited) return null;
  if (game.money < EXHIBIT_FEE) return null;
  game.money -= EXHIBIT_FEE;
  const gain = 2 + Math.round(g.reviewScore / 10);
  game.fame = Math.min(100, game.fame + gain);
  g.exhibited = true;
  return `「${g.name}」をゲームデックスに出展しました（知名度 +${gain}）`;
}

export function exhibitStudio(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio) return;
  if (game.money < EXHIBIT_FEE) {
    game.lastReport = `出展費用が足りません（${man(EXHIBIT_FEE)} 必要）`;
    return;
  }
  game.lastReport = performExhibit(studio) ?? '出展できる作品がありません';
}

export function exhibitCatalog(idx: number) {
  const g = game.catalog[idx];
  if (!g) return;
  if (game.money < EXHIBIT_FEE) {
    game.lastReport = `出展費用が足りません（${man(EXHIBIT_FEE)} 必要）`;
    return;
  }
  game.lastReport = performCatalogExhibit(g) ?? '出展できる作品がありません';
}

export function closeDecks() {
  game.event = null;
}

export function setAutoExhibit(v: boolean) {
  game.autoExhibit = v;
  game.lastReport = v
    ? 'ゲームデックス自動出展をオンにしました（9月に開発中の作品を自動出展）'
    : 'ゲームデックス自動出展をオフにしました';
}

export function ship(quantity: number, studioId: number, storeId?: string) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio || !studio.completed) return;
  const q = Math.min(Math.floor(quantity), shipCap());
  const hw = findHardware(studio.completed.hardwareId);
  const store = storeId ? storeCatalog.find((s) => s.id === storeId) : undefined;
  const useDl = !!store && supportsDl(studio.completed.hardwareId);
  const unitProd = useDl ? 0 : productionCost(hw);
  const cost = unitProd * q;
  if (q <= 0) {
    game.lastReport = '出荷本数を入力してください';
    return;
  }
  if (game.money < cost) {
    game.lastReport = `生産費用が足りません（${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  const storeFee = useDl ? Math.round(studio.completed.price * store!.commission) : 0;
  const reachMul = useDl ? (store!.reachMul ?? 1) : 1;
  game.sales.push({
    studioName: studio.name,
    game: {
      ...studio.completed,
      weeksOnSale: 0,
      expectedSales: Math.round(studio.completed.expectedSales * reachMul),
      storeFee
    },
    inventory: q,
    currentSold: 0
  });
  studio.completed = null;
  const channel = useDl ? ` / ${store!.name}（DL）` : '';
  game.lastReport = `${q.toLocaleString()}本 出荷しました（生産費 ${man(cost)}${channel}）`;
}

// カタログ作品の再出荷
export function restock(idx: number, quantity: number) {
  const g = game.catalog[idx];
  if (!g) return;
  const q = Math.floor(quantity);
  if (q <= 0) return;
  const hw = findHardware(g.hardwareId);
  const cost = productionCost(hw) * q;
  if (game.money < cost) {
    game.lastReport = `生産費用が足りません（${man(cost)} 必要）`;
    return;
  }
  game.money -= cost;
  g.inventory += q;
  game.lastReport = `「${g.name}」を再出荷しました（+${q.toLocaleString()}本 / 生産費 ${man(cost)}）`;
}

// カタログ作品の在庫処分（リサイクルショップがあれば買い取り）
export function disposeCatalog(idx: number) {
  const g = game.catalog[idx];
  if (!g || g.inventory <= 0) return;
  if (hasTenant('recycle')) {
    const refund = g.inventory * 500;
    game.money += refund;
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分（リサイクル回収 +${man(refund)}）`;
  } else {
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分しました`;
  }
  g.inventory = 0;
}

// 受注開発（外注納品）
export function availableContracts(): Contract[] {
  return contractCatalog.filter((c) => c.minFame <= game.fame && !game.doneContracts.includes(c.id));
}

export function acceptContract(id: string) {
  if (game.activeContract) {
    game.lastReport = 'すでに受注案件を抱えています';
    return;
  }
  const c = contractCatalog.find((x) => x.id === id);
  if (!c) return;
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  const studio = freeStudio();
  if (!studio) {
    game.lastReport = '空いているスタジオがありません';
    return;
  }
  studio.contractId = c.id;
  game.activeContract = { id: c.id, name: c.name, reward: c.reward, deadline: c.deadline, target: c.target, progress: 0, elapsed: 0, studioId: studio.id };
  game.lastReport = `受注案件「${c.name}」を受注しました（${studio.name}で開発 / 報酬 ${man(c.reward)} / 納期 ${c.deadline}週）`;
}

export function cancelContract() {
  if (!game.activeContract) return;
  const studio = game.studios.find((s) => s.id === game.activeContract!.studioId);
  if (studio) studio.contractId = null;
  game.activeContract = null;
  game.lastReport = '受注案件をキャンセルしました';
}

export function finishGame(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio || !studio.dev || studio.dev.stage !== 'バグ取り') return;
  completeDev(studio);
}

function completeDev(studio: Studio) {
  const d = studio.dev!;
  const hw = findHardware(d.hardwareId)!;
  const power = hardwarePower(d.hardwareId);
  const cap = power * 10;
  const n = game.employees.length || 1;

  const avg = (key: 'fun' | 'creativity' | 'graphics' | 'music') =>
    game.employees.reduce((s, e) => s + e[key], 0) / n;
  const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  const fun = clamp100(avg('fun') * 1.2 + d.bonus.fun);
  const creativity = clamp100(avg('creativity') * 1.2 + d.bonus.creativity);
  const graphics = Math.min(cap, clamp100(avg('graphics') * 1.2 + d.bonus.graphics));
  const music = Math.min(cap, clamp100(avg('music') * 1.2 + d.bonus.music));
  const bug = Math.max(0, Math.min(30, Math.round(d.bug)));

  const rawScore = 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music;
  const score = Math.max(0, rawScore - bug * 0.8);

  const mark = compatMark(d.genre, d.content);
  const reviewScore = Math.max(0, Math.min(40, Math.round((score / 100) * 40 + (COMPAT_REVIEW[mark] ?? 0))));
  const hallOfFame = reviewScore >= HALL_OF_FAME_SCORE;

  const quality = 0.5 + score / 100;
  const compat = compatCoeff(d.genre, d.content);
  const m = month();
  const season = m === 7 || m === 12 ? 1.3 : 1.0;
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * season * marketFactor(hw) * marketGrowth(currentYear());
  const expectedSales = Math.round(effectiveInstallBase(d.hardwareId, currentYear()) * reach);

  studio.completed = {
    name: d.name,
    genre: d.genre,
    content: d.content,
    hardwareId: d.hardwareId,
    fun,
    creativity,
    graphics,
    music,
    bug,
    reviewScore,
    hallOfFame,
    expectedSales,
    price: 5800,
    licenseFee: Math.round((hw.licenseFee ?? 0) * licenseFeeMultiplier()),
    storeFee: 0,
    weeksOnSale: 0,
    exhibited: d.exhibited
  };
  studio.dev = null;

  if (hallOfFame) game.hallOfFame.push({ ...studio.completed });
  game.yearGames.push({ name: studio.completed.name, reviewScore, graphics, music });
}

function holdContest(): string | null {
  const entries = game.yearGames;
  game.yearGames = [];
  if (entries.length === 0) return null;

  const best = entries.reduce((a, b) => (a.reviewScore >= b.reviewScore ? a : b));
  const worst = entries.reduce((a, b) => (a.reviewScore <= b.reviewScore ? a : b));
  const gfx = entries.reduce((a, b) => (a.graphics >= b.graphics ? a : b));
  const mus = entries.reduce((a, b) => (a.music >= b.music ? a : b));

  const msgs: string[] = [];
  let fame = 0;
  let prize = 0;

  if (best.reviewScore >= 36) {
    fame += 15;
    prize += 50_000_000;
    game.grandPrix += 1;
    msgs.push(`全日本ゲームコンテスト: 「${best.name}」がグランプリ受賞！`);
  } else if (best.reviewScore >= 30) {
    fame += 8;
    prize += 20_000_000;
    msgs.push(`全日本ゲームコンテスト: 「${best.name}」が準グランプリ受賞！`);
  } else {
    msgs.push('全日本ゲームコンテスト: 受賞なし');
  }

  if (gfx.graphics >= 70 && gfx !== best) {
    fame += 5;
    prize += 5_000_000;
    msgs.push(`「${gfx.name}」がデザイン賞受賞！`);
  }
  if (mus.music >= 70 && mus !== best) {
    fame += 5;
    prize += 5_000_000;
    msgs.push(`「${mus.name}」が音楽賞受賞！`);
  }
  if (worst.reviewScore < 10) {
    fame += 2;
    msgs.push(`「${worst.name}」がクソゲー賞受賞…`);
  }

  game.fame = Math.min(100, game.fame + fame);
  game.money += prize;
  if (prize > 0) msgs.push(`賞金 +${man(prize)}`);
  return msgs.join(' / ');
}

export function advanceWeek() {
  if (game.gameOver) return;
  game.week += 1;
  const reports: string[] = [];

  for (const studio of game.studios) {
    // 開発進行
    if (studio.dev) {
      const d = studio.dev;
      const speed = game.employees.reduce((s, e) => s + e.speed, 0);
      const leadBonus = studio.leadId ? 1.1 : 1.0;
      if (d.stage === '開発') {
        const devSpeed = (1 + 0.1 * techLevel('fast_dev')) * leadBonus;
        d.progress += (speed / 12) * devSpeed;
        d.bug += Math.random() * 1.5;
        if (d.progress >= devTarget(d.hardwareId)) {
          d.stage = 'バグ取り';
          reports.push(`「${d.name}」の開発が完了しました。バグ取りを開始します（バグ ${Math.floor(d.bug)}）`);
        }
      } else {
        const fixSpeed = 1 + 0.5 * techLevel('bug_analysis');
        d.bug = Math.max(0, d.bug - (speed / 12) * 0.6 * fixSpeed);
        if (d.bug <= 0) {
          completeDev(studio);
          reports.push(`「${studio.completed!.name}」が完成しました！レビュー ${studio.completed!.reviewScore}点`);
        }
      }
    }
  }

  // 発売キャンペーン販売（スタジオから切り離し、販売中も次の開発が可能）
  let weekRevenue = 0;
  let weekSold = 0;
  for (let i = game.sales.length - 1; i >= 0; i--) {
    const sale = game.sales[i];
    sale.game.weeksOnSale += 1;
    const w = sale.game.weeksOnSale;
    const share = SALES_SHARE[w] ?? 0;
    const demand = Math.round(sale.game.expectedSales * share);
    const sold = Math.min(sale.inventory, demand);
    if (sold > 0) {
      const revenue = sold * (sale.game.price - sale.game.licenseFee - sale.game.storeFee);
      game.money += revenue;
      sale.inventory -= sold;
      game.totalSales += sold;
      sale.currentSold += sold;
      weekRevenue += revenue;
      weekSold += sold;
      reports.push(`「${sale.game.name}」を ${sold.toLocaleString()}本 販売（+${man(revenue)}）`);
    }
    if (w >= 6 || sale.inventory === 0) {
      // 発売キャンペーン終了 → カタログへ移行（ロングテール販売・再出荷可能に）
      game.catalog.push({
        name: sale.game.name,
        genre: sale.game.genre,
        content: sale.game.content,
        hardwareId: sale.game.hardwareId,
        reviewScore: sale.game.reviewScore,
        hallOfFame: sale.game.hallOfFame,
        expectedSales: sale.game.expectedSales,
        price: sale.game.price,
        licenseFee: sale.game.licenseFee,
        inventory: sale.inventory,
        soldTotal: sale.currentSold,
        storeFee: sale.game.storeFee,
        exhibited: sale.game.exhibited
      });
      game.sales.splice(i, 1);
    }
  }

  // カタログ（ロングテール）販売
  {
    let tailSold = 0;
    let tailRevenue = 0;
    for (const g of game.catalog) {
      const cap = Math.round(g.expectedSales * LONG_TAIL_CAP);
      if (g.soldTotal >= cap || g.inventory <= 0) continue;
      let demand = Math.round(g.expectedSales * LONG_TAIL_RATE);
      // 話題スパイク（たまに再燃して売れる）
      if (Math.random() < 0.01) {
        const spike = Math.round(g.expectedSales * 0.05);
        demand += spike;
        reports.push(`「${g.name}」が再び話題になっています！（+${spike.toLocaleString()}本の需要）`);
      }
      demand = Math.min(demand, cap - g.soldTotal);
      const sold = Math.min(g.inventory, demand);
      if (sold > 0) {
        g.inventory -= sold;
        g.soldTotal += sold;
        game.totalSales += sold;
        tailSold += sold;
        tailRevenue += sold * (g.price - g.licenseFee - g.storeFee);
      }
    }
    if (tailSold > 0) {
      game.money += tailRevenue;
      weekRevenue += tailRevenue;
      weekSold += tailSold;
      reports.push(`ロングテール販売 ${tailSold.toLocaleString()}本（+${man(tailRevenue)}）`);
    }
  }

  // 週次売上履歴を記録（グラフ用）
  game.salesHistory.push({ week: game.week, revenue: weekRevenue, sold: weekSold });
  if (game.salesHistory.length > 400) game.salesHistory.shift();

  // 受注開発の進行
  if (game.activeContract) {
    const c = game.activeContract;
    const studio = game.studios.find((s) => s.id === c.studioId);
    const speed = game.employees.reduce((s, e) => s + e.speed, 0);
    const leadBonus = studio?.leadId ? 1.1 : 1.0;
    c.progress += (speed / 10) * leadBonus;
    c.elapsed += 1;
    if (c.progress >= c.target) {
      const onTime = c.elapsed <= c.deadline;
      const pay = onTime ? c.reward : Math.round(c.reward * 0.6);
      game.money += pay;
      game.doneContracts.push(c.id);
      if (studio) studio.contractId = null;
      reports.push(`受注案件「${c.name}」を納品しました（報酬 ${man(pay)}${onTime ? '' : '・納期遅れで減額'}）`);
      game.activeContract = null;
    }
  }

  // 自社ハード開発の進行
  if (game.hwProject) {
    game.hwProject.progress += 1;
    if (game.hwProject.progress >= game.hwProject.target) {
      reports.push(completeHardware());
    }
  }

  // 自社ハードのライセンス収益・ネットワーク維持費
  for (const oh of game.ownHardware) {
    const ib = effectiveInstallBase(oh.id, currentYear());
    const income = Math.round(ib * 3);
    const net = income - oh.networkCost;
    if (net !== 0) {
      game.money += net;
      reports.push(`自社ハード「${oh.name}」${net >= 0 ? '収益' : '維持費'} ${net >= 0 ? '+' : ''}${man(net)}`);
    }
  }

  // アーケード開発の進行
  if (game.arcadeProject) {
    const p = game.arcadeProject;
    const speed = game.employees.reduce((s, e) => s + e.speed, 0);
    if (p.stage === '開発') {
      p.progress += speed / 12;
      p.bug += Math.random() * 1.5;
      if (p.progress >= ARCADE_DEV_TARGET) {
        p.stage = 'バグ取り';
        reports.push(`アーケード「${p.name}」の開発が完了しました。バグ取りをして完成させましょう（バグ ${Math.floor(p.bug)}）`);
      }
    } else {
      p.bug = Math.max(0, p.bug - (speed / 12) * 0.6 * (1 + 0.5 * techLevel('bug_analysis')));
    }
  }

  // アーケード稼働収益（インカム）
  for (const ag of game.arcadeGames) {
    if (ag.weeksLeft > 0) {
      const income = ag.opeRate * ARCADE_INCOME;
      game.money += income;
      ag.weeksLeft -= 1;
      reports.push(`アーケード「${ag.name}」インカム +${man(income)}`);
    }
  }

  // 年俸支払い（毎年4月、1回だけ）
  if (month() === 4 && game.salaryYear !== year()) {
    game.salaryYear = year();
    const totalSalary = game.employees.reduce((s, e) => s + e.salary, 0);
    if (totalSalary > 0) {
      game.money -= totalSalary;
      reports.push(`4月の年俸支払い ${man(totalSalary)}`);
    }
  }

  // ランダムイベント: 雑誌取材
  if (Math.random() < 0.06 && game.fame < 100) {
    game.fame = Math.min(100, game.fame + 2);
    reports.push('雑誌社から取材が来ました（知名度 +2）');
  }

  // ランダムイベント: ファンレター
  if (Math.random() < 0.05 && game.fame >= 5 && game.catalog.length > 0) {
    game.fame = Math.min(100, game.fame + 1);
    reports.push('ファンからファンレターが届きました（知名度 +1）');
  }

  // 自社が買収されそうになる危機（資金・知名度が低いと発生。序盤3年は猶予）
  if (!game.gameOver && year() >= 3 && game.money < 100_000_000 && game.fame < 30 && Math.random() < 0.02) {
    const defense = 30_000_000;
    game.money -= defense;
    reports.push(`大手企業が当社の買収を仕掛けてきました！防衛に奔走（防衛費 ${man(defense)}）`);
  }

  // 年1回のゲームデックス（9月）
  if (month() === 9 && game.exhibitYear !== year()) {
    game.exhibitYear = year();
    const hasCandidate =
      game.studios.some((s) => (s.dev && !s.dev.exhibited) || (s.completed && !s.completed.exhibited)) ||
      game.catalog.some((g) => !g.exhibited);
    if (game.autoExhibit) {
      const msgs: string[] = [];
      for (const s of game.studios) {
        if (!s.dev) continue; // 開発中の作品のみ自動出展
        const m = performExhibit(s);
        if (m) msgs.push(m);
      }
      if (msgs.length > 0) reports.push('ゲームデックス（9月）: ' + msgs.join(' / '));
    } else if (hasCandidate) {
      game.event = { type: 'decks' };
    }
  }

  // 年1回のコンテスト（12月）
  if (month() === 12 && game.contestYear !== year()) {
    game.contestYear = year();
    const result = holdContest();
    if (result) reports.push(result);
  }

  if (game.money < 0) {
    game.gameOver = true;
    reports.push('資金が尽きました。破産です（ゲームオーバー）');
  }

  game.lastReport = reports.length > 0 ? reports.join(' / ') : '（特に動きはありません）';
  saveGame();
}

function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}-${slot}`;
}

export function saveSlots(): number {
  return SAVE_SLOTS;
}

export function currentSlot(): number {
  return game.saveSlot;
}

export function saveGame(slot?: number) {
  if (typeof localStorage === 'undefined') return;
  const s = slot ?? game.saveSlot;
  game.saveSlot = s;
  localStorage.setItem(slotKey(s), JSON.stringify($state.snapshot(game)));
}

export function loadGame(slot?: number): boolean {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return false;
    const s = slot ?? game.saveSlot;
    let raw = localStorage.getItem(slotKey(s));
    if (!raw && s === 0) raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return false;
    Object.assign(game, JSON.parse(raw));
    game.saveSlot = s;
    if (Array.isArray(game.techs)) game.techs = {};
    if (!Array.isArray(game.studios) || game.studios.length === 0) game.studios = initialStudios();
    if (!Array.isArray(game.sales)) game.sales = [];
    if (!Array.isArray(game.salesHistory)) game.salesHistory = [];
    // 旧セーブ移行: studio.onSale → game.sales
    for (const st of game.studios as unknown as Record<string, unknown>[]) {
      if (st.contractId === undefined) st.contractId = null;
      if (st.completed && (st.completed as CompletedGame).storeFee === undefined) (st.completed as CompletedGame).storeFee = 0;
      if (st.onSale) {
        game.sales.push({
          studioName: st.name as string,
          game: st.onSale as CompletedGame,
          inventory: (st.inventory as number) ?? 0,
          currentSold: (st.currentSold as number) ?? 0
        });
        delete st.onSale;
        delete st.inventory;
        delete st.currentSold;
      }
    }
    for (const g of game.catalog) {
      if (g.exhibited === undefined) g.exhibited = false;
      if (g.storeFee === undefined) g.storeFee = 0;
    }
    if (game.event === undefined) game.event = null;
    if (game.autoExhibit === undefined) game.autoExhibit = false;
    if (game.exhibitYear === undefined) game.exhibitYear = 0;
    return true;
  } catch {
    return false;
  }
}

export function peekSlot(slot: number): string {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return '空き';
    const raw = localStorage.getItem(slotKey(slot)) ?? (slot === 0 ? localStorage.getItem(LEGACY_SAVE_KEY) : null);
    if (!raw) return '空き';
    const d = JSON.parse(raw);
    const w = d.week ?? 1;
    const y = START_YEAR + Math.floor((w - 1) / WEEKS_PER_YEAR);
    const m = Math.floor(((w - 1) % WEEKS_PER_YEAR) / 4) + 1;
    return `${y}年${m}月 / 資金 ${man(Number(d.money ?? 0))} / 知名度 ${d.fame ?? 0}`;
  } catch {
    return '空き';
  }
}

export function resetGame() {
  Object.assign(game, structuredClone(initialState));
  game.studios = initialStudios();
}

loadGame(0);
