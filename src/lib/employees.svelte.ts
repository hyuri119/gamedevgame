import rolesData from '../../data/roles.json'
import {
  game,
  employeePool,
  currentYear,
  START_YEAR,
  man,
  type RoleBonus,
  type RoleDef,
  type Employee,
} from './state.svelte'
import { maxEmployees, currentOffice } from './office.svelte'

const roles = rolesData.roles as Record<string, RoleDef>

export function jobLevels(emp: Employee): Record<string, number> {
  return emp.jobLevels ?? { [emp.role]: 1 }
}

export function jobLevel(emp: Employee, role?: string): number {
  const r = role ?? emp.role
  return jobLevels(emp)[r] ?? (r === emp.role ? 1 : 0)
}

// 職業ボーナス込みの実効能力値
export function effStats(emp: Employee): RoleBonus {
  const lv = jobLevel(emp)
  const b = roles[emp.role]?.bonus ?? { fun: 0, creativity: 0, graphics: 0, music: 0, speed: 0 }
  const cap = (v: number) => Math.min(100, Math.max(0, v))
  return {
    fun: cap(emp.fun + b.fun * lv),
    creativity: cap(emp.creativity + b.creativity * lv),
    graphics: cap(emp.graphics + b.graphics * lv),
    music: cap(emp.music + b.music * lv),
    speed: cap(emp.speed + b.speed * lv),
  }
}

export function evolveOptions(emp: Employee): string[] {
  const r = roles[emp.role]
  return r ? r.to.filter((t) => jobLevel(emp, t) < 10) : []
}

export function canEvolve(emp: Employee): boolean {
  const r = roles[emp.role]
  return !!r && emp.level >= r.level && r.to.length > 0
}

export function canSwitchJob(emp: Employee): boolean {
  return Object.keys(jobLevels(emp)).length > 1
}

export function switchJob(id: string, to: string) {
  const emp = game.employees.find((e) => e.id === id)
  if (!emp) return
  if (!emp.jobLevels?.[to]) {
    game.lastReport = `${to} は未経験のため転職できません`
    return
  }
  emp.role = to
  game.lastReport = `${emp.name} が ${to} に転職しました（職業Lv ${jobLevel(emp)}）`
}

export function evolve(id: string, to?: string) {
  const emp = game.employees.find((e) => e.id === id)
  if (!emp) return
  const r = roles[emp.role]
  if (!r || r.to.length === 0) {
    game.lastReport = `${emp.name} はこれ以上進化できません`
    return
  }
  if (emp.level < r.level) {
    game.lastReport = `${emp.name} の進化には Lv${r.level} 必要です`
    return
  }
  const targets = evolveOptions(emp)
  const target = to && targets.includes(to) ? to : targets[0]
  if (!target) {
    game.lastReport = `${emp.name} の進化先の職業レベルが上限です`
    return
  }
  const cost = 30_000_000
  if (game.money < cost) {
    game.lastReport = `進化費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  emp.fun = Math.min(100, emp.fun + 10)
  emp.creativity = Math.min(100, emp.creativity + 10)
  emp.graphics = Math.min(100, emp.graphics + 10)
  emp.music = Math.min(100, emp.music + 10)
  emp.speed = Math.min(100, emp.speed + 5)
  emp.jobLevels = { ...jobLevels(emp) }
  emp.jobLevels[target] = (emp.jobLevels[target] ?? 0) + 1
  emp.role = target
  game.lastReport = `${emp.name} が ${target} に進化しました！（職業Lv ${emp.jobLevels[target]}）`
}

export function train(id: string) {
  const emp = game.employees.find((e) => e.id === id)
  if (!emp) return
  if (emp.level >= 10) {
    game.lastReport = `${emp.name} はレベル上限です`
    return
  }
  const cost = emp.level * 5_000_000
  if (game.money < cost) {
    game.lastReport = `教育費用が足りません（${man(cost)} 必要）`
    return
  }
  game.money -= cost
  emp.fun = Math.min(100, emp.fun + 5)
  emp.creativity = Math.min(100, emp.creativity + 5)
  emp.graphics = Math.min(100, emp.graphics + 5)
  emp.music = Math.min(100, emp.music + 5)
  emp.speed = Math.min(100, emp.speed + 3)
  emp.jobLevels = { ...jobLevels(emp) }
  const jl = emp.jobLevels
  jl[emp.role] = Math.min(10, (jl[emp.role] ?? 1) + 1)
  emp.salary = Math.round(emp.salary * 1.08)
  emp.level += 1
  game.lastReport = `${emp.name} を教育しました（Lv ${emp.level - 1} → ${emp.level}、${emp.role} Lv${jl[emp.role]}、年俸 ${(emp.salary / 10000).toLocaleString()}万円）`
}

export function hire(id: string) {
  const emp = employeePool.find((e) => e.id === id)
  if (!emp) return
  if (game.employees.some((e) => e.id === id)) return
  if (game.employees.length >= maxEmployees()) {
    game.lastReport = `オフィスが手狭です（${currentOffice().name} は最大${maxEmployees()}人）。移転してください`
    return
  }
  if (emp.role === 'スーパーハッカー' && game.officeLevel < 2) {
    game.lastReport = 'スーパーハッカーを雇うには大規模オフィスが必要です'
    return
  }
  if (game.money < emp.contract) {
    game.lastReport = `契約金が足りません（${emp.name} は ${man(emp.contract)} 必要）`
    return
  }
  game.money -= emp.contract
  game.employees.push({ ...emp, jobLevels: { [emp.role]: 1 } })
  game.scoutCandidates = game.scoutCandidates.filter((c) => c.id !== id)
  game.lastReport = `${emp.name}（${emp.role}）を雇用しました（契約金 ${man(emp.contract)}）`
}

// スカウト（雇用候補をランダムに数人提示）
export function scout() {
  const y = currentYear()
  const unhired = employeePool.filter(
    (e) => !game.employees.some((h) => h.id === e.id) && (e.availableFrom ?? START_YEAR) <= y,
  )
  const shuffled = [...unhired]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  game.scoutCandidates = shuffled.slice(0, 4)
  if (game.scoutCandidates.length === 0) {
    game.lastReport = '雇用できる候補がいません'
  } else {
    game.lastReport = `${game.scoutCandidates.length}人の候補が見つかりました`
  }
}

export function fire(id: string) {
  game.employees = game.employees.filter((e) => e.id !== id)
  for (const s of game.studios) {
    if (s.leadId === id) s.leadId = null
  }
}
