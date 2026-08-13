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

export const START_YEAR = 1983;
export const WEEKS_PER_YEAR = 48;
const DEV_TARGET = 200;
const PEAK_YEARS = 5;
const SALES_SHARE = [0, 0.35, 0.25, 0.15, 0.1, 0.08, 0.07];
const COMPAT: Record<string, number> = { '☆': 1.5, '◎': 1.2, '◯': 1.0, '◇': 0.85, '△': 0.7, '✕': 0.5 };
const COMPAT_REVIEW: Record<string, number> = { '☆': 4, '◎': 2, '◯': 1, '◇': 0, '△': -2, '✕': -4 };
const HALL_OF_FAME_SCORE = 32;
const SAVE_KEY = 'gamedev-sim-save';
const MAX_TENANTS = 3;
const MAX_STUDIOS = 5;
const SHIP_CAP_BASE = 500_000;
const SHIP_CAP_FACTORY = 2_000_000;
const STUDIO_COST = 300_000_000;
const ACQUIRE_COST = 800_000_000;

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
  return hardware.hardware.find((h) => h.id === id);
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

const initialState = {
  money: 100_000_000,
  week: 1,
  employees: [] as Employee[],
  fame: 0,
  tenants: [] as string[],
  techs: {} as Record<string, number>,
  yearGames: [] as { name: string; reviewScore: number; graphics: number; music: number }[],
  contestYear: 0,
  grandPrix: 0,
  releasedGames: [] as { name: string; sold: number; reviewScore: number; year: number }[],
  totalSales: 0,
  lastReport: 'ようこそ！社員を雇用してゲーム開発を始めましょう。' as string,
  gameOver: false,
  salaryYear: 0,
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

// 他社買収（子会社として運用、責任者不要・知名度アップ）
export function acquireCompany() {
  if (game.studios.length >= MAX_STUDIOS) {
    game.lastReport = `スタジオは最大${MAX_STUDIOS}つまでです`;
    return;
  }
  if (game.money < ACQUIRE_COST) {
    game.lastReport = `買収資金が足りません（${ACQUIRE_COST.toLocaleString()}円 必要）`;
    return;
  }
  game.money -= ACQUIRE_COST;
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
  game.lastReport = '他社を買収し、子会社として運用します（知名度 +10）';
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
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * season;
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
        if (studio.inventory > 0) {
          if (hasTenant('recycle')) {
            const refund = studio.inventory * 500;
            game.money += refund;
            reports.push(`「${studio.onSale.name}」の売れ残り ${studio.inventory.toLocaleString()}本をリサイクル回収（+${refund.toLocaleString()}円）`);
          } else {
            reports.push(`「${studio.onSale.name}」の売れ残り ${studio.inventory.toLocaleString()}本を処分`);
          }
        }
        game.releasedGames.push({
          name: studio.onSale.name,
          sold: studio.currentSold,
          reviewScore: studio.onSale.reviewScore,
          year: currentYear()
        });
        studio.inventory = 0;
        studio.onSale = null;
        studio.currentSold = 0;
      }
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
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
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
