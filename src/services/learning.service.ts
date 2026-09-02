import { learningNodes } from '../data/mock'
import type { LearningRoute } from '../types'

export async function getLearningRoute(): Promise<LearningRoute> {
  return Promise.resolve({ id: 'pyagent', title: 'PyAgent · 从基础到真实项目', description: '把 Python 能力带进一个可交付的 Agent 项目。', nodes: learningNodes })
}
