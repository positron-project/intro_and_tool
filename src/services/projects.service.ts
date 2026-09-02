import { projects } from '../data/mock'
import type { Project } from '../types'

/** Mock now, API boundary later. Components should only call this service. */
export async function listProjects(): Promise<Project[]> {
  return Promise.resolve(projects)
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return Promise.resolve(projects.find((project) => project.slug === slug))
}
