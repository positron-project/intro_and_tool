import type { Member } from '../types'

const memberProfilePrefix = 'member:'

function resolveMember(reference: string, members: readonly Member[]) {
  if (reference.startsWith(memberProfilePrefix)) {
    const memberId = reference.slice(memberProfilePrefix.length)
    return members.find((member) => String(member.id) === memberId)
  }

  // Account IDs are used by project submissions and join approvals. Prefer
  // that identity for legacy unprefixed IDs, then fall back to profile IDs.
  return members.find((member) => member.userId != null && String(member.userId) === reference)
    ?? members.find((member) => String(member.id) === reference)
}

export function projectMemberReference(member: Member) {
  return member.userId == null
    ? `${memberProfilePrefix}${member.id}`
    : String(member.userId)
}

export function normalizeProjectMemberIds(ids: readonly (string | number)[], members: readonly Member[]) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const id of ids) {
    const reference = String(id)
    const member = resolveMember(reference, members)
    const canonicalReference = member ? projectMemberReference(member) : reference
    if (seen.has(canonicalReference)) continue
    seen.add(canonicalReference)
    normalized.push(canonicalReference)
  }

  return normalized
}

export function resolveProjectMembers(ids: readonly (string | number)[], members: readonly Member[]) {
  const memberIds = normalizeProjectMemberIds(ids, members)
  const visibleMembers = new Map<string, Member>()
  let unresolvedCount = 0

  for (const id of memberIds) {
    const member = resolveMember(id, members)
    if (!member) {
      unresolvedCount += 1
      continue
    }
    visibleMembers.set(String(member.id), member)
  }

  return { memberIds, members: [...visibleMembers.values()], unresolvedCount }
}

export function isProjectMemberSelected(ids: readonly string[], target: Member, members: readonly Member[]) {
  return ids.some((id) => resolveMember(id, members)?.id === target.id)
}

export function toggleProjectMember(ids: readonly string[], target: Member, members: readonly Member[]) {
  const isSelected = isProjectMemberSelected(ids, target, members)
  const remainingIds = ids.filter((id) => resolveMember(id, members)?.id !== target.id)
  const nextIds = isSelected ? remainingIds : [...remainingIds, projectMemberReference(target)]
  return normalizeProjectMemberIds(nextIds, members)
}
