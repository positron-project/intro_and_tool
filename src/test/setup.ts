import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// 组件测试之间清空 DOM，避免上一个用例的渲染残留在下一个用例的查询结果里。
afterEach(() => {
  cleanup()
})
