import { apiConfig, apiRequest } from './api-client'
import type { ClubConfigState, CohortPhoto, CohortRecord, CohortTeamRecord, SiteCopyRecord } from './club-config.context'

type ListPayload<T> = T[] | { items: T[] }
type CohortInput = Partial<CohortRecord> & Pick<CohortRecord, 'year'>
type TeamInput = Partial<CohortTeamRecord> & Pick<CohortTeamRecord, 'name'>

export const isRemoteClubConfigEnabled = apiConfig.contentSource === 'api'

function listItems<T>(payload: ListPayload<T>) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  throw new Error('组织配置列表接口返回格式不正确')
}

function withoutServerFields<T extends object>(value: T) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...body } = value as T & {
    id?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }
  return body
}

function withoutTimestamps<T extends object>(value: T) {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...body } = value as T & {
    createdAt?: unknown
    updatedAt?: unknown
  }
  return body
}

export async function fetchClubConfig(): Promise<ClubConfigState> {
  const [cohortsResult, siteCopyResult] = await Promise.allSettled([
    apiRequest<ListPayload<CohortRecord>>('/cohorts', { withAuth: false }),
    apiRequest<ListPayload<SiteCopyRecord>>('/site-copy', { withAuth: false }),
  ])
  if (cohortsResult.status === 'rejected' && siteCopyResult.status === 'rejected') {
    throw cohortsResult.reason instanceof Error ? cohortsResult.reason : new Error('组织配置接口暂时无法访问')
  }
  const cohorts = cohortsResult.status === 'fulfilled' ? listItems(cohortsResult.value) : []
  const siteCopy = siteCopyResult.status === 'fulfilled' ? listItems(siteCopyResult.value) : []
  const photoResults = await Promise.allSettled(cohorts.map(async (cohort) => {
    const payload = await apiRequest<ListPayload<CohortPhoto>>(`/cohorts/${encodeURIComponent(cohort.id)}/photos`, { withAuth: false })
    return listItems(payload)
  }))
  return {
    cohorts,
    photos: photoResults.flatMap((result) => result.status === 'fulfilled' ? result.value : []),
    siteCopy,
  }
}

export function createCohort(input: CohortInput) {
  return apiRequest<CohortRecord>('/cohorts', { method: 'POST', body: withoutServerFields(input), withAuth: true })
}

export function updateCohort(id: string, patch: Partial<CohortRecord>) {
  return apiRequest<CohortRecord>(`/cohorts/${encodeURIComponent(id)}`, { method: 'PATCH', body: withoutServerFields(patch), withAuth: true })
}

export async function deleteCohort(id: string) {
  await apiRequest<void>(`/cohorts/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
}

export function createTeam(cohortId: string, input: TeamInput) {
  return apiRequest<CohortTeamRecord>(`/cohorts/${encodeURIComponent(cohortId)}/teams`, { method: 'POST', body: withoutTimestamps(input), withAuth: true })
}

export function updateTeam(cohortId: string, teamId: string, patch: Partial<CohortTeamRecord>) {
  return apiRequest<CohortTeamRecord>(`/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}`, { method: 'PATCH', body: withoutServerFields(patch), withAuth: true })
}

export async function deleteTeam(cohortId: string, teamId: string) {
  await apiRequest<void>(`/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE', withAuth: true })
}

export function createPhoto(photo: CohortPhoto) {
  return apiRequest<CohortPhoto>(`/cohorts/${encodeURIComponent(photo.cohortId)}/photos`, { method: 'POST', body: withoutServerFields(photo), withAuth: true })
}

export function updatePhoto(id: string, patch: Partial<CohortPhoto>) {
  return apiRequest<CohortPhoto>(`/photos/${encodeURIComponent(id)}`, { method: 'PATCH', body: withoutServerFields(patch), withAuth: true })
}

export function setPhotoCover(id: string) {
  return apiRequest<CohortPhoto>(`/photos/${encodeURIComponent(id)}/cover`, { method: 'PATCH', withAuth: true })
}

export async function deletePhoto(id: string) {
  await apiRequest<void>(`/photos/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
}

export function updateSiteCopy(id: string, patch: Partial<SiteCopyRecord>) {
  return apiRequest<SiteCopyRecord>(`/site-copy/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, withAuth: true })
}
