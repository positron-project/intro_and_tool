import { resources } from '../data/mock'
import type { Resource } from '../types'

export async function listResources(): Promise<Resource[]> {
  return Promise.resolve(resources)
}
