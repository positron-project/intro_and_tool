import { apiConfig, apiRequest } from './api-client'
import type { UploadAsset } from '../types'

export interface UploadOptions {
  folder?: string
  alt?: string
  signal?: AbortSignal
}

/** Uploads are kept separate from content records so images/files can use S3, MinIO or Supabase Storage later. */
export async function uploadAsset(file: File, options: UploadOptions = {}) {
  if (apiConfig.contentSource !== 'api') throw new Error('当前使用本地模式，文件上传需要先配置 API。')
  const form = new FormData()
  form.append('file', file)
  if (options.folder) form.append('folder', options.folder)
  if (options.alt) form.append('alt', options.alt)
  return apiRequest<UploadAsset>('/uploads', { method: 'POST', body: form, signal: options.signal })
}

export async function deleteAsset(id: string) {
  if (apiConfig.contentSource !== 'api') throw new Error('当前使用本地模式，文件管理需要先配置 API。')
  await apiRequest<void>(`/uploads/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
