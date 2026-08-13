import { hardware, kumiawase } from './data';
import employeesData from '../../data/employees.json';
import tenantsData from '../../data/tenants.json';

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
  reviewScore: number; // 0〜40（クロスレビュー）
  hallOfFame: boolean; // 32点以上で殿堂入り
  expectedSales: number;
  price: number;
  licenseFee: number;
  weeksOnSale: number;
  exhibited: boolean;
}

export const START_YEAR = 1983;
export const WEEKS_PER_YEAR = 48; // 1年=48週（12ヶ月×4週）
const DEV_TARGET = 200; // 開発進捗の目標（高め＝1本の開発に時間がかかる）
const PEAK_YEARS = 5; // ハード普及台数が寿命台数に達するまでの年数
// 販売開始からの週ごとの売上シェア（§10.5 減衰カーブ）
const SALES_SHARE = [0, 0.35, 0.25, 0.15, 0.1, 0.08, 0.07];
const COMPAT: Record<string, number> = { '☆': 1.5, '◎': 1.2, '◯': 1.0, '◇': 0.85, '△': 0.7, '✕': 0.5 };
// レビュー点への相性ボーナス
const COMPAT_REVIEW: Record<string, number> = { '☆': 4, '◎': 2, '◯': 1, '◇': 0, '△': -2, '✕': -4 };
const HALL_OF_FAME_SCORE = 32;
const SAVE_KEY = 'gamedev-sim-save';
const MAX_TENANTS = 3;
const SHIP_CAP_BASE = 500_000;
const SHIP_CAP_FACTORY = 2_000_000;

export const employeePool: Employee[] = employeesData.employees;

export interface Tenant {
  id: string;
  name: string;
  effect: string;
  cost: number;
}
export const tenantCatalog: Tenant[] = tenantsData.tenants;

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
  if (media.includes('カセット')) return 1000;
  return 300;
}

// その年のハード普及台数（発売から時間とともに寿命台数へ成長していく）
export function effectiveInstallBase(id: string, year: number): number {
  const hw = findHardware(id);
  if (!hw || hw.installBase == null) return 0;
  const age = year - hw.releaseYear;
  const factor = Math.min(1, (age + 1) / PEAK_YEARS);
  return Math.round(hw.installBase * factor);
}

// 知名度係数（§10.4）: 知名度 0〜100 → 売上 1.0〜1.5 倍
function fameCoeff(fame: number): number {
  return 1 + (fame / 100) * 0.5;
}

const initialState = {
  money: 100_000_000,
  week: 1,
  employees: [] as Employee[],
  dev: null as DevProject | null,
  completed: null as CompletedGame | null, // 完成済み・出荷待ち
  inventory: 0,
  onSale: null as CompletedGame | null, // 販売中のゲーム
  hallOfFame: [] as CompletedGame[],
  totalSales: 0, // 累計販売本数
  fame: 0, // 知名度 0〜100
  tenants: [] as string[],
  yearGames: [] as { name: string; reviewScore: number; graphics: number; music: number }[],
  contestYear: 0,
  lastReport: 'ようこそ！社員を雇用してゲーム開発を始めましょう。' as string,
  gameOver: false,
  salaryYear: 0,
};

export const game = $state({ ...initialState });

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
}

