import {
  game,
  MAX_STUDIOS,
  nextStudioId,
  currentYear,
  month,
  freeStudio,
  man,
  makeForecast,
  licenseFeeMultiplier,
  compatMark,
  compatCoeff,
  COMPAT_REVIEW,
  HALL_OF_FAME_SCORE,
  contractCatalog,
  type Contract,
  type Studio,
  type CompletedGame,
  type CatalogGame,
  type RoleBonus,
} from './state.svelte'
import {
  findHardware,
  hasLicense,
  hwName,
  hardwarePower,
  effectiveInstallBase,
  marketFactor,
  marketGrowth,
  fameCoeff,
} from './hardware.svelte'
import { effStats, activeEmployees } from './employees.svelte'
import { maxEmployees } from './office.svelte'

const STUDIO_COST = 300_000_000
const EXHIBIT_FEE = 5_000_000

// スタジオ発足（責任者に Lv5 以上の社員が必要）
export function foundStudio(name: string, leadId: string) {
  const lead = game.employees.find((e) => e.id === leadId)
  if (!lead) {
    game.lastReport = '責任者となる社員を選んでください'
    return
  }
  if (lead.level < 5) {
    game.lastReport = '責任者には Lv5 以上の社員が必要です'
    return
  }
  if (game.studios.some((s) => s.leadId === leadId)) {
    game.lastReport = `${lead.name} は既に別のスタジオの責任者です`
    return
  }
  if (game.studios.length >= MAX_STUDIOS) {
    game.lastReport = `スタジオは最大${MAX_STUDIOS}つまでです`
    return
  }
  if (game.money < STUDIO_COST) {
    game.lastReport = `発足費用が足りません（${man(STUDIO_COST)} 必要）`
    return
  }
  game.money -= STUDIO_COST
  game.studios.push({
    id: nextStudioId(),
    name,
    leadId,
    dev: null,
    completed: null,
    contractId: null,
    dlc: null,
  })
  game.lastReport = `新スタジオ「${name}」を発足しました（責任者: ${lead.name}）`
}

// 他社買収（子会社として運用、責任者不要・知名度アップ。交渉失敗リスクあり）
export function acquireCompany() {
  if (game.studios.length >= MAX_STUDIOS) {
    game.lastReport = `スタジオは最大${MAX_STUDIOS}つまでです`
    return
  }
  const negotiateFee = 200_000_000
  const buyPrice = 600_000_000
  if (game.money < negotiateFee) {
    game.lastReport = `交渉費用が足りません（${man(negotiateFee)} 必要）`
    return
  }
  game.money -= negotiateFee
  if (Math.random() < 0.25) {
    game.lastReport = `買収交渉が決裂しました…交渉費用 ${man(negotiateFee)} を失いました`
    return
  }
  if (game.money < buyPrice) {
    game.lastReport = `買収資金が不足したため交渉が白紙に…（交渉費 ${man(negotiateFee)} を失いました）`
    return
  }
  game.money -= buyPrice
  game.studios.push({
    id: nextStudioId(),
    name: `子会社${game.studios.length}`,
    leadId: null,
    dev: null,
    completed: null,
    contractId: null,
    dlc: null,
  })
  game.fame = Math.min(100, game.fame + 10)
  const n = game.employees.filter((e) => e.id.startsWith('acquired')).length + 1
  if (game.employees.length < maxEmployees()) {
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
      contract: 0,
      stress: 0,
    })
    game.lastReport = '他社を買収し、子会社として運用します（知名度 +10、社員1名を引き継ぎ）'
  } else {
    game.lastReport =
      '他社を買収し、子会社として運用します（知名度 +10、社員の上限に達したため引き継ぎなし）'
  }
}

export function startDev(
  name: string,
  genre: string,
  content: string,
  hardwareId: string,
  studioId: number,
) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio) return
  if (studio.dev || studio.completed || studio.contractId) return
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください'
    return
  }
  const hw = findHardware(hardwareId)
  if (!hw) return
  if (!hasLicense(hardwareId)) {
    game.lastReport = `${hwName(hardwareId)} のライセンスが未取得です`
    return
  }
  if (hw.type === 'arcade') return
  const y = currentYear()
  if (hw.releaseYear > y || ('endYear' in hw && hw.endYear != null && hw.endYear < y)) {
    game.lastReport = `${hw.name} は現在開発対象にできません`
    return
  }
  studio.dev = {
    name,
    genre,
    content,
    hardwareId,
    stage: '開発',
    progress: 0,
    bug: 0,
    exhibited: false,
    bonus: { fun: 0, creativity: 0, graphics: 0, music: 0 },
  }
  game.lastReport = `「${name}」の開発を開始しました（${studio.name} / ${genre} × ${content} / ${hw.name}）`
}

