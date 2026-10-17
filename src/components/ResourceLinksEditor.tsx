import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { ResourceLink } from '../types'

export function ResourceLinksEditor({ value, onChange }: { value: ResourceLink[]; onChange: (links: ResourceLink[]) => void }) {
  const updateLink = (index: number, patch: Partial<ResourceLink>) => {
    onChange(value.map((link, linkIndex) => linkIndex === index ? { ...link, ...patch } : link))
  }

  const removeLink = (index: number) => onChange(value.filter((_, linkIndex) => linkIndex !== index))
  const addLink = () => onChange([...value, { title: '', url: '', description: '' }])

  return <section className="resource-links-editor" aria-label="外部资源链接">
    <div className="resource-links-editor-head">
      <div><strong>外部链接</strong><small>为每个链接填写用途，访客就能知道点开后会看到什么。</small></div>
      <button type="button" className="secondary-button admin-small-button" onClick={addLink}><Plus size={14} /> 添加链接</button>
    </div>
    {value.length ? <div className="resource-links-editor-list">{value.map((link, index) => <article className="resource-link-editor-row" key={index}>
      <div className="resource-link-editor-top">
        <span><ExternalLink size={14} /> 链接 {index + 1}</span>
        <button type="button" className="admin-link-button admin-danger-link" onClick={() => removeLink(index)} aria-label={`删除链接 ${index + 1}`}><Trash2 size={13} /> 删除</button>
      </div>
      <div className="admin-editor-form-grid">
        <label><span>链接名称</span><input value={link.title} onChange={(event) => updateLink(index, { title: event.target.value })} placeholder="例如：网盘下载" /></label>
        <label><span>链接地址</span><input type="url" value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} placeholder="https://..." /></label>
      </div>
      <label><span>用途说明</span><input value={link.description ?? ''} onChange={(event) => updateLink(index, { description: event.target.value })} placeholder="例如：包含课程讲义和配套代码" /></label>
    </article>)}</div> : <p className="resource-links-editor-empty">还没有添加链接。点击“添加链接”后填写名称和网址。</p>}
  </section>
}
