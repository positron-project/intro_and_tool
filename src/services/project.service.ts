import { apiConfig, apiRequest } from './api-client'

const JOIN_REQUESTS_STORAGE_KEY = 'club-project-join-requests-v1'

export interface ProjectJoinRequest {
  id: string
  projectId: string
  projectName?: string
  userId: string
  userName: string
  message?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewNote?: string
  reviewedAt?: string
  updatedAt?: string
}

export interface ProjectJoinRequestInput {
  userId: string
  userName: string
  message?: string
}

function readLocalRequests() {
  try {
    const value = JSON.parse(window.localStorage.getItem(JOIN_REQUESTS_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value as ProjectJoinRequest[] : []
  } catch {
    return []
  }
}

function writeLocalRequests(requests: ProjectJoinRequest[]) {
  try { window.localStorage.setItem(JOIN_REQUESTS_STORAGE_KEY, JSON.stringify(requests)) } catch { /* Storage may be unavailable. */ }
}

function normalizeJoinRequest(request: ProjectJoinRequest): ProjectJoinRequest {
  // FastAPI 数据库编号是整数，前端内容模型统一使用字符串编号。
  return {
    ...request,
    id: String(request.id),
    projectId: String(request.projectId),
    userId: String(request.userId),
  }
}

export async function submitProjectJoinRequest(projectId: string, input: ProjectJoinRequestInput) {
  if (apiConfig.contentSource === 'api') {
    const request = await apiRequest<ProjectJoinRequest>(`/projects/${encodeURIComponent(projectId)}/join-requests`, {
      method: 'POST',
      body: { message: input.message?.trim() || undefined },
      withAuth: true,
    })
    return normalizeJoinRequest(request)
  }

  const requests = readLocalRequests()
  const existing = requests.find((item) => item.projectId === projectId && item.userId === input.userId && item.status === 'pending')
  if (existing) return existing
  const request: ProjectJoinRequest = {
    id: `join-request-${Date.now()}`,
    projectId,
    userId: input.userId,
    userName: input.userName,
    message: input.message?.trim() || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  requests.unshift(request)
  writeLocalRequests(requests)
  return request
}

/** 获取当前用户提交过的项目加入申请。 */
export async function listMyProjectJoinRequests() {
  if (apiConfig.contentSource === 'api') {
    const requests = await apiRequest<ProjectJoinRequest[]>('/projects/my-join-requests', { withAuth: true })
    return requests.map(normalizeJoinRequest)
  }
  return readLocalRequests()
}

/** 获取当前用户作为项目提交人需要处理的加入申请。 */
export async function listOwnedProjectJoinRequests(status?: ProjectJoinRequest['status']) {
  if (apiConfig.contentSource === 'api') {
    const requests = await apiRequest<ProjectJoinRequest[]>('/projects/my-owned-join-requests', {
      query: { status },
      withAuth: true,
    })
    return requests.map(normalizeJoinRequest)
  }
  return readLocalRequests().filter((request) => !status || request.status === status)
}

/** 获取负责人可见的项目加入申请审核队列。 */
export async function listProjectJoinRequests(status?: ProjectJoinRequest['status']) {
  if (apiConfig.contentSource === 'api') {
    const requests = await apiRequest<ProjectJoinRequest[]>('/projects/join-requests', {
      query: { status },
      withAuth: true,
    })
    return requests.map(normalizeJoinRequest)
  }
  return readLocalRequests().filter((request) => !status || request.status === status)
}

/** 审核一条项目加入申请。 */
export async function reviewProjectJoinRequest(
  requestId: string,
  status: Extract<ProjectJoinRequest['status'], 'approved' | 'rejected'>,
  reviewNote?: string,
) {
  if (apiConfig.contentSource === 'api') {
    const request = await apiRequest<ProjectJoinRequest>(`/projects/join-requests/${encodeURIComponent(requestId)}/review`, {
      method: 'POST',
      body: { status, reviewNote: reviewNote?.trim() || undefined },
      withAuth: true,
    })
    return normalizeJoinRequest(request)
  }

  const requests = readLocalRequests()
  const index = requests.findIndex((request) => request.id === requestId)
  if (index < 0) throw new Error('加入申请不存在')
  const updated = { ...requests[index], status, reviewNote: reviewNote?.trim() || undefined }
  requests[index] = updated
  writeLocalRequests(requests)
  return updated
}
