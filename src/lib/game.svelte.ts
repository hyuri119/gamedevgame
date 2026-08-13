import { hardware, kumiawase } from './data';
import employeesData from '../../data/employees.json';
import tenantsData from '../../data/tenants.json';
import technologiesData from '../../data/technologies.json';
import rolesData from '../../data/roles.json';

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
  weeksOnSale: number;
  exhibited: boolean;
}

export interface Studio {
  id: number;
  name: string;
  leadId: string | null;
  dev: DevProject | null;
  completed: CompletedGame | null;
  inventory: number;
  onSale: CompletedGame | null;
  currentSold: number;
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
  inventory: number;
  soldTotal: number;
}

export const START_YEAR = 1983;
export const WEEKS_PER_YEAR = 48;
const DEV_TARGET = 200;
const PEAK_YEARS = 5;
const SALES_SHARE = [0, 0.35, 0.25, 0.15, 0.1, 0.08, 0.07];
const LONG_TAIL_RATE = 0.005; // ロングテール週間販売率（期待売上の0.5%/週）
const LONG_TAIL_CAP = 1.5; // 累計需要の上限（期待売上の1.5倍）
const COMPAT: Record<string, number> = { '☆': 1.5, '◎': 1.2, '◯': 1.0, '◇': 0.85, '△': 0.7, '✕': 0.5 };
const COMPAT_REVIEW: Record<string, number> = { '☆': 4, '◎': 2, '◯': 1, '◇': 0, '△': -2, '✕': -4 };
const HALL_OF_FAME_SCORE = 32;
const SAVE_KEY = 'gamedev-sim-save';
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

const initialState = {
  money: 100_000_000,
  week: 13, // 4月スタート（1983年4月）
  employees: [] as Employee[],
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
  hallOfFame: [] as CompletedGame[],
  totalSales: 0,
  lastReport: 'ようこそ！社員を雇用してゲーム開発を始めましょう。' as string,
  gameOver: false,
  salaryYear: 1,
};

