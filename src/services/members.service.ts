import { members } from '../data/mock'
import type { Member } from '../types'

export async function listMembers(): Promise<Member[]> {
  return Promise.resolve(members)
}
