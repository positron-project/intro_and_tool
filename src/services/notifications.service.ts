import { apiConfig, apiRequest } from './api-client'

export interface ServerNotification {
  id: string
  type: string
  title: string
  content: string
  link?: string | null
  dedupeKey?: string | null
  isRead: boolean
  isActionable: boolean
  createdAt: string
}

export interface NotificationPage {
  items: ServerNotification[]
  total: number
  page: number
  pageSize: number
}

export async function listMyNotifications(page = 1, pageSize = 25) {
  if (apiConfig.contentSource !== 'api') return { items: [], total: 0, page, pageSize }
  return apiRequest<NotificationPage>('/notifications', {
    query: { page, pageSize },
    withAuth: true,
  })
}

export async function getMyUnreadNotificationCount() {
  if (apiConfig.contentSource !== 'api') return 0
  const result = await apiRequest<{ unreadCount: number }>('/notifications/unread-count', {
    withAuth: true,
  })
  return result.unreadCount
}

export async function markMyNotificationRead(notificationId: string) {
  if (apiConfig.contentSource !== 'api') return
  await apiRequest<ServerNotification>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    withAuth: true,
  })
}

export async function markAllMyNotificationsRead() {
  if (apiConfig.contentSource !== 'api') return 0
  const result = await apiRequest<{ updatedCount: number }>('/notifications/read-all', {
    method: 'POST',
    withAuth: true,
  })
  return result.updatedCount
}

export async function deleteMyNotification(notificationId: string) {
  if (apiConfig.contentSource !== 'api') return
  await apiRequest<void>(`/notifications/${encodeURIComponent(notificationId)}`, {
    method: 'DELETE',
    withAuth: true,
  })
}

export async function deleteAllReadMyNotifications() {
  if (apiConfig.contentSource !== 'api') return 0
  const result = await apiRequest<{ deletedCount: number }>('/notifications/read', {
    method: 'DELETE',
    withAuth: true,
  })
  return result.deletedCount
}
