import { apiConfig, apiRequest } from './api-client'
import type { UploadAsset } from '../types'

export const MAX_RESOURCE_ATTACHMENTS = 5
export const MAX_RESOURCE_ATTACHMENT_BYTES = 20 * 1024 * 1024
const RESOURCE_UPLOAD_TIMEOUT_MS = 120_000
const RESOURCE_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'])

export function validateResourceAttachmentFiles(files: File[], currentCount: number) {
  if (currentCount + files.length > MAX_RESOURCE_ATTACHMENTS) return `最多上传 ${MAX_RESOURCE_ATTACHMENTS} 个文件`
  const invalid = files.find((file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    return !RESOURCE_ATTACHMENT_EXTENSIONS.has(extension) || file.size > MAX_RESOURCE_ATTACHMENT_BYTES
  })
  if (invalid) return `${invalid.name} 格式不支持或超过 20 MB；支持 PDF、Office、ZIP、TXT、MD 和常见图片`
  return ''
}

export interface UploadOptions {
  folder?: string
  alt?: string
  signal?: AbortSignal
}

/** Uploads are kept separate from content records so files can use object storage later. */
export async function uploadAsset(file: File, options: UploadOptions = {}) {
  if (apiConfig.contentSource !== 'api') throw new Error('当前使用本地模式，文件上传需要先配置 API。')
  const form = new FormData()
  form.append('file', file)
  if (options.folder) form.append('folder', options.folder)
  if (options.alt) form.append('alt', options.alt)
  return apiRequest<UploadAsset>('/uploads', {
    method: 'POST',
    body: form,
    signal: options.signal,
    timeoutMs: RESOURCE_UPLOAD_TIMEOUT_MS,
  })
}

export async function deleteAsset(id: string) {
  if (apiConfig.contentSource !== 'api') throw new Error('当前使用本地模式，文件管理需要先配置 API。')
  await apiRequest<void>(`/uploads/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
