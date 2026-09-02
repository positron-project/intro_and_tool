import { announcements } from '../data/mock'
import type { Announcement } from '../types'

export async function listAnnouncements(): Promise<Announcement[]> {
  return Promise.resolve(announcements)
}
