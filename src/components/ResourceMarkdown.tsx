import { isValidElement, useState, type ComponentProps, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

function readText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(readText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return readText(node.props.children)
  return ''
}

function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setFailed(false)
    } catch {
      setCopied(false)
      setFailed(true)
    }

    window.setTimeout(() => {
      setCopied(false)
      setFailed(false)
    }, 1600)
  }

  return (
    <button type="button" className="resource-markdown-copy" onClick={() => void copyCode()} aria-live="polite">
      {copied ? '已复制' : failed ? '复制失败' : '复制代码'}
    </button>
  )
}

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} {...props}>
        {children}
      </a>
    )
  },
  table({ children, ...props }) {
    return (
      <div className="resource-markdown-table-wrap">
        <table {...props}>{children}</table>
      </div>
    )
  },
  pre({ children, ...props }: ComponentProps<'pre'>) {
    return (
      <div className="resource-markdown-code-block">
        <div className="resource-markdown-code-head">
          <span>代码</span>
          <CodeCopyButton text={readText(children)} />
        </div>
        <pre {...props}>{children}</pre>
      </div>
    )
  },
}

/**
 * 资源正文渲染器：支持 Markdown/GFM，同时保留未加标记的普通文字。
 * react-markdown 默认不执行正文中的原始 HTML，避免投稿内容注入脚本。
 */
export default function ResourceMarkdown({ content }: { content: string }) {
  return (
    <div className="resource-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
