import { citations } from '../data/mock'
import { apiConfig, apiRequest } from './api-client'
import type { AIMessage } from '../types'

export async function askAssistant(prompt: string): Promise<AIMessage> {
  if (apiConfig.contentSource === 'api') {
    return apiRequest<AIMessage>('/ai/ask', { method: 'POST', body: { prompt } })
  }
  const content = prompt.includes('项目')
    ? '结合你选择的方向，可以先从校园 AI 智能助手的前端协作任务开始，再逐步参与接口联调。'
    : prompt.includes('FastAPI')
      ? '建议先用一周完成 Python 工程基础和 FastAPI 路由，再把知识放进一个小项目。路线里已经为你标记了项目入口。'
      : '我已经把这个问题拆进学习路线、项目和资源中。先选择一个方向，我们一起找到可执行的下一步。'
  return Promise.resolve({ id: `assistant-${Date.now()}`, role: 'assistant', content, citations })
}
