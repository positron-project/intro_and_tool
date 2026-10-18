import type { AuthUser, Member } from '../types'
import { useState } from 'react'
import { apiConfig } from '../services/api-client'

// ---------------------------------------------------------------------------
// App 级共享小工具（从 src/App.tsx 抽出）
// 这些辅助函数原先定义在 App.tsx 顶层，被首页、管理页、成员页同时使用。
// 抽成模块后 App.tsx / AdminPage 都从这里导入，避免跨文件重复定义。
// ---------------------------------------------------------------------------

type Theme = 'light' | 'dark'
type BackgroundPreference = 'follow' | 'campus' | 'mist' | 'paper' | 'custom'
const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_LOCAL_AVATAR_BYTES = 5 * 1024 * 1024
function isSupportedImage(file: File, maxBytes: number) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= maxBytes
}
const roleLabels: Record<string, string> = {
  Admin: '组长',
  Leader: '组长',
  CohortLeader: '届次负责人',
  Contributor: '组员',
  Member: '普通成员',
  Visitor: '访客',
}

/**
 * An account's role and its team direction are separate pieces of data. Some
 * older API records only contain role metadata (or generic values such as
 * "全站内容"), so keep those values from leaking into the team column as
 * "账号资料". Explicit team directions still win when the backend provides
 * them.
 */
function accountDirectoryDirection(account: AuthUser) {
  const genericDirections = new Set(['全站内容', '成员与权限', '账号资料'])
  const direction = account.directions?.map((item) => item.trim()).find((item) => item && !genericDirections.has(item))
  if (direction) return direction
  if (account.role === 'Leader' || account.role === 'Admin') return '项目组'
  if (account.role === 'CohortLeader') return '届次负责人'
  if (account.role === 'Contributor' || account.role === 'Member') return '待分配'
  return '访客'
}
function safeLink(value?: string) {
  const href = value?.trim()
  if (!href) return undefined
  if (href.startsWith('#/')) return href
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || url.protocol === 'http:' ? href : undefined
  } catch {
    return undefined
  }
}

function safeImageSource(value?: string) {
  const source = value?.trim()
  if (!source) return undefined
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) return source
  return safeLink(source)
}
function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

function initialsFromName(name: string) {
  return Array.from(name.trim().replace(/\s+/g, '')).slice(-2).join('')
}

function avatarImageSource(value?: string | null) {
  const source = value?.trim().replace(/\\/g, '/')
  if (!source) return undefined
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) return source
  try {
    const origin = typeof window === 'undefined'
      ? new URL(apiConfig.baseUrl || 'http://localhost').origin
      : new URL(apiConfig.baseUrl || window.location.origin, window.location.origin).origin
    const url = new URL(source, origin)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

function Avatar({ initials, name, avatarUrl, accent = 'blue', size = 'md' }: { initials: string; name?: string; avatarUrl?: string | null; accent?: string; size?: 'sm' | 'md' | 'lg' }) {
  const imageUrl = avatarImageSource(avatarUrl)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const displayInitials = (name && initialsFromName(name)) || initials
  return <span className={`avatar avatar-${accent} avatar-${size}`}>{imageUrl && failedImageUrl !== imageUrl ? <img src={imageUrl} alt="" onError={() => setFailedImageUrl(imageUrl)} /> : displayInitials}</span>
}
function normalizeMemberTeamId(direction: string) {
  const value = direction.trim().toLowerCase()
  if (!value || value.includes('待分配') || value.includes('待补充')) return 'unassigned'
  if (value.includes('网安') || value.includes('安全') || value.includes('cyber')) return 'cybersecurity'
  if (value.includes('算法') || value.includes('algorithm') || value.includes('ai') || value.includes('agent') || value.includes('模型')) return 'algorithm'
  if (value.includes('project') || value.includes('项目')) return 'project'
  return 'project'
}

function accentForMemberDirection(direction: string) {
  const teamId = normalizeMemberTeamId(direction)
  if (teamId === 'algorithm') return 'violet'
  if (teamId === 'cybersecurity') return 'rose'
  return 'blue'
}

function cohortYearNumber(value: string) {
  const year = Number(value.replace(/\D/g, ''))
  return Number.isFinite(year) && year > 0 ? year : -1
}

function compareMembersByCohort(left: Member, right: Member) {
  const cohortOrder = cohortYearNumber(right.cohort) - cohortYearNumber(left.cohort)
  if (cohortOrder !== 0) return cohortOrder
  return left.name.localeCompare(right.name, 'zh-CN')
}

function normalizeMemberRole(role: string): '组长' | '负责人' | '组员' {
  if (role.includes('组长')) return '组长'
  if (role.includes('负责人')) return '负责人'
  return '组员'
}

const memberRoleOrder: Record<'组长' | '负责人' | '组员', number> = {
  组长: 0,
  负责人: 1,
  组员: 2,
}

function sortTeamMembers<T extends { role: string }>(members: T[]) {
  // 只按职务排序；同一职务保留接口/录入时的原顺序，避免给组员增加额外排序规则。
  return [...members].sort((left, right) => memberRoleOrder[normalizeMemberRole(left.role)] - memberRoleOrder[normalizeMemberRole(right.role)])
}

function mergeManagedTeamMembers<T extends { id: string; name: string; members: Array<{ id: string; name: string; role: string; direction: string; initials: string; accent: string; avatarUrl?: string }> }>(team: T, managedMembers: Member[], cohortYear: string, membersManaged: boolean) {
  if (!membersManaged) return sortTeamMembers(team.members)
  // 后端届次接口返回数据库数字 ID（例如项目组是 "3"），
  // 成员接口返回的是方向名称（例如“项目组”）。
  // 两边不能直接比较，统一转换成前端的规范小组标识后再匹配。
  const teamKey = normalizeMemberTeamId(team.name)
  const managed = managedMembers
    .filter((member) => member.cohort.replace(/\D/g, '') === cohortYear && normalizeMemberTeamId(member.direction) === teamKey)
    .map((member) => ({ id: member.id, name: member.name, role: normalizeMemberRole(member.role), direction: member.direction, initials: member.initials, accent: member.accent, avatarUrl: member.avatarUrl }))
  return sortTeamMembers(managed)
}

export {
  MAX_LOCAL_IMAGE_BYTES,
  MAX_LOCAL_AVATAR_BYTES,
  isSupportedImage,
  roleLabels,
  accountDirectoryDirection,
  safeLink,
  safeImageSource,
  initialsFromName,
  Tag,
  Avatar,
  normalizeMemberTeamId,
  accentForMemberDirection,
  cohortYearNumber,
  compareMembersByCohort,
  normalizeMemberRole,
  memberRoleOrder,
  sortTeamMembers,
  mergeManagedTeamMembers,
}

export type { Theme, BackgroundPreference }
