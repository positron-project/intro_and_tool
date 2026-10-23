import { useAuth } from '../services/auth.context'
import { useLocalDraft } from '../lib/useLocalDraft'
import { LocalDraftNotice } from './LocalDraftNotice'
import { useEffect, useState } from 'react'
import { Plus, Save, Send, Trash2, X } from 'lucide-react'
import type { PromptTemplate } from '../types'

export type PromptFieldsInput = Pick<PromptTemplate, 'title' | 'usage' | 'model' | 'category' | 'preview'>

const emptyPrompt: PromptFieldsInput = {
  title: '',
  usage: '',
  model: '通用模型',
  category: '编程',
  preview: '',
}

function PromptFields({ value, onChange }: { value: PromptFieldsInput; onChange: (next: PromptFieldsInput) => void }) {
  return <div className="admin-editor-form">
    <label><span>模板名称</span><input value={value.title} maxLength={150} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="例如：代码审查清单" autoFocus /></label>
    <label><span>适用场景</span><input value={value.usage} maxLength={500} onChange={(event) => onChange({ ...value, usage: event.target.value })} placeholder="说明什么时候使用这条模板" /></label>
    <div className="admin-editor-form-grid"><label><span>适用模型</span><input value={value.model} maxLength={100} onChange={(event) => onChange({ ...value, model: event.target.value })} placeholder="通用模型" /></label><label><span>分类</span><input value={value.category} maxLength={50} onChange={(event) => onChange({ ...value, category: event.target.value })} placeholder="编程、Debug、论文" /></label></div>
    <label><span>Prompt 正文</span><textarea rows={8} maxLength={4000} value={value.preview} onChange={(event) => onChange({ ...value, preview: event.target.value })} placeholder="填写完整模板内容；公开页面的“复制 Prompt”会复制这里的文字。" /></label>
  </div>
}

export function PromptSubmissionModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (input: PromptFieldsInput) => Promise<void>
}) {
  const [draft, setDraft] = useState<PromptFieldsInput>(emptyPrompt)
  const { user } = useAuth()
  const localDraft = useLocalDraft({ ownerId: user?.id, scope: 'prompt:new', value: draft, onRestore: setDraft })
  const requestClose = () => { if (localDraft.confirmLeave()) onClose() }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!draft.title.trim() || !draft.category.trim() || !draft.preview.trim()) {
      setError('模板名称、分类和 Prompt 正文不能为空。')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit({ ...draft, title: draft.title.trim(), usage: draft.usage.trim(), model: draft.model.trim(), category: draft.category.trim(), preview: draft.preview.trim() })
      localDraft.clear()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Prompt 投稿失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={requestClose}><section className="admin-form-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-submit-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">PROMPT / SUBMISSION</p><h2 id="prompt-submit-title">投稿 Prompt 模板</h2><p>提交后由组长审核，通过后会公开到模板库。</p></div><button type="button" className="icon-button small" onClick={requestClose} aria-label="关闭 Prompt 投稿"><X size={16} /></button></div>
    <LocalDraftNotice draft={localDraft} />
    <PromptFields value={draft} onChange={setDraft} />
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="admin-modal-foot"><span>正文最多 4000 个字符</span><div><button type="button" className="secondary-button admin-small-button" onClick={requestClose} disabled={busy}>取消</button><button type="button" className="primary-button admin-small-button" onClick={() => void submit()} disabled={busy}><Send size={14} /> {busy ? '提交中…' : '提交审核'}</button></div></div>
  </section></div>
}

export function AdminPromptManagerModal({ items, onClose, onSave, onDelete }: {
  items: PromptTemplate[]
  onClose: () => void
  onSave: (id: string | undefined, input: PromptFieldsInput) => Promise<PromptTemplate>
  onDelete: (id: string) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string>('new')
  const selected = items.find((item) => item.id === selectedId)
  const [draft, setDraft] = useState<PromptFieldsInput>(emptyPrompt)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selected) {
      setDraft({ title: selected.title, usage: selected.usage, model: selected.model, category: selected.category, preview: selected.preview })
    } else if (selectedId === 'new') {
      setDraft(emptyPrompt)
    }
  }, [selectedId, selected])

  const save = async () => {
    if (!draft.title.trim() || !draft.category.trim() || !draft.preview.trim()) {
      setError('模板名称、分类和 Prompt 正文不能为空。')
      return
    }
    setBusy(true)
    setError('')
    try {
      const item = await onSave(selected?.id, { ...draft, title: draft.title.trim(), usage: draft.usage.trim(), model: draft.model.trim(), category: draft.category.trim(), preview: draft.preview.trim() })
      setSelectedId(item.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '模板保存失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await onDelete(selected.id)
      setSelectedId('new')
      setConfirmDelete(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '模板下架失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-prompt-manager" role="dialog" aria-modal="true" aria-labelledby="prompt-manager-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">PROMPT / LIBRARY</p><h2 id="prompt-manager-title">管理 Prompt 模板</h2><p>组长可以创建、编辑或下架已经公开的模板。</p></div><button type="button" className="icon-button small" onClick={onClose} aria-label="关闭模板管理"><X size={16} /></button></div>
    <div className="prompt-manager-list"><button type="button" className={selectedId === 'new' ? 'active' : ''} onClick={() => { setSelectedId('new'); setError(''); setConfirmDelete(false) }}><Plus size={14} /><span>新建模板</span></button>{items.map((item) => <button type="button" className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => { setSelectedId(item.id); setError(''); setConfirmDelete(false) }}><span><strong>{item.title}</strong><small>{item.category} · {item.model}</small></span></button>)}</div>
    <PromptFields value={draft} onChange={(next) => { setDraft(next); setError('') }} />
    {error && <p className="admin-inline-error" role="alert">{error}</p>}
    <div className="admin-modal-foot"><span>{confirmDelete ? '下架后不会出现在公开模板库。' : selected ? '编辑会立即同步到公开模板库。' : '新建的模板会直接公开。'}</span><div>{selected && !confirmDelete && <button type="button" className="admin-link-button admin-danger-link" onClick={() => setConfirmDelete(true)} disabled={busy}><Trash2 size={13} /> 下架</button>}{confirmDelete && <button type="button" className="secondary-button admin-small-button" onClick={() => setConfirmDelete(false)} disabled={busy}>取消下架</button>}{confirmDelete ? <button type="button" className="primary-button admin-small-button" onClick={() => void remove()} disabled={busy}><Trash2 size={14} /> 确认下架</button> : <button type="button" className="primary-button admin-small-button" onClick={() => void save()} disabled={busy}><Save size={14} /> {busy ? '保存中…' : '保存模板'}</button>}</div></div>
  </section></div>
}