export function startDev(name: string, genre: string, content: string, hardwareId: string) {
  if (game.dev || game.completed) return;
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  const hw = findHardware(hardwareId);
  if (!hw) return;
  game.dev = {
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
  game.lastReport = `「${name}」の開発を開始しました（${genre} × ${content} / ${hw.name}）`;
}

// 殿堂入り作品の続編開発（前作パラメータの一部を引き継ぐ）
export function startSequel(hof: CompletedGame) {
  if (game.dev || game.completed) return;
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください';
    return;
  }
  game.dev = {
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
  game.lastReport = `続編「${game.dev.name}」の開発を開始しました（前作の実績を引き継ぎ）`;
}

// ゲームデックス出展（知名度アップ）
export function exhibitGame() {
  const target = game.completed ?? game.dev;
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
  if (game.completed) gain += Math.round(game.completed.reviewScore / 8);
  game.fame = Math.min(100, game.fame + gain);
  target.exhibited = true;
  game.lastReport = `ゲームデックスに出展しました（知名度 +${gain}、現在 ${game.fame}）`;
}

export function ship(quantity: number) {
  if (!game.completed) return;
  const q = Math.min(Math.floor(quantity), shipCap());
  const hw = findHardware(game.completed.hardwareId);
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
  game.inventory = q;
  game.onSale = { ...game.completed, weeksOnSale: 0 };
  game.completed = null;
  game.lastReport = `${q.toLocaleString()}本 出荷しました（生産費 ${cost.toLocaleString()}円）`;
}

// バグ取りを終えて完成させる（バグ取りステージでのみ実行）
export function finishGame() {
  if (!game.dev || game.dev.stage !== 'バグ取り') return;
  completeDev();
}

function completeDev() {
  const d = game.dev!;
  const hw = findHardware(d.hardwareId)!;
  const power = hw.params?.power ?? 5;
  const cap = power * 10;
  const n = game.employees.length || 1;

  // チーム平均 × 1.2 でパラメータ決定（能力は開発時間に依存しない）
  const avg = (key: 'fun' | 'creativity' | 'graphics' | 'music') =>
    game.employees.reduce((s, e) => s + e[key], 0) / n;
  const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  const fun = clamp100(avg('fun') * 1.2 + d.bonus.fun);
  const creativity = clamp100(avg('creativity') * 1.2 + d.bonus.creativity);
  const graphics = Math.min(cap, clamp100(avg('graphics') * 1.2 + d.bonus.graphics));
  const music = Math.min(cap, clamp100(avg('music') * 1.2 + d.bonus.music));
  const bug = Math.max(0, Math.min(30, Math.round(d.bug)));

  // 品質スコア（0〜100）: おもしろさ・独創性 重視
  const rawScore = 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music;
  const score = Math.max(0, rawScore - bug * 0.8);

  // レビュー点（0〜40）
  const mark = compatMark(d.genre, d.content);
  const reviewScore = Math.max(0, Math.min(40, Math.round((score / 100) * 40 + (COMPAT_REVIEW[mark] ?? 0))));
  const hallOfFame = reviewScore >= HALL_OF_FAME_SCORE;

  // 売上期待値（§10）: その年の普及台数 × 到達率（知名度係数を含む）
  const quality = 0.5 + score / 100;
  const compat = compatCoeff(d.genre, d.content);
  const m = month();
  const season = m === 7 || m === 12 ? 1.3 : 1.0;
  const reach = 0.08 * quality * compat * fameCoeff(game.fame) * season;
  const expectedSales = Math.round(effectiveInstallBase(d.hardwareId, currentYear()) * reach);

  game.completed = {
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
  game.dev = null;

  if (hallOfFame) game.hallOfFame.push({ ...game.completed });
  game.yearGames.push({ name: game.completed.name, reviewScore, graphics, music });
}

// 全日本ゲームコンテスト（年1回、12月開催）
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

  // 開発進行
  if (game.dev) {
    const d = game.dev;
    const speed = game.employees.reduce((s, e) => s + e.speed, 0);
    if (d.stage === '開発') {
      d.progress += speed / 12;
      d.bug += Math.random() * 1.5;
      if (d.progress >= DEV_TARGET) {
        d.stage = 'バグ取り';
        reports.push(`「${d.name}」の開発が完了しました。バグ取りをして完成させましょう（バグ ${Math.floor(d.bug)}）`);
      }
    } else {
      d.bug = Math.max(0, d.bug - (speed / 12) * 0.6);
    }
  }

  // 販売
  if (game.onSale && game.inventory > 0) {
    game.onSale.weeksOnSale += 1;
    const w = game.onSale.weeksOnSale;
    const share = SALES_SHARE[w] ?? 0;
    const demand = Math.round(game.onSale.expectedSales * share);
    const sold = Math.min(game.inventory, demand);
    if (sold > 0) {
      const revenue = sold * (game.onSale.price - game.onSale.licenseFee);
      game.money += revenue;
      game.inventory -= sold;
      game.totalSales += sold;
      reports.push(`「${game.onSale.name}」を ${sold.toLocaleString()}本 販売（+${revenue.toLocaleString()}円）`);
    }
    if (w >= 6 || game.inventory === 0) {
      if (game.inventory > 0) {
        if (hasTenant('recycle')) {
          const refund = game.inventory * 500;
          game.money += refund;
          reports.push(`「${game.onSale.name}」の売れ残り ${game.inventory.toLocaleString()}本をリサイクル回収（+${refund.toLocaleString()}円）`);
        } else {
          reports.push(`「${game.onSale.name}」の売れ残り ${game.inventory.toLocaleString()}本を処分`);
        }
      }
      game.inventory = 0;
      game.onSale = null;
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

  // ランダムイベント: 雑誌取材（知名度アップ）
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
    return true;
  } catch {
    return false;
  }
}

export function resetGame() {
  Object.assign(game, structuredClone(initialState));
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
}

loadGame();
