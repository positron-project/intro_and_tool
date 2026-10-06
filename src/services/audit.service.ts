import { apiConfig, apiRequest } from './api-client'

export interface AuditLog {
  id: string
  actorId?: string
  actorName?: string
  action: string
  resourceType?: string
  resourceId?: string
  target?: string
  result?: 'success' | 'failure'
  createdAt: string
  requestId?: string
}

export interface AuditLogListParams {
  page?: number
  pageSize?: number
  actorId?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
}

export interface AuditLogActionResult {
  affectedCount: number
}

export const isRemoteAuditEnabled = apiConfig.contentSource === 'api'

async function listAuditLogsFrom(path: string, params: AuditLogListParams = {}) {
  const payload = await apiRequest<AuditLog[] | { items: AuditLog[] }>(path, {
    query: {
      ...params,
      pageSize: params.pageSize ?? 100,
    },
    withAuth: true,
  })
  const logs = Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : null
  if (!logs) throw new Error('操作日志接口返回格式不正确')
  return logs
}

export function listAuditLogs(params: AuditLogListParams = {}) {
  return listAuditLogsFrom('/admin/audit-logs', params)
}

export async function listAllAuditLogs() {
  const logs: AuditLog[] = []
  let page = 1

  while (true) {
    const nextPage = await listAuditLogs({ page, pageSize: 100 })
    logs.push(...nextPage)
    if (nextPage.length < 100) return logs
    page += 1
  }
}

export function getAuditLog(id: string) {
  return apiRequest<AuditLog>(`/admin/audit-logs/${encodeURIComponent(id)}`, { withAuth: true })
}

export function deleteAuditLog(id: string) {
  return apiRequest<AuditLogActionResult>(`/admin/audit-logs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    withAuth: true,
  })
}

export function deleteAllAuditLogs() {
  return apiRequest<AuditLogActionResult>('/admin/audit-logs', {
    method: 'DELETE',
    withAuth: true,
  })
}
