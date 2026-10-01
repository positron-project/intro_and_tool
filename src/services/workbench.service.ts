import { apiConfig, apiRequest } from './api-client'
import type { WorkbenchSettings } from '../types'

const STORAGE_KEY = 'club-workbench-settings-v1'

export function defaultWorkbenchSettings(): WorkbenchSettings {
  return {
    liveEnabled: true,
    liveTitle: '本届正在发生',
    liveSubtitle: '来自公告、项目和资源的最新动态',
    liveItems: [],
    liveRotationSeconds: 4.2,
    projectsEnabled: true,
    projectsTitle: '当前进行的项目',
    projectIds: [],
    projectRotationSeconds: 5.2,
  }
}

function normalizeSettings(value: Partial<WorkbenchSettings> | null | undefined): WorkbenchSettings {
  const defaults = defaultWorkbenchSettings()
  return {
    ...defaults,
    ...value,
    liveItems: Array.isArray(value?.liveItems) ? value.liveItems.filter((item) => item && typeof item.id === 'string' && ['announcement', 'project', 'resource'].includes(item.type)) : defaults.liveItems,
    projectIds: Array.isArray(value?.projectIds) ? value.projectIds.filter((id): id is string => typeof id === 'string') : defaults.projectIds,
    liveRotationSeconds: Number.isFinite(value?.liveRotationSeconds) ? Math.max(2, Math.min(30, Number(value?.liveRotationSeconds))) : defaults.liveRotationSeconds,
    projectRotationSeconds: Number.isFinite(value?.projectRotationSeconds) ? Math.max(2, Math.min(30, Number(value?.projectRotationSeconds))) : defaults.projectRotationSeconds,
  }
}

export async function getWorkbenchSettings() {
  if (apiConfig.contentSource === 'api') {
    return normalizeSettings(await apiRequest<WorkbenchSettings>('/workbench-settings', { withAuth: false }))
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return normalizeSettings(raw ? JSON.parse(raw) as Partial<WorkbenchSettings> : null)
  } catch {
    return defaultWorkbenchSettings()
  }
}

export async function updateWorkbenchSettings(input: WorkbenchSettings) {
  const normalized = normalizeSettings(input)
  if (apiConfig.contentSource === 'api') {
    return normalizeSettings(await apiRequest<WorkbenchSettings>('/workbench-settings', { method: 'PATCH', body: normalized, withAuth: true }))
  }
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)) } catch { /* Storage may be unavailable. */ }
  return normalized
}