const seqName = (base: string): string => {
  const m = base.match(/^(.*?)(\d+)$/)
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${base}2`
}

export function startSequel(hof: CompletedGame, studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio) return
  if (studio.dev || studio.completed || studio.contractId) return
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください'
    return
  }
  if (!hasLicense(hof.hardwareId)) {
    game.lastReport = `${hwName(hof.hardwareId)} のライセンスが未取得です`
    return
  }
  const hw = findHardware(hof.hardwareId)
  if (!hw || hw.type === 'arcade') return
  const y = currentYear()
  if (hw.releaseYear > y || ('endYear' in hw && hw.endYear != null && hw.endYear < y)) {
    game.lastReport = `${hw.name} は現在開発対象にできません`
    return
  }
  studio.dev = {
    name: seqName(hof.name),
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
      music: hof.music * 0.4,
    },
  }
  game.lastReport = `続編「${studio.dev.name}」の開発を開始しました（${studio.name} / 前作の実績を引き継ぎ）`
}

export function performExhibit(studio: Studio): string | null {
  const target = studio.completed ?? studio.dev
  if (!target || target.exhibited) return null
  if (game.money < EXHIBIT_FEE) return null
  game.money -= EXHIBIT_FEE
  let gain = 3
  if (studio.completed) gain += Math.round(studio.completed.reviewScore / 8)
  game.fame = Math.min(100, game.fame + gain)
  target.exhibited = true
  return `「${target.name}」をゲームデックスに出展しました（知名度 +${gain}）`
}

export function performCatalogExhibit(g: CatalogGame): string | null {
  if (g.exhibited) return null
  if (game.money < EXHIBIT_FEE) return null
  game.money -= EXHIBIT_FEE
  const gain = 2 + Math.round(g.reviewScore / 10)
  game.fame = Math.min(100, game.fame + gain)
  g.exhibited = true
  return `「${g.name}」をゲームデックスに出展しました（知名度 +${gain}）`
}

export function exhibitStudio(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio) return
  if (game.money < EXHIBIT_FEE) {
    game.lastReport = `出展費用が足りません（${man(EXHIBIT_FEE)} 必要）`
    return
  }
  game.lastReport = performExhibit(studio) ?? '出展できる作品がありません'
}

export function exhibitCatalog(idx: number) {
  const g = game.catalog[idx]
  if (!g) return
  if (game.money < EXHIBIT_FEE) {
    game.lastReport = `出展費用が足りません（${man(EXHIBIT_FEE)} 必要）`
    return
  }
  game.lastReport = performCatalogExhibit(g) ?? '出展できる作品がありません'
}

export function closeDecks() {
  game.event = null
}

export function setAutoExhibit(v: boolean) {
  game.autoExhibit = v
  game.lastReport = v
    ? 'ゲームデックス自動出展をオンにしました（9月に開発中の作品を自動出展）'
    : 'ゲームデックス自動出展をオフにしました'
}

// 受注開発（外注納品）
export function availableContracts(): Contract[] {
  return contractCatalog.filter((c) => c.minFame <= game.fame && !game.doneContracts.includes(c.id))
}

export function acceptContract(id: string) {
  if (game.activeContract) {
    game.lastReport = 'すでに受注案件を抱えています'
    return
  }
  const c = contractCatalog.find((x) => x.id === id)
  if (!c) return
  if (game.employees.length === 0) {
    game.lastReport = '社員がいません。先に雇用してください'
    return
  }
  const studio = freeStudio()
  if (!studio) {
    game.lastReport = '空いているスタジオがありません'
    return
  }
  studio.contractId = c.id
  game.activeContract = {
    id: c.id,
    name: c.name,
    reward: c.reward,
    deadline: c.deadline,
    target: c.target,
    progress: 0,
    elapsed: 0,
    studioId: studio.id,
  }
  game.lastReport = `受注案件「${c.name}」を受注しました（${studio.name}で開発 / 報酬 ${man(c.reward)} / 納期 ${c.deadline}週）`
}

export function cancelContract() {
  if (!game.activeContract) return
  const studio = game.studios.find((s) => s.id === game.activeContract!.studioId)
  if (studio) studio.contractId = null
  game.activeContract = null
  game.lastReport = '受注案件をキャンセルしました'
}

export function finishGame(studioId: number) {
  const studio = game.studios.find((s) => s.id === studioId)
  if (!studio || !studio.dev || studio.dev.stage !== 'バグ取り') return
  completeDev(studio)
}

export function completeDev(studio: Studio) {
  const d = studio.dev!
  const hw = findHardware(d.hardwareId)!
  const power = hardwarePower(d.hardwareId)
  const cap = power * 10
  const act = activeEmployees()
  const n = act.length || 1

  const avg = (key: keyof RoleBonus) => act.reduce((s, e) => s + effStats(e)[key], 0) / n
  const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)))

  const fun = clamp100(avg('fun') * 1.2 + d.bonus.fun)
  const creativity = clamp100(avg('creativity') * 1.2 + d.bonus.creativity)
  const graphics = Math.min(cap, clamp100(avg('graphics') * 1.2 + d.bonus.graphics))
  const music = Math.min(cap, clamp100(avg('music') * 1.2 + d.bonus.music))
  const bug = Math.max(0, Math.min(30, Math.round(d.bug)))

  const rawScore = 0.4 * fun + 0.3 * creativity + 0.15 * graphics + 0.15 * music
  const score = Math.max(0, rawScore - bug * 0.8)

  const mark = compatMark(d.genre, d.content)
  const reviewScore = Math.max(
    0,
    Math.min(40, Math.round((score / 100) * 40 + (COMPAT_REVIEW[mark] ?? 0))),
  )
  const hallOfFame = reviewScore >= HALL_OF_FAME_SCORE

  const quality = 0.5 + score / 100
  const compat = compatCoeff(d.genre, d.content)
  const m = month()
  const season = m === 7 || m === 12 ? 1.3 : 1.0
  const reach =
    0.08 *
    quality *
    compat *
    fameCoeff(game.fame) *
    season *
    marketFactor(hw) *
    marketGrowth(currentYear())
  const expectedSales = Math.round(effectiveInstallBase(d.hardwareId, currentYear()) * reach)

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
    forecastSales: makeForecast(expectedSales),
    price: 5800,
    licenseFee: Math.round((hw.licenseFee ?? 0) * licenseFeeMultiplier()),
    storeFee: 0,
    weeksOnSale: 0,
    exhibited: d.exhibited,
  }
  studio.dev = null

  if (hallOfFame) game.hallOfFame.push({ ...studio.completed })
  game.yearGames.push({ name: studio.completed.name, reviewScore, graphics, music })
}

export function holdContest(): string | null {
  const entries = game.yearGames
  game.yearGames = []
  if (entries.length === 0) return null

  const best = entries.reduce((a, b) => (a.reviewScore >= b.reviewScore ? a : b))
  const worst = entries.reduce((a, b) => (a.reviewScore <= b.reviewScore ? a : b))
  const gfx = entries.reduce((a, b) => (a.graphics >= b.graphics ? a : b))
  const mus = entries.reduce((a, b) => (a.music >= b.music ? a : b))

  const msgs: string[] = []
  let fame = 0
  let prize = 0

  if (best.reviewScore >= 36) {
    fame += 15
    prize += 50_000_000
    game.grandPrix += 1
    msgs.push(`全日本ゲームコンテスト: 「${best.name}」がグランプリ受賞！`)
  } else if (best.reviewScore >= 30) {
    fame += 8
    prize += 20_000_000
    msgs.push(`全日本ゲームコンテスト: 「${best.name}」が準グランプリ受賞！`)
  } else {
    msgs.push('全日本ゲームコンテスト: 受賞なし')
  }

  if (gfx.graphics >= 70 && gfx !== best) {
    fame += 5
    prize += 5_000_000
    game.awards.design += 1
    msgs.push(`「${gfx.name}」がデザイン賞受賞！`)
  }
  if (mus.music >= 70 && mus !== best) {
    fame += 5
    prize += 5_000_000
    game.awards.music += 1
    msgs.push(`「${mus.name}」が音楽賞受賞！`)
  }
  if (worst.reviewScore < 10) {
    fame += 2
    msgs.push(`「${worst.name}」がクソゲー賞受賞…`)
  }

  game.fame = Math.min(100, game.fame + fame)
  game.money += prize
  if (prize > 0) msgs.push(`賞金 +${man(prize)}`)
  return msgs.join(' / ')
}
