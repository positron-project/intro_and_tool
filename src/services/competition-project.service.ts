import { apiConfig, apiRequest } from './api-client'
import type { CompetitionProject, CreateInput, UpdateInput } from '../types'

type ListPayload<T> = T[] | { items: T[] }

export const isRemoteCompetitionProjectsEnabled = apiConfig.contentSource === 'api'

function listItems<T>(payload: ListPayload<T>) {
  return Array.isArray(payload) ? payload : payload.items
}

function projectBody<T extends Partial<CompetitionProject>>(project: T): Omit<T, 'id'> {
  const { id: _id, ...body } = project
  return body
}

export async function listCompetitionProjects(competitionId: string) {
  const payload = await apiRequest<ListPayload<CompetitionProject>>(
    `/competitions/${encodeURIComponent(competitionId)}/cohort-projects`,
  )
  return listItems(payload).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
}

export function createCompetitionProject(competitionId: string, input: CreateInput<CompetitionProject>) {
  return apiRequest<CompetitionProject>(`/competitions/${encodeURIComponent(competitionId)}/cohort-projects`, {
    method: 'POST',
    body: projectBody(input),
  })
}

export function updateCompetitionProject(competitionId: string, projectId: string, patch: UpdateInput<CompetitionProject>) {
  return apiRequest<CompetitionProject>(
    `/competitions/${encodeURIComponent(competitionId)}/cohort-projects/${encodeURIComponent(projectId)}`,
    { method: 'PATCH', body: projectBody(patch) },
  )
}

export async function deleteCompetitionProject(competitionId: string, projectId: string) {
  await apiRequest<void>(
    `/competitions/${encodeURIComponent(competitionId)}/cohort-projects/${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  )
}

/** Synchronizes the editor draft against the server-owned child collection. */
export async function syncCompetitionProjects(competitionId: string, desired: CompetitionProject[]) {
  const current = await listCompetitionProjects(competitionId)
  const currentById = new Map(current.map((project) => [project.id, project]))
  const desiredIds = new Set(desired.filter((project) => currentById.has(project.id)).map((project) => project.id))

  await Promise.all(current.filter((project) => !desiredIds.has(project.id)).map((project) => deleteCompetitionProject(competitionId, project.id)))

  return Promise.all(desired.map((project, index) => {
    const body = { ...projectBody(project), sortOrder: project.sortOrder ?? index }
    return currentById.has(project.id)
      ? updateCompetitionProject(competitionId, project.id, body)
      : createCompetitionProject(competitionId, body)
  }))
}
