import {
  game,
  techLevel,
  currentYear,
  month,
  year,
  weekOfMonth,
  man,
  SALES_SHARE,
  ARCADE_DEV_TARGET,
  ARCADE_WEEKS,
  ARCADE_INCOME,
} from './state.svelte'
import { effStats, activeEmployees } from './employees.svelte'
import { officeRent, updateStress, layoutSpeedMul } from './office.svelte'
import {
  devTarget,
  completeHardware,
  completeArcade,
  supportsDl,
  effectiveInstallBase,
} from './hardware.svelte'
import { completeDlc } from './sales.svelte'
import { completeDev, performExhibit, holdContest } from './studio.svelte'
import { saveGame } from './save.svelte'

const LONG_TAIL_RATE = 0.005 // ロングテール週間販売率（期待売上の0.5%/週）
const LONG_TAIL_CAP = 1.5 // 累計需要の上限（期待売上の1.5倍）
const SALARY_INFLATION_PER_YEAR = 0.04 // 物価スライド（年俸支払い額に年4%ずつ上乗せ）
const ANNUAL_RAISE = 1.02 // 定期昇給（毎年4月に年俸+2%）

export function advanceWeek() {
  if (game.gameOver) return
  game.week += 1
  const reports: string[] = []

  for (const studio of game.studios) {
    // 開発進行
    if (studio.dev) {
      const d = studio.dev
      const speed = activeEmployees().reduce((s, e) => s + effStats(e).speed, 0) * layoutSpeedMul()
      const leadBonus = studio.leadId ? 1.1 : 1.0
      if (d.stage === '開発') {
        const devSpeed = (1 + 0.1 * techLevel('fast_dev')) * leadBonus
        d.progress += (speed / 12) * devSpeed
        d.bug += Math.random() * 1.5
        if (d.progress >= devTarget(d.hardwareId)) {
          d.stage = 'バグ取り'
          reports.push(
            `「${d.name}」の開発が完了しました。バグ取りを開始します（バグ ${Math.floor(d.bug)}）`,
          )
        }
      } else {
        const fixSpeed = 1 + 0.5 * techLevel('bug_analysis')
        d.bug = Math.max(0, d.bug - (speed / 12) * 0.6 * fixSpeed)
        if (d.bug <= 0) {
          completeDev(studio)
          reports.push(
            `「${studio.completed!.name}」が完成しました！レビュー ${studio.completed!.reviewScore}点`,
          )
        }
      }
    }
  }

  // DLC制作進行（スタジオ占有・バグ取りなしの単純進行）
  for (const studio of game.studios) {
    const p = studio.dlc
    if (!p) continue
    const speed = activeEmployees().reduce((s, e) => s + effStats(e).speed, 0) * layoutSpeedMul()
    const leadBonus = studio.leadId ? 1.1 : 1.0
    p.progress += (speed / 12) * (1 + 0.1 * techLevel('fast_dev')) * leadBonus
    if (p.progress >= p.target) {
      const msg = completeDlc(studio)
      if (msg) reports.push(msg)
    }
  }

  // 発売キャンペーン販売（スタジオから切り離し、販売中も次の開発が可能）
  let weekRevenue = 0
  let weekSold = 0
  for (let i = game.sales.length - 1; i >= 0; i--) {
    const sale = game.sales[i]
    sale.game.weeksOnSale += 1
    const w = sale.game.weeksOnSale
    const share = SALES_SHARE[w] ?? 0
    const demand = Math.round(sale.game.expectedSales * share)
    const sold = Math.min(sale.inventory, demand)
    if (sold > 0) {
      const revenue = sold * (sale.game.price - sale.game.licenseFee - sale.game.storeFee)
      game.money += revenue
      sale.inventory -= sold
      game.totalSales += sold
      sale.currentSold += sold
      weekRevenue += revenue
      weekSold += sold
      reports.push(`「${sale.game.name}」を ${sold.toLocaleString()}本 販売（+${man(revenue)}）`)
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
        exhibited: sale.game.exhibited,
      })
      game.sales.splice(i, 1)
    }
  }

  // カタログ（ロングテール）販売
  {
    let tailSold = 0
    let tailRevenue = 0
    for (const g of game.catalog) {
      const cap = Math.round(g.expectedSales * (LONG_TAIL_CAP + (g.dlcCapBonus ?? 0)))
      const boosted = (g.boostWeeks ?? 0) > 0
      let demand = 0
      if (g.soldTotal < cap) {
        demand = Math.round(g.expectedSales * LONG_TAIL_RATE)
        // 話題スパイク（たまに再燃して売れる）
        if (Math.random() < 0.01) {
          const spike = Math.round(g.expectedSales * 0.05)
          demand += spike
          reports.push(
            `「${g.name}」が再び話題になっています！（+${spike.toLocaleString()}本の需要）`,
          )
        }
        // DLC効果: 発売後しばらく本編の需要も伸びる
        if (boosted && g.boostRate) {
          demand += Math.round(g.expectedSales * g.boostRate)
        }
        demand = Math.min(demand, cap - g.soldTotal)
      }
      const sold = Math.min(g.inventory, demand)
      if (sold > 0) {
        g.inventory -= sold
        g.soldTotal += sold
        game.totalSales += sold
        tailSold += sold
        tailRevenue += sold * (g.price - g.licenseFee - g.storeFee)
      }
      // ブースト中は在庫切れ分をDL販売で消化（デジタルのため生産費なし・売上単価7割）
      const dlDemand = demand - sold
      if (dlDemand > 0 && boosted && supportsDl(g.hardwareId)) {
        const revenue = Math.round(dlDemand * (g.price - g.licenseFee - g.storeFee) * 0.7)
        g.soldTotal += dlDemand
        game.totalSales += dlDemand
        tailSold += dlDemand
        tailRevenue += revenue
        reports.push(
          `DLCの効果で「${g.name}」が再燃！在庫分を超えてDL販売 ${dlDemand.toLocaleString()}本（+${man(revenue)}）`,
        )
      }
      if ((g.boostWeeks ?? 0) > 0) g.boostWeeks!--
    }
    if (tailSold > 0) {
      game.money += tailRevenue
      weekRevenue += tailRevenue
      weekSold += tailSold
    }
  }

  // DLC販売（デジタルのため在庫なし・手数料のみ差し引く）
  {
    let dlcSold = 0
    let dlcRevenue = 0
    for (const g of game.catalog) {
      for (const dlc of g.dlcs ?? []) {
        if (dlc.weeksOnSale >= SALES_SHARE.length - 1) continue
        dlc.weeksOnSale += 1
        const share = SALES_SHARE[dlc.weeksOnSale] ?? 0
        const sold = Math.round(dlc.expectedSales * share)
        if (sold <= 0) continue
        dlc.soldTotal += sold
        game.totalSales += sold
        dlcSold += sold
        dlcRevenue += sold * (dlc.price - dlc.storeFee)
      }
    }
    if (dlcSold > 0) {
      game.money += dlcRevenue
      weekRevenue += dlcRevenue
      weekSold += dlcSold
      reports.push(`DLC販売 ${dlcSold.toLocaleString()}本（+${man(dlcRevenue)}）`)
    }
  }

  // 週次売上履歴を記録（グラフ用）
  game.salesHistory.push({ week: game.week, revenue: weekRevenue, sold: weekSold })
  if (game.salesHistory.length > 400) game.salesHistory.shift()

  // 受注開発の進行
  if (game.activeContract) {
    const c = game.activeContract
    const studio = game.studios.find((s) => s.id === c.studioId)
    const speed = activeEmployees().reduce((s, e) => s + effStats(e).speed, 0) * layoutSpeedMul()
    const leadBonus = studio?.leadId ? 1.1 : 1.0
    c.progress += (speed / 10) * leadBonus
    c.elapsed += 1
    if (c.progress >= c.target) {
      const onTime = c.elapsed <= c.deadline
      const pay = onTime ? c.reward : Math.round(c.reward * 0.6)
      game.money += pay
      game.doneContracts.push(c.id)
      if (studio) studio.contractId = null
      reports.push(
        `受注案件「${c.name}」を納品しました（報酬 ${man(pay)}${onTime ? '' : '・納期遅れで減額'}）`,
      )
      game.activeContract = null
    }
  }

  // 自社ハード開発の進行
  if (game.hwProject) {
    game.hwProject.progress += 1
    if (game.hwProject.progress >= game.hwProject.target) {
      reports.push(completeHardware())
    }
  }

  // 自社ハードのライセンス収益・ネットワーク維持費
  for (const oh of game.ownHardware) {
    const ib = effectiveInstallBase(oh.id, currentYear())
    const income = Math.round(ib * 3)
    const net = income - oh.networkCost
    if (net !== 0) {
      game.money += net
      reports.push(
        `自社ハード「${oh.name}」${net >= 0 ? '収益' : '維持費'} ${net >= 0 ? '+' : ''}${man(net)}`,
      )
    }
  }

  // アーケード開発の進行
  if (game.arcadeProject) {
    const p = game.arcadeProject
    const speed = activeEmployees().reduce((s, e) => s + effStats(e).speed, 0) * layoutSpeedMul()
    if (p.stage === '開発') {
      p.progress += speed / 12
      p.bug += Math.random() * 1.5
      if (p.progress >= ARCADE_DEV_TARGET) {
        p.stage = 'バグ取り'
        reports.push(
          `アーケード「${p.name}」の開発が完了しました。バグ取りをして完成させましょう（バグ ${Math.floor(p.bug)}）`,
        )
      }
    } else {
      p.bug = Math.max(0, p.bug - (speed / 12) * 0.6 * (1 + 0.5 * techLevel('bug_analysis')))
    }
  }

  // ストレス更新（休憩室の回復・過労で休養）
  reports.push(...updateStress())

  // アーケード稼働収益（インカム）
  for (const ag of game.arcadeGames) {
    if (ag.weeksLeft > 0) {
      const income = ag.opeRate * ARCADE_INCOME
      game.money += income
      ag.weeksLeft -= 1
      reports.push(`アーケード「${ag.name}」インカム +${man(income)}`)
    }
  }

  // 年俸支払い（毎年4月、1回だけ。物価スライド＋定期昇給あり）
  if (month() === 4 && game.salaryYear !== year()) {
    game.salaryYear = year()
    const scale = 1 + SALARY_INFLATION_PER_YEAR * (year() - 1)
    const totalSalary = Math.round(game.employees.reduce((s, e) => s + e.salary, 0) * scale)
    if (totalSalary > 0) {
      game.money -= totalSalary
      for (const e of game.employees) e.salary = Math.round(e.salary * ANNUAL_RAISE)
      reports.push(`4月の年俸支払い ${man(totalSalary)}`)
    }
  }

  // オフィス家賃（月の第1週に月額家賃を支払う）
  if (weekOfMonth() === 1) {
    const rent = officeRent() * 4
    game.money -= rent
    reports.push(`オフィス家賃 ${man(rent)}`)
  }

  // ランダムイベント: 雑誌取材
  if (Math.random() < 0.06 && game.fame < 100) {
    game.fame = Math.min(100, game.fame + 2)
    reports.push('雑誌社から取材が来ました（知名度 +2）')
  }

  // ランダムイベント: ファンレター
  if (Math.random() < 0.05 && game.fame >= 5 && game.catalog.length > 0) {
    game.fame = Math.min(100, game.fame + 1)
    reports.push('ファンからファンレターが届きました（知名度 +1）')
  }

  // 自社が買収されそうになる危機（資金・知名度が低いと発生。序盤3年は猶予）
  if (
    !game.gameOver &&
    year() >= 3 &&
    game.money < 100_000_000 &&
    game.fame < 30 &&
    Math.random() < 0.02
  ) {
    const defense = 30_000_000
    game.money -= defense
    reports.push(`大手企業が当社の買収を仕掛けてきました！防衛に奔走（防衛費 ${man(defense)}）`)
  }

  // 年1回のゲームデックス（9月）
  if (month() === 9 && game.exhibitYear !== year()) {
    game.exhibitYear = year()
    const hasCandidate =
      game.studios.some(
        (s) => (s.dev && !s.dev.exhibited) || (s.completed && !s.completed.exhibited),
      ) || game.catalog.some((g) => !g.exhibited)
    if (game.autoExhibit) {
      const msgs: string[] = []
      for (const s of game.studios) {
        if (!s.dev) continue // 開発中の作品のみ自動出展
        const m = performExhibit(s)
        if (m) msgs.push(m)
      }
      if (msgs.length > 0) reports.push('ゲームデックス（9月）: ' + msgs.join(' / '))
    } else if (hasCandidate) {
      game.event = { type: 'decks' }
    }
  }

  // 年1回のコンテスト（12月）
  if (month() === 12 && game.contestYear !== year()) {
    game.contestYear = year()
    const result = holdContest()
    if (result) reports.push(result)
  }

  if (game.money < 0) {
    game.gameOver = true
    reports.push('資金が尽きました。破産です（ゲームオーバー）')
  }

  game.lastReport = reports.length > 0 ? reports.join(' / ') : '（特に動きはありません）'
  saveGame()
}
