import { useId, useState } from 'react'
import ResourceMarkdown from './ResourceMarkdown'
import './learning-markdown-field.css'

export function LearningMarkdownField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  placeholder: string
}) {
  const id = useId()
  const [view, setView] = useState<'edit' | 'preview'>('edit')

  return <div className="learning-markdown-field">
    <div className="learning-markdown-field-head">
      <label htmlFor={id}>{label}</label>
      <div className="learning-markdown-field-tabs" role="tablist" aria-label={`${label}编辑模式`}>
        <button type="button" role="tab" aria-selected={view === 'edit'} className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>编辑</button>
        <button type="button" role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>预览</button>
      </div>
    </div>
    {view === 'edit'
      ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} />
      : <div className="learning-markdown-preview" role="tabpanel" aria-label={`${label}预览`}>
          {value.trim() ? <ResourceMarkdown content={value} singleLineBreaks /> : <span className="learning-markdown-empty">填写内容后即可预览。</span>}
        </div>}
    <small>支持 Markdown：标题、粗体、列表、链接、表格和代码块。</small>
  </div>
}
