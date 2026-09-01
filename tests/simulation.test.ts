import { describe, it, expect, beforeAll, vi } from 'vitest'

// Nodeの不完全なlocalStorageをスタブ（セーブは検証対象外）
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

import {
  game,
  resetGame,
  hire,
  scout,
  startDev,
  finishGame,
  ship,
  restock,
  startDlc,
  advanceWeek,
  currentYear,
  month,
  weekOfMonth,
  availableStores,
  supportsDl,
  loadGame,
  man,
  employeePool,
  activeEmployees,
  currentOffice,
  maxEmployees,
  officeRent,
  moveOffice,
  moveOfficeReason,
  upgradeLounge,
  loungeRecovery,
  loungeUpgradeCost,
} from '../src/lib/game.svelte'
import { kumiawase, availableGenres } from '../src/lib/data'

// 乱数を固定シードのLCGに差し替えて再現性を持たせる
let seed = 42
function lcg(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}
beforeAll(() => {
  vi.spyOn(Math, 'random').mockImplementation(lcg)
})

function reset(s = 42) {
  resetGame()
  seed = s
}

// 解放中のジャンル×内容から相性が最も良い組み合わせを探す（プレイヤーの最適行動相当）
function bestCombo(year: number): { genre: string; content: string; mark: string } {
  const order = ['☆', '◎', '◯', '◇', '△', '✕']
  let best = { genre: '', content: '', mark: '✕' }
  for (const genre of availableGenres(year)) {
    for (const content of kumiawase.contents) {
      const mark = kumiawase.matrix.get(content)?.get(genre)
      if (!mark) continue
      if (order.indexOf(mark) < order.indexOf(best.mark)) best = { genre, content, mark }
    }
  }
  return best
}

function weeksUntil(pred: () => boolean, maxWeeks: number): number {
  for (let i = 0; i < maxWeeks; i++) {
    advanceWeek()
    if (pred()) return i + 1
  }
  return -1
}

