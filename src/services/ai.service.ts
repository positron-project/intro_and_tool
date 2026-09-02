import { citations } from '../data/mock'
import type { AIMessage } from '../types'

export async function askAssistant(prompt: string): Promise<AIMessage> {
  return Promise.resolve({ id: `assistant-${Date.now()}`, role: 'assistant', content: `已收到你的问题：${prompt}\n我会从路线、项目与资源中整理一条可执行的下一步。`, citations })
}
