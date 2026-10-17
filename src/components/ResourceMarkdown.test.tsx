import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import ResourceMarkdown from './ResourceMarkdown'

describe('ResourceMarkdown', () => {
  it('渲染标题、表格和代码块', () => {
    render(<ResourceMarkdown content={'# 标题\n\n|名称|说明|\n|---|---|\n|FastAPI|后端框架|\n\n```js\nconsole.log("hello")\n```'} />)

    expect(screen.getByRole('heading', { name: '标题', level: 1 })).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('console.log("hello")')).toBeTruthy()
    expect(screen.getByRole('button', { name: '复制代码' })).toBeTruthy()
  })

  it('保留普通文本并忽略原始 HTML 标签', () => {
    const { container } = render(<ResourceMarkdown content={'普通正文\n继续一行\n\n<script>alert("x")</script>'} />)

    expect(screen.getByText(/普通正文/)).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
    expect(screen.queryByText('alert("x")')).toBeNull()
  })
})
