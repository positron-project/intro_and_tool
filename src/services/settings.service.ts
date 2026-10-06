import { apiConfig, apiRequest } from './api-client'

export type ThemePreference = 'light' | 'dark'
export type BackgroundPreference = 'follow' | 'campus' | 'mist' | 'paper' | 'custom'

export interface SiteSettings {
  theme: ThemePreference
  schoolBackgroundEnabled: boolean
  customBackgroundAssetId?: string | null
  customBackgroundUrl?: string | null
  updatedAt?: string
}

export interface UserPreferences {
  theme: ThemePreference
  backgroundPreference?: BackgroundPreference
  schoolBackgroundEnabled: boolean
  customBackgroundAssetId?: string | null
  customBackgroundUrl?: string | null
  reducedMotion?: boolean
  updatedAt?: string
}

/**
 * Settings requests have a separate switch so deployments can enable them only
 * after both FastAPI settings endpoints are available.
 */
export const isRemoteSettingsEnabled = apiConfig.contentSource === 'api'
  && String(import.meta.env.VITE_SETTINGS_API_ENABLED ?? '').trim().toLowerCase() === 'true'

export function getSiteSettings() {
  return apiRequest<SiteSettings>('/settings/site', { withAuth: false })
}

export function updateSiteSettings(patch: Partial<SiteSettings>) {
  return apiRequest<SiteSettings>('/settings/site', { method: 'PATCH', body: patch, withAuth: true })
}

export function getUserPreferences() {
  return apiRequest<UserPreferences>('/users/me/preferences', { withAuth: true })
}

export function updateUserPreferences(patch: Partial<UserPreferences>) {
  return apiRequest<UserPreferences>('/users/me/preferences', { method: 'PATCH', body: patch, withAuth: true })
}