describe('バランスシミュレーション', () => {
  it('旧形式セーブ（バージョンなし）を読み込める', () => {
    reset()
    const legacy = JSON.stringify({
      money: 123_456_789,
      week: 30,
      fame: 5,
      studios: [
        {
          id: 1,
          name: '本社',
          leadId: null,
          dev: null,
          completed: null,
          contractId: null,
          dlc: null,
        },
      ],
      employees: [],
      techs: {},
      sales: [],
      salesHistory: [],
      catalog: [],
      saveSlot: 0,
    })
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k === 'gamedev-sim-save-0' ? legacy : null),
      setItem: () => {},
      removeItem: () => {},
    })
    expect(loadGame(0)).toBe(true)
    expect(game.money).toBe(123_456_789)
    expect(game.week).toBe(30)
    expect(game.studios.length).toBe(1)
  })

  it('序盤（1983〜）PC開発で黒字化でき10年破綻しない', () => {
    reset()
    const initialMoney = game.money
    // 初期社員2人（1983年解禁の中で速い組合せ）
    hire('tanaka')
    hire('sato')
    expect(game.employees.length).toBe(2)

    const moneyLog: string[] = []
    let lastLoggedYear = 0
    let devCount = 0

    for (let w = 0; w < 48 * 10; w++) {
      // 開発可能なら次を開発（完成品がある場合は出荷してから）
      const freeStudio = game.studios.find((s) => !s.dev && !s.completed && !s.contractId && !s.dlc)
      if (freeStudio && game.employees.length > 0) {
        const c = bestCombo(currentYear())
        startDev(`テスト作品${++devCount}`, c.genre, c.content, 'pc', freeStudio.id)
      }
      const ready = game.studios.find((s) => s.completed)
      if (ready?.completed) {
        const q = Math.min(Math.floor(ready.completed.expectedSales * 0.9), 500_000)
        ship(q, ready.id)
      }
      advanceWeek()
      if (game.gameOver) break
      const y = currentYear()
      if (y !== lastLoggedYear) {
        lastLoggedYear = y
        moneyLog.push(`${y}: 資金 ${man(game.money)} / 累計 ${game.totalSales.toLocaleString()}本`)
      }
    }
    console.log('--- 序盤10年の推移 ---\n' + moneyLog.join('\n'))
    expect(game.gameOver).toBe(false)
    expect(game.totalSales).toBeGreaterThan(0)
    // 最終的に資金が初期値を上回っている（黒字化できている）
    expect(game.money).toBeGreaterThan(initialMoney)
  })

  it('DLC解禁後（1996〜）DLC制作→販売→本編再燃が動く', () => {
    reset()
    game.week = (1996 - 1983) * 48 + 1 // 1996年4月から
    // 大所帯にして即開発できる状態を作る（メカニズム検証が目的なので資金は潤沢に）
    for (const e of ['tanaka', 'sato', 'suzuki', 'yamada']) hire(e)
    expect(game.employees.length).toBe(4)
    game.money = 500_000_000

    // 1本作って出荷 → カタログ入りまで進める
    const st = game.studios[0]
    const c = bestCombo(currentYear())
    startDev('ベース作品', c.genre, c.content, 'pc', st.id)
    weeksUntil(() => !!game.studios[0].completed, 200)
    const completed = game.studios[0].completed!
    expect(completed.expectedSales).toBeGreaterThan(0)
    ship(Math.min(Math.floor(completed.expectedSales), 500_000), 1, availableStores('pc')[0]?.id)
    weeksUntil(() => game.catalog.length > 0, 20)
    expect(game.catalog.length).toBe(1)
    const base = game.catalog[0]

    // DLC制作（DL対応ハード＋ストア解禁済み）
    expect(supportsDl(base.hardwareId)).toBe(true)
    expect(availableStores('pc').length).toBeGreaterThan(0)
    const beforeSold = base.soldTotal
    startDlc(0, 1)
    expect(game.studios.some((s) => s.dlc)).toBe(true)

    // DLC完成まで進行
    const done = weeksUntil(() => (base.dlcs?.length ?? 0) > 0, 100)
    console.log(
      `--- DLC検証 --- 完成まで${done}週 / レビュー ${base.dlcs![0].reviewScore}点 / ブースト残り${base.boostWeeks}週`,
    )
    expect(done).toBeGreaterThan(0)
    expect(base.boostWeeks).toBeGreaterThan(0)
    expect(base.dlcCapBonus).toBeGreaterThan(0)

    // DLC販売期間（6週）とブースト期間が回る
    const soldBeforeBoost = base.soldTotal
    weeksUntil(() => (base.boostWeeks ?? 0) <= 0, 30)
    const dlcTotal = base.dlcs![0].soldTotal
    console.log(
      `--- DLC販売 --- DLC累計 ${dlcTotal.toLocaleString()}本 / 本編ブースト中売上 +${(base.soldTotal - soldBeforeBoost).toLocaleString()}本`,
    )
    expect(dlcTotal).toBeGreaterThan(0)
    expect(game.money).toBeGreaterThan(0)
  })

  it('長期（40年）プレイで破綻しない', { timeout: 60_000 }, () => {
    reset()
    hire('tanaka')
    hire('sato')
    let devCount = 0
    let movedMid = false
    let movedLarge = false
    for (let w = 0; w < 48 * 40; w++) {
      const freeStudio = game.studios.find((s) => !s.dev && !s.completed && !s.contractId && !s.dlc)
      if (freeStudio && game.employees.length > 0) {
        const c = bestCombo(currentYear())
        startDev(`作品${++devCount}`, c.genre, c.content, 'pc', freeStudio.id)
      }
      const ready = game.studios.find((s) => s.completed)
      if (ready?.completed) {
        const store = availableStores(ready.completed.hardwareId).at(-1)
        const q = Math.min(Math.floor(ready.completed.expectedSales * 0.9), 500_000)
        ship(q, ready.id, store?.id)
      }
      if (game.employees.length < maxEmployees()) {
        scout()
        for (const c of game.scoutCandidates) {
          if (game.employees.length >= maxEmployees()) break
          if (game.money >= c.contract) hire(c.id)
        }
      }
      if (game.catalog.length > 0 && currentYear() >= 1996) {
        const dlcStudio = game.studios.find(
          (s) => !s.dev && !s.completed && !s.contractId && !s.dlc,
        )
        if (dlcStudio) {
          const idx = game.catalog.findIndex((g) => !g.dlcs || g.dlcs.length < 3)
          if (idx >= 0) startDlc(idx, dlcStudio.id)
        }
      }
      if (moveOfficeReason(1) === null) {
        moveOffice(1)
        movedMid = true
      }
      if (moveOfficeReason(2) === null) {
        moveOffice(2)
        movedLarge = true
      }
      const loungeCost = loungeUpgradeCost()
      if (loungeCost !== null && game.money >= loungeCost * 3) upgradeLounge()
      advanceWeek()
      if (game.gameOver) break
    }
    const dlcTotal = game.catalog.reduce((n, g) => n + (g.dlcs?.length ?? 0), 0)
    console.log(
      `--- 40年後 --- ${currentYear()}年 / 資金 ${man(game.money)} / 累計販売 ${game.totalSales.toLocaleString()}本 / 作品数 ${devCount} / DLC ${dlcTotal}本 / オフィス ${currentOffice().name}（社員${game.employees.length}人）/ 休憩室 Lv${game.loungeLevel} / 中移転${movedMid ? '済' : '未'}・大移転${movedLarge ? '済' : '未'}`,
    )
    expect(game.gameOver).toBe(false)
    expect(dlcTotal).toBeGreaterThan(0)
  })

  it('オフィス移転で社員上限が増え、受賞なしでは大規模に移れない', () => {
    reset()
    expect(currentOffice().id).toBe('small')
    expect(maxEmployees()).toBe(4)
    game.money = 1_000_000_000
    game.week = 3 * 48 + 1 // 4年目
    const before = game.money
    moveOffice(1)
    expect(game.officeLevel).toBe(1)
    expect(maxEmployees()).toBe(8)
    expect(game.money).toBe(before - 100_000_000)
    game.week = 3 * 48 + 45 // 4年目12月
    expect(month()).toBe(12)
    expect(moveOfficeReason(2)).toContain(
      '大規模オフィスへの移転にはデザイン賞と音楽賞の受賞が各1回以上必要です',
    )
    game.awards.design = 1
    game.awards.music = 1
    expect(moveOfficeReason(2)).toBe(null)
    moveOffice(2)
    expect(game.officeLevel).toBe(2)
    expect(maxEmployees()).toBe(14)
  })

  it('社員上限を超える雇用は拒否される', () => {
    reset()
    game.money = 500_000_000
    const pool = employeePool.filter(
      (e) => (e.availableFrom ?? 1983) <= 1983 && e.role !== 'スーパーハッカー',
    )
    for (const e of pool.slice(0, 4)) hire(e.id)
    expect(game.employees.length).toBe(4)
    hire(pool[4].id)
    expect(game.employees.length).toBe(4)
  })

  it('家賃は月の第1週に月額ぶん引かれる', () => {
    reset()
    game.week = 4 // 次に消化される週（5週目 = 2月第1週）で家賃支払い
    const before = game.money
    advanceWeek()
    expect(game.money).toBe(before - officeRent() * 4)
    reset()
    game.week = 5 // 次に消化される週（6週目 = 2月第2週）では家賃なし
    const before2 = game.money
    advanceWeek()
    expect(game.money).toBe(before2)
  })

  it('開発中はストレスが上昇し、過労で休養して回復する', () => {
    reset()
    hire('tanaka')
    hire('sato')
    const c = bestCombo(currentYear())
    startDev('ストレス検証作品', c.genre, c.content, 'pc', 1)
    const up = weeksUntil(() => (game.employees[0].stress ?? 0) > 0, 5)
    expect(up).toBeGreaterThan(0)
    expect(game.employees[0].stress ?? 0).toBeGreaterThan(0)
    game.studios[0].dev = null
    const s0 = game.employees[0].stress ?? 0
    const down = weeksUntil(() => (game.employees[0].stress ?? 0) < s0, 5)
    expect(down).toBeGreaterThan(0)
    startDev('ストレス検証作品2', c.genre, c.content, 'pc', 1)
    game.employees[0].stress = 99
    advanceWeek()
    expect(game.employees[0].resting).toBe(true)
    expect(activeEmployees().find((e) => e.id === 'tanaka')).toBeUndefined()
    expect(activeEmployees().some((e) => e.id === 'sato')).toBe(true)
    const back = weeksUntil(() => !game.employees[0].resting, 20)
    console.log(
      `--- ストレス検証 --- 休養 ${back}週で復帰 / 復帰時 stress ${game.employees[0].stress ?? 0}`,
    )
    expect(back).toBeGreaterThan(0)
    expect(game.employees[0].stress ?? 0).toBeLessThanOrEqual(30)
  })

  it('休憩室の改修で回復量が上がり、最高グレードで打ち止めになる', () => {
    reset()
    expect(game.loungeLevel).toBe(1)
    expect(loungeRecovery()).toBe(5)
    game.money = 1_000_000_000
    upgradeLounge()
    expect(game.loungeLevel).toBe(2)
    expect(loungeRecovery()).toBe(7)
    upgradeLounge()
    upgradeLounge()
    upgradeLounge()
    expect(game.loungeLevel).toBe(5)
    expect(loungeRecovery()).toBe(13)
    expect(loungeUpgradeCost()).toBe(null)
  })
})
