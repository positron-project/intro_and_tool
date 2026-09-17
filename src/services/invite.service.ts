import { apiConfig, apiRequest } from './api-client'
import type { InviteCode, InviteCodeStatus } from '../types'

const INVITE_CODES_STORAGE_KEY = 'club-demo-invite-codes-v1'
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const isRemoteInviteEnabled = apiConfig.contentSource === 'api'

type StoredInviteCode = Omit<InviteCode, 'status'>

function readStoredInviteCodes(): StoredInviteCode[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(INVITE_CODES_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeStoredInviteCodes(codes: StoredInviteCode[]) {
  try {
    window.localStorage.setItem(INVITE_CODES_STORAGE_KEY, JSON.stringify(codes))
  } catch {
    // localStorage may be unavailable in private browsing or file:// previews.
  }
}

function getInviteCodeStatus(inviteCode: StoredInviteCode, now = Date.now()): InviteCodeStatus {
  if (inviteCode.revokedAt) return 'revoked'
  if (Date.parse(inviteCode.expiresAt) <= now) return 'expired'
  if (inviteCode.usedCount >= inviteCode.maxUses) return 'exhausted'
  return 'active'
}

function withStatus(inviteCode: StoredInviteCode): InviteCode {
  return { ...inviteCode, status: getInviteCodeStatus(inviteCode) }
}

function generateInviteCodePart(length = 4) {
  const values = new Uint32Array(length)
  try {
    window.crypto.getRandomValues(values)
    return Array.from(values, (value) => INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length]).join('')
  } catch {
    return Array.from({ length }, () => INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)]).join('')
  }
}

function generateReadableInviteCode() {
  return `OS-${generateInviteCodePart()}-${generateInviteCodePart()}`
}

export interface CreateInviteCodeInput {
  expiresAt: string
  maxUses: number
}

/** Lists current local demo codes. The API version will read this from the server. */
export async function listInviteCodes() {
  if (isRemoteInviteEnabled) {
    const payload = await apiRequest<InviteCode[] | { items: InviteCode[] }>('/admin/invites', { withAuth: true })
    const codes = Array.isArray(payload) ? payload : payload.items
    return codes.map(withStatus).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }
  return readStoredInviteCodes().map(withStatus).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

/** Creates a short, readable code for the contributor role. */
export async function createInviteCode(input: CreateInviteCodeInput) {
  const expiresAtTime = Date.parse(input.expiresAt)
  if (!Number.isFinite(expiresAtTime) || expiresAtTime <= Date.now()) throw new Error('有效期必须晚于当前时间')
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1 || input.maxUses > 999) throw new Error('最大使用次数应为 1 到 999')

  if (isRemoteInviteEnabled) {
    return apiRequest<InviteCode>('/admin/invites', {
      method: 'POST',
      body: {
        expiresAt: new Date(expiresAtTime).toISOString(),
        maxUses: input.maxUses,
        role: 'Contributor',
      },
      withAuth: true,
    })
  }

  const storedInviteCode: StoredInviteCode = {
    id: `invite-${Date.now()}-${generateInviteCodePart(3)}`,
    code: generateReadableInviteCode(),
    role: 'Contributor',
    expiresAt: new Date(expiresAtTime).toISOString(),
    maxUses: input.maxUses,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  }
  const codes = readStoredInviteCodes()
  codes.unshift(storedInviteCode)
  writeStoredInviteCodes(codes)
  return withStatus(storedInviteCode)
}

export async function revokeInviteCode(id: string) {
  if (isRemoteInviteEnabled) {
    return apiRequest<InviteCode>(`/admin/invites/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      withAuth: true,
    })
  }
  const codes = readStoredInviteCodes()
  const target = codes.find((inviteCode) => inviteCode.id === id)
  if (!target) throw new Error('邀请码不存在或已被删除')
  if (!target.revokedAt) target.revokedAt = new Date().toISOString()
  writeStoredInviteCodes(codes)
  return withStatus(target)
}

/**
 * Consumes one use of a code. The caller must still update the authenticated
 * user; this service only owns the invitation's lifecycle and usage count.
 */
export function redeemInviteCodeValue(value: string) {
  const normalizedCode = value.trim().toUpperCase()
  if (!normalizedCode) throw new Error('请输入邀请码')

  const codes = readStoredInviteCodes()
  const target = codes.find((inviteCode) => inviteCode.code.toUpperCase() === normalizedCode)
  if (!target) throw new Error('邀请码不存在，请检查后重试')

  const status = getInviteCodeStatus(target)
  if (status === 'expired') throw new Error('这个邀请码已过期，请联系管理员重新生成')
  if (status === 'exhausted') throw new Error('这个邀请码的使用次数已用完')
  if (status === 'revoked') throw new Error('这个邀请码已被管理员撤销')

  target.usedCount += 1
  writeStoredInviteCodes(codes)
  return withStatus(target)
}
