import officesData from '../../data/offices.json'
import { game, year, month, man } from './state.svelte'

export interface Office {
  id: string
  name: string
  capacity: number
  rent: number
  desks: number
  moveCost: number
}

export interface Lounge {
  level: number
  cost: number
  recover: number
  relief: number
}

export const officeCatalog: Office[] = (officesData as { offices: Office[] }).offices
export const loungeCatalog: Lounge[] = (officesData as { lounge: Lounge[] }).lounge

export function currentLounge(): Lounge {
  return loungeCatalog[game.loungeLevel - 1] ?? loungeCatalog[0]
}

export function loungeRecovery(): number {
  return currentLounge().recover
}

export function loungeRelief(): number {
  return currentLounge().relief
}

export function loungeUpgradeCost(): number | null {
  const next = loungeCatalog[game.loungeLevel]
  return next ? next.cost : null
}

export function upgradeLounge() {
  const cost = loungeUpgradeCost()
  if (cost === null) {
    game.lastReport = '休憩室はすでに最高グレードです'
    return
  }
  if (game.money < cost) {
    game.lastReport = `休憩室の改修費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  game.loungeLevel += 1
  const l = currentLounge()
  game.lastReport = `休憩室を Lv${l.level} に改修しました（休息時の回復 ${l.recover}/週・ストレス上昇軽減 ${Math.round(l.relief * 100)}%）`
}

export function updateStress(): string[] {
  const reports: string[] = []
  const hasProject =
    game.studios.some((s) => s.dev || s.dlc) ||
    game.activeContract !== null ||
    game.hwProject !== null ||
    game.arcadeProject !== null
  for (const e of game.employees) {
    e.stress ??= 0
    if (e.resting === true) {
      e.stress -= loungeRecovery() * 2
      if (e.stress <= 30) {
        e.resting = false
        reports.push(`${e.name} が休養から復帰しました`)
      }
    } else if (hasProject) {
      e.stress += 2 * (1 - loungeRelief())
    } else {
      e.stress -= loungeRecovery()
    }
    e.stress = Math.max(0, Math.min(100, Math.round(e.stress)))
    if (e.stress >= 100 && e.resting !== true) {
      e.resting = true
      reports.push(`${e.name} が過労で休養に入りました`)
    }
  }
  return reports
}

export function currentOffice(): Office {
  return officeCatalog[game.officeLevel] ?? officeCatalog[0]
}

export function maxEmployees(): number {
  return currentOffice().capacity
}

export function officeRent(): number {
  return currentOffice().rent
}

export function officeDesks(): number {
  return currentOffice().desks
}

export function moveOfficeReason(idx: number): string | null {
  if (idx <= game.officeLevel) return 'すでに現在以上のオフィスです'
  if (game.officeLevel !== idx - 1) return '小規模 → 中規模 → 大規模の順に移転してください'
  const office = officeCatalog[idx]
  if (game.money < office.moveCost) return `移転費用が足りません（${man(office.moveCost)} 必要）`
  if (idx === 1 && year() < 4) return '中規模オフィスへの移転は4年目以降に可能です'
  if (idx === 2 && (year() < 4 || (year() === 4 && month() < 12)))
    return '大規模オフィスへの移転は4年目12月以降に可能です'
  if (idx === 2 && (game.awards.design < 1 || game.awards.music < 1))
    return '大規模オフィスへの移転にはデザイン賞と音楽賞の受賞が各1回以上必要です'
  return null
}

export function moveOffice(idx: number) {
  const reason = moveOfficeReason(idx)
  if (reason !== null) {
    game.lastReport = reason
    return
  }
  const office = officeCatalog[idx]
  game.money -= office.moveCost
  game.officeLevel = idx
  game.lastReport = `${office.name}に移転しました（社員上限 ${office.capacity}人 / 月額家賃 ${man(office.rent * 4)}）`
}
