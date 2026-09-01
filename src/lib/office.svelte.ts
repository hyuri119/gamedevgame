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

export const officeCatalog: Office[] = (officesData as { offices: Office[] }).offices

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