function initialStudios(): Studio[] {
  return [
    { id: 1, name: '本社', leadId: null, dev: null, completed: null, inventory: 0, onSale: null, currentSold: 0 }
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
    game.lastReport = `建設費用が足りません（${t.name} は ${t.cost.toLocaleString()}円 必要）`;
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
  return Math.round(hw.installBase * 2);
}

export function hasLicense(id: string): boolean {
  if (game.ownHardware.some((h) => h.id === id)) return true;
  return game.licenses.includes(id);
}

export function buyLicense(id: string) {
  if (hasLicense(id)) return;
  const cost = licenseCost(id);
  if (game.money < cost) {
    game.lastReport = `ライセンス取得費が足りません（${hwName(id)} は ${cost.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= cost;
  game.licenses.push(id);
  game.lastReport = `${hwName(id)} のライセンスを取得しました（${cost.toLocaleString()}円）`;
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
    game.lastReport = `研究費用が足りません（${t.name} Lv${lv + 1} は ${cost.toLocaleString()}円 必要）`;
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
    game.lastReport = `進化費用が足りません（${cost.toLocaleString()}円 必要）`;
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
    game.lastReport = `教育費用が足りません（${cost.toLocaleString()}円 必要）`;
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
    game.lastReport = `契約金が足りません（${emp.name} は ${emp.contract.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= emp.contract;
  game.employees.push({ ...emp });
  game.lastReport = `${emp.name}（${emp.role}）を雇用しました（契約金 ${emp.contract.toLocaleString()}円）`;
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
    game.lastReport = `発足費用が足りません（${STUDIO_COST.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= STUDIO_COST;
  game.studios.push({
    id: nextStudioId(),
    name,
    leadId,
    dev: null,
    completed: null,
    inventory: 0,
    onSale: null,
    currentSold: 0
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
    game.lastReport = `交渉費用が足りません（${negotiateFee.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= negotiateFee;
  if (Math.random() < 0.25) {
    game.lastReport = `買収交渉が決裂しました…交渉費用 ${negotiateFee.toLocaleString()}円 を失いました`;
    return;
  }
  if (game.money < buyPrice) {
    game.lastReport = `買収資金が不足したため交渉が白紙に…（交渉費 ${negotiateFee.toLocaleString()}円 を失いました）`;
    return;
  }
  game.money -= buyPrice;
  game.studios.push({
    id: nextStudioId(),
    name: `子会社${game.studios.length}`,
    leadId: null,
    dev: null,
    completed: null,
    inventory: 0,
    onSale: null,
    currentSold: 0
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
    game.lastReport = `開発費が足りません（${cost.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= cost;
  game.hwProject = { name, type, power, progress: 0, target: power * 4, cost };
  game.lastReport = `自社ハード「${name}」の開発を開始しました（性能${power}・開発費${cost.toLocaleString()}円）`;
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
  const hw = findHardware(p.boardId);
  const power = hw?.params?.power ?? 5;
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
  return `アーケード「${p.name}」が完成！ 稼働率 ${opeRate}（週間インカム ${(opeRate * ARCADE_INCOME).toLocaleString()}円）`;
}

// アーケード作品を家庭用に移植（稼働率60以上、知名度上乗せ）
export function portArcade(idx: number) {
  const ag = game.arcadeGames[idx];
  if (!ag || ag.ported) return;
  if (ag.opeRate < 60) {
    game.lastReport = '移植には稼働率60以上が必要です';
    return;
  }
  const studio = game.studios.find((s) => !s.dev && !s.completed && !s.onSale);
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
  const power = hw.params?.power ?? 5;
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
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * marketFactor(hw);
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
  if (studio.dev || studio.completed) return;
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
  if (studio.dev || studio.completed) return;
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

export function exhibitGame(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio) return;
  const target = studio.completed ?? studio.dev;
  if (!target) return;
  if (target.exhibited) {
    game.lastReport = 'この作品はすでに出展済みです';
    return;
  }
  const fee = 5_000_000;
  if (game.money < fee) {
    game.lastReport = `出展費用が足りません（${fee.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= fee;
  let gain = 3;
  if (studio.completed) gain += Math.round(studio.completed.reviewScore / 8);
  game.fame = Math.min(100, game.fame + gain);
  target.exhibited = true;
  game.lastReport = `ゲームデックスに出展しました（知名度 +${gain}、現在 ${game.fame}）`;
}

export function ship(quantity: number, studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio || !studio.completed) return;
  const q = Math.min(Math.floor(quantity), shipCap());
  const hw = findHardware(studio.completed.hardwareId);
  const cost = productionCost(hw) * q;
  if (q <= 0) {
    game.lastReport = '出荷本数を入力してください';
    return;
  }
  if (game.money < cost) {
    game.lastReport = `生産費用が足りません（${cost.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= cost;
  studio.inventory = q;
  studio.currentSold = 0;
  studio.onSale = { ...studio.completed, weeksOnSale: 0 };
  studio.completed = null;
  game.lastReport = `${q.toLocaleString()}本 出荷しました（生産費 ${cost.toLocaleString()}円）`;
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
    game.lastReport = `生産費用が足りません（${cost.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= cost;
  g.inventory += q;
  game.lastReport = `「${g.name}」を再出荷しました（+${q.toLocaleString()}本 / 生産費 ${cost.toLocaleString()}円）`;
}

// カタログ作品の在庫処分（リサイクルショップがあれば買い取り）
export function disposeCatalog(idx: number) {
  const g = game.catalog[idx];
  if (!g || g.inventory <= 0) return;
  if (hasTenant('recycle')) {
    const refund = g.inventory * 500;
    game.money += refund;
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分（リサイクル回収 +${refund.toLocaleString()}円）`;
  } else {
    game.lastReport = `「${g.name}」の在庫 ${g.inventory.toLocaleString()}本 を処分しました`;
  }
  g.inventory = 0;
}

export function finishGame(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId);
  if (!studio || !studio.dev || studio.dev.stage !== 'バグ取り') return;
  completeDev(studio);
}

function completeDev(studio: Studio) {
  const d = studio.dev!;
  const hw = findHardware(d.hardwareId)!;
  const power = hw.params?.power ?? 5;
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
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * season * marketFactor(hw);
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
  if (prize > 0) msgs.push(`賞金 +${prize.toLocaleString()}円`);
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
        if (d.progress >= DEV_TARGET) {
          d.stage = 'バグ取り';
          reports.push(`「${d.name}」の開発が完了しました。バグ取りをして完成させましょう（バグ ${Math.floor(d.bug)}）`);
        }
      } else {
        const fixSpeed = 1 + 0.5 * techLevel('bug_analysis');
        d.bug = Math.max(0, d.bug - (speed / 12) * 0.6 * fixSpeed);
      }
    }

    // 販売
    if (studio.onSale && studio.inventory > 0) {
      studio.onSale.weeksOnSale += 1;
      const w = studio.onSale.weeksOnSale;
      const share = SALES_SHARE[w] ?? 0;
      const demand = Math.round(studio.onSale.expectedSales * share);
      const sold = Math.min(studio.inventory, demand);
      if (sold > 0) {
        const revenue = sold * (studio.onSale.price - studio.onSale.licenseFee);
        game.money += revenue;
        studio.inventory -= sold;
        game.totalSales += sold;
        studio.currentSold += sold;
        reports.push(`「${studio.onSale.name}」を ${sold.toLocaleString()}本 販売（+${revenue.toLocaleString()}円）`);
      }
      if (w >= 6 || studio.inventory === 0) {
        // 発売キャンペーン終了 → カタログへ移行（ロングテール販売・再出荷可能に）
        game.catalog.push({
          name: studio.onSale.name,
          genre: studio.onSale.genre,
          content: studio.onSale.content,
          hardwareId: studio.onSale.hardwareId,
          reviewScore: studio.onSale.reviewScore,
          hallOfFame: studio.onSale.hallOfFame,
          expectedSales: studio.onSale.expectedSales,
          price: studio.onSale.price,
          licenseFee: studio.onSale.licenseFee,
          inventory: studio.inventory,
          soldTotal: studio.currentSold
        });
        studio.inventory = 0;
        studio.onSale = null;
        studio.currentSold = 0;
      }
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
        tailRevenue += sold * (g.price - g.licenseFee);
      }
    }
    if (tailSold > 0) {
      game.money += tailRevenue;
      reports.push(`ロングテール販売 ${tailSold.toLocaleString()}本（+${tailRevenue.toLocaleString()}円）`);
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
      reports.push(`自社ハード「${oh.name}」${net >= 0 ? '収益' : '維持費'} ${net >= 0 ? '+' : ''}${net.toLocaleString()}円`);
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
      reports.push(`アーケード「${ag.name}」インカム +${income.toLocaleString()}円`);
    }
  }

  // 年俸支払い（毎年4月、1回だけ）
  if (month() === 4 && game.salaryYear !== year()) {
    game.salaryYear = year();
    const totalSalary = game.employees.reduce((s, e) => s + e.salary, 0);
    if (totalSalary > 0) {
      game.money -= totalSalary;
      reports.push(`4月の年俸支払い ${totalSalary.toLocaleString()}円`);
    }
  }

  // ランダムイベント: 雑誌取材
  if (Math.random() < 0.06 && game.fame < 100) {
    game.fame = Math.min(100, game.fame + 2);
    reports.push('雑誌社から取材が来ました（知名度 +2）');
  }

  // 自社が買収されそうになる危機（資金・知名度が低いと発生。序盤3年は猶予）
  if (!game.gameOver && year() >= 3 && game.money < 100_000_000 && game.fame < 30 && Math.random() < 0.02) {
    const defense = 30_000_000;
    game.money -= defense;
    reports.push(`大手企業が当社の買収を仕掛けてきました！防衛に奔走（防衛費 ${defense.toLocaleString()}円）`);
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

export function saveGame() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SAVE_KEY, JSON.stringify($state.snapshot(game)));
}

export function loadGame(): boolean {
  try {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return false;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    Object.assign(game, JSON.parse(raw));
    if (Array.isArray(game.techs)) game.techs = {};
    if (!Array.isArray(game.studios) || game.studios.length === 0) game.studios = initialStudios();
    return true;
  } catch {
    return false;
  }
}

export function resetGame() {
  Object.assign(game, structuredClone(initialState));
  game.studios = initialStudios();
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
}

loadGame();
