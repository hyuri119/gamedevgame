import { describe, it, expect, beforeAll, vi } from 'vitest';

// Nodeの不完全なlocalStorageをスタブ（セーブは検証対象外）
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
});

import {
  game,
  resetGame,
  hire,
  startDev,
  finishGame,
  ship,
  restock,
  startDlc,
  advanceWeek,
  currentYear,
  month,
  availableStores,
  supportsDl,
  loadGame,
  man
} from '../src/lib/game.svelte';
import { kumiawase, availableGenres } from '../src/lib/data';

// 乱数を固定シードのLCGに差し替えて再現性を持たせる
let seed = 42;
function lcg(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
beforeAll(() => {
  vi.spyOn(Math, 'random').mockImplementation(lcg);
});

function reset(s = 42) {
  resetGame();
  seed = s;
}

// 解放中のジャンル×内容から相性が最も良い組み合わせを探す（プレイヤーの最適行動相当）
function bestCombo(year: number): { genre: string; content: string; mark: string } {
  const order = ['☆', '◎', '◯', '◇', '△', '✕'];
  let best = { genre: '', content: '', mark: '✕' };
  for (const genre of availableGenres(year)) {
    for (const content of kumiawase.contents) {
      const mark = kumiawase.matrix.get(content)?.get(genre);
      if (!mark) continue;
      if (order.indexOf(mark) < order.indexOf(best.mark)) best = { genre, content, mark };
    }
  }
  return best;
}

function weeksUntil(pred: () => boolean, maxWeeks: number): number {
  for (let i = 0; i < maxWeeks; i++) {
    advanceWeek();
    if (pred()) return i + 1;
  }
  return -1;
}

describe('バランスシミュレーション', () => {
  it('旧形式セーブ（バージョンなし）を読み込める', () => {
    reset();
    const legacy = JSON.stringify({
      money: 123_456_789,
      week: 30,
      fame: 5,
      studios: [
        { id: 1, name: '本社', leadId: null, dev: null, completed: null, contractId: null, dlc: null }
      ],
      employees: [],
      techs: {},
      sales: [],
      salesHistory: [],
      catalog: [],
      saveSlot: 0
    });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k === 'gamedev-sim-save-0' ? legacy : null),
      setItem: () => {},
      removeItem: () => {}
    });
    expect(loadGame(0)).toBe(true);
    expect(game.money).toBe(123_456_789);
    expect(game.week).toBe(30);
    expect(game.studios.length).toBe(1);
  });

  it('序盤（1983〜）PC開発で黒字化でき10年破綻しない', () => {
    reset();
    const initialMoney = game.money;
    // 初期社員2人（1983年解禁の中で速い組合せ）
    hire('tanaka');
    hire('sato');
    expect(game.employees.length).toBe(2);

    const moneyLog: string[] = [];
    let lastLoggedYear = 0;
    let devCount = 0;

    for (let w = 0; w < 48 * 10; w++) {
      // 開発可能なら次を開発（完成品がある場合は出荷してから）
      const freeStudio = game.studios.find((s) => !s.dev && !s.completed && !s.contractId && !s.dlc);
      if (freeStudio && game.employees.length > 0) {
        const c = bestCombo(currentYear());
        startDev(`テスト作品${++devCount}`, c.genre, c.content, 'pc', freeStudio.id);
      }
      const ready = game.studios.find((s) => s.completed);
      if (ready?.completed) {
        const q = Math.min(Math.floor(ready.completed.expectedSales * 0.9), 500_000);
        ship(q, ready.id);
      }
      advanceWeek();
      if (game.gameOver) break;
      const y = currentYear();
      if (y !== lastLoggedYear) {
        lastLoggedYear = y;
        moneyLog.push(`${y}: 資金 ${man(game.money)} / 累計 ${game.totalSales.toLocaleString()}本`);
      }
    }
    console.log('--- 序盤10年の推移 ---\n' + moneyLog.join('\n'));
    expect(game.gameOver).toBe(false);
    expect(game.totalSales).toBeGreaterThan(0);
    // 最終的に資金が初期値を上回っている（黒字化できている）
    expect(game.money).toBeGreaterThan(initialMoney);
  });

  it('DLC解禁後（1996〜）DLC制作→販売→本編再燃が動く', () => {
    reset();
    game.week = (1996 - 1983) * 48 + 1; // 1996年4月から
    // 大所帯にして即開発できる状態を作る（メカニズム検証が目的なので資金は潤沢に）
    for (const e of ['tanaka', 'sato', 'suzuki', 'yamada']) hire(e);
    expect(game.employees.length).toBe(4);
    game.money = 500_000_000;

    // 1本作って出荷 → カタログ入りまで進める
    const st = game.studios[0];
    const c = bestCombo(currentYear());
    startDev('ベース作品', c.genre, c.content, 'pc', st.id);
    weeksUntil(() => !!game.studios[0].completed, 200);
    const completed = game.studios[0].completed!;
    expect(completed.expectedSales).toBeGreaterThan(0);
    ship(Math.min(Math.floor(completed.expectedSales), 500_000), 1, availableStores('pc')[0]?.id);
    weeksUntil(() => game.catalog.length > 0, 20);
    expect(game.catalog.length).toBe(1);
    const base = game.catalog[0];

    // DLC制作（DL対応ハード＋ストア解禁済み）
    expect(supportsDl(base.hardwareId)).toBe(true);
    expect(availableStores('pc').length).toBeGreaterThan(0);
    const beforeSold = base.soldTotal;
    startDlc(0, 1);
    expect(game.studios.some((s) => s.dlc)).toBe(true);

    // DLC完成まで進行
    const done = weeksUntil(() => (base.dlcs?.length ?? 0) > 0, 100);
    console.log(
      `--- DLC検証 --- 完成まで${done}週 / レビュー ${base.dlcs![0].reviewScore}点 / ブースト残り${base.boostWeeks}週`
    );
    expect(done).toBeGreaterThan(0);
    expect(base.boostWeeks).toBeGreaterThan(0);
    expect(base.dlcCapBonus).toBeGreaterThan(0);

    // DLC販売期間（6週）とブースト期間が回る
    const soldBeforeBoost = base.soldTotal;
    weeksUntil(() => (base.boostWeeks ?? 0) <= 0, 30);
    const dlcTotal = base.dlcs![0].soldTotal;
    console.log(
      `--- DLC販売 --- DLC累計 ${dlcTotal.toLocaleString()}本 / 本編ブースト中売上 +${(base.soldTotal - soldBeforeBoost).toLocaleString()}本`
    );
    expect(dlcTotal).toBeGreaterThan(0);
    expect(game.money).toBeGreaterThan(0);
  });

  it('長期（40年）プレイで破綻しない', { timeout: 60_000 }, () => {
    reset();
    hire('tanaka');
    hire('sato');
    let devCount = 0;
    for (let w = 0; w < 48 * 40; w++) {
      const freeStudio = game.studios.find((s) => !s.dev && !s.completed && !s.contractId && !s.dlc);
      if (freeStudio && game.employees.length > 0) {
        const c = bestCombo(currentYear());
        startDev(`作品${++devCount}`, c.genre, c.content, 'pc', freeStudio.id);
      }
      const ready = game.studios.find((s) => s.completed);
      if (ready?.completed) {
        const store = availableStores(ready.completed.hardwareId).at(-1);
        const q = Math.min(Math.floor(ready.completed.expectedSales * 0.9), 500_000);
        ship(q, ready.id, store?.id);
      }
      // カタログ作品でDLCが出せるなら作る（空きスタジオがあるとき）
      if (freeStudio && game.catalog.length > 0 && currentYear() >= 1996) {
        const idx = game.catalog.findIndex((g) => !g.dlcs || g.dlcs.length < 3);
        if (idx >= 0) startDlc(idx, freeStudio.id);
      }
      advanceWeek();
      if (game.gameOver) break;
    }
    console.log(
      `--- 40年後 --- ${currentYear()}年 / 資金 ${man(game.money)} / 累計販売 ${game.totalSales.toLocaleString()}本 / 作品数 ${devCount} / DLC ${(game.catalog.reduce((n, g) => n + (g.dlcs?.length ?? 0), 0))}本`
    );
    expect(game.gameOver).toBe(false);
  });
});
