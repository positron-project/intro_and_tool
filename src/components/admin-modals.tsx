import * as React from 'react'
import { ArrowRight, Check, ChevronRight, Folder, MessageCircle, Megaphone, Plus, Rocket, Route, Save, ScrollText, Search, Sparkles, Trash2, UserCog, X } from 'lucide-react'
import type { AnnouncementCategory, InterviewExperience, LearningNode, LearningRoute, Member, Project, ProjectLogEntry, ProjectMilestone, Resource } from '../types'

export type AnnouncementDraft = {
  id?: string
  category: AnnouncementCategory
  title: string
  detail: string
  scope: string
  published: boolean
}

export type MemberDraft = {
  id?: string
  name: string
  role: string
  cohort: string
  direction: string
  initials: string
  accent: string
  projects: string[]
}

export type ContentDraft = {
  module: string
  title: string
  description: string
  status: string
  visibility: '全站公开' | '成员可见' | '组员可见'
}

const announcementCategories: AnnouncementCategory[] = ['重要', '比赛', '项目', '讲座', '通知']
const accents = ['blue', 'violet', 'mint', 'orange', 'rose']
const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024

function isSupportedImage(file: File) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= MAX_LOCAL_IMAGE_BYTES
}

export type AdminDeleteRequest = {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
}

export function AdminDeleteConfirm({ request, busy = false, onCancel }: { request: AdminDeleteRequest; busy?: boolean; onCancel: () => void }) {
  return <div className="admin-delete-confirm-scrim" role="presentation" onClick={onCancel}><section className="admin-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-confirm-title" aria-describedby="admin-delete-confirm-message" onClick={(event) => event.stopPropagation()}><div className="admin-delete-confirm-head"><span className="admin-delete-confirm-icon"><Trash2 size={17} /></span><div><p className="eyebrow">DANGER ZONE / DELETE</p><h3 id="admin-delete-confirm-title">{request.title}</h3></div></div><p id="admin-delete-confirm-message">{request.message}</p><div className="admin-delete-confirm-actions"><button type="button" className="secondary-button admin-small-button" disabled={busy} onClick={onCancel}>{request.cancelLabel ?? '取消'}</button><button type="button" className="admin-danger-button admin-small-button" disabled={busy} onClick={() => void request.onConfirm()}><Trash2 size={14} /> {busy ? '删除中…' : request.confirmLabel ?? '确认删除'}</button></div></section></div>
}

export function createMemberDraft(member?: Member, cohort = '2029'): MemberDraft {
  return member
    ? { id: member.id, name: member.name, role: member.role, cohort: member.cohort.replace(' 届', ''), direction: member.direction, initials: member.initials, accent: member.accent, projects: member.projects }
    : { name: '', role: '项目成员', cohort, direction: '', initials: '', accent: 'blue', projects: [] }
}

export function AdminAnnouncementModal({ draft, scopeOptions = ['全站公开', '2029 届可见', '管理员可见'], onChange, onClose, onSave }: { draft: AnnouncementDraft; scopeOptions?: string[]; onChange: (draft: AnnouncementDraft) => void; onClose: () => void; onSave: () => void }) {
  const scopes = Array.from(new Set([...scopeOptions, draft.scope]))
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="admin-announcement-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">BROADCAST / EDITOR</p><h2 id="admin-announcement-title">{draft.id ? '编辑公告' : '发布公告'}</h2><p>发布后会显示在首页最新公告，并记录操作者与发布时间。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭公告编辑"><X size={16} /></button></div><div className="admin-editor-form"><label><span>公告标题</span><input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="例如：2026 蓝桥杯报名通知" autoFocus /></label><label><span>公告内容</span><textarea value={draft.detail} onChange={(event) => onChange({ ...draft, detail: event.target.value })} rows={4} placeholder="写清楚时间、地点和行动方式" /></label><div className="admin-editor-form-grid"><label><span>分类</span><select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value as AnnouncementCategory })}>{announcementCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>可见范围</span><select value={draft.scope} onChange={(event) => onChange({ ...draft, scope: event.target.value })}>{scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label></div><label className="admin-check-field"><input type="checkbox" checked={draft.published} onChange={(event) => onChange({ ...draft, published: event.target.checked })} /><span>保存后立即发布</span></label></div><div className="admin-modal-foot"><span>{draft.published ? '状态：已发布' : '状态：草稿'}</span><div><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={onSave}><Save size={14} /> 保存公告</button></div></div></section></div>
}

export function AdminMemberModal({ draft, cohortOptions = [], directionOptions = [], onChange, onClose, onSave }: { draft: MemberDraft; cohortOptions?: string[]; directionOptions?: string[]; onChange: (draft: MemberDraft) => void; onClose: () => void; onSave: () => void }) {
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="admin-member-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">ACCOUNT / EDITOR</p><h2 id="admin-member-title">{draft.id ? '编辑成员资料' : '添加成员账号'}</h2><p>成员资料会同步到小组风采和项目协作卡片。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭成员编辑"><X size={16} /></button></div><div className="admin-editor-form"><div className="admin-editor-form-grid"><label><span>姓名</span><input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="成员姓名" autoFocus /></label><label><span>显示缩写</span><input value={draft.initials} maxLength={3} onChange={(event) => onChange({ ...draft, initials: event.target.value.toUpperCase() })} placeholder="例如 ZY" /></label></div><div className="admin-editor-form-grid"><label><span>角色</span><select value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value })}><option>项目成员</option><option>组员</option><option>负责人</option><option>组长</option></select></label><label><span>届次</span>{cohortOptions.length ? <select value={draft.cohort} onChange={(event) => onChange({ ...draft, cohort: event.target.value })}>{cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort} 届</option>)}</select> : <input value={draft.cohort} onChange={(event) => onChange({ ...draft, cohort: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2029" />}</label></div><label><span>小组方向</span>{directionOptions.length ? <select value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value })}><option value="">待补充</option>{directionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select> : <input value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value })} placeholder="算法组 / 项目组 / 网安组" />}</label><label><span>头像色调</span><div className="admin-accent-picker">{accents.map((accent) => <button type="button" className={`admin-accent-dot accent-${accent} ${draft.accent === accent ? 'active' : ''}`} key={accent} onClick={() => onChange({ ...draft, accent })} aria-label={`选择${accent}色`} />)}</div></label></div><div className="admin-modal-foot"><span><UserCog size={13} /> 角色权限由后台统一校验</span><div><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={onSave}><Check size={14} /> 保存成员</button></div></div></section></div>
}

export function AdminContentModal({ draft, onChange, onClose, onSave }: { draft: ContentDraft; onChange: (draft: ContentDraft) => void; onClose: () => void; onSave: () => void }) {
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="admin-content-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">CONTENT / EDITOR</p><h2 id="admin-content-title">编辑{draft.module}</h2><p>保存后会立即写入内容服务，并同步到对应公开页面。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭内容编辑"><X size={16} /></button></div><div className="admin-editor-form"><label><span>标题</span><input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder={`${draft.module}标题`} autoFocus /></label><label><span>描述</span><textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} rows={4} placeholder="补充内容简介和使用说明" /></label><div className="admin-editor-form-grid"><label><span>状态</span><select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value })}><option>草稿</option><option>已发布</option><option>已归档</option></select></label><label><span>可见范围</span><select value={draft.visibility} onChange={(event) => onChange({ ...draft, visibility: event.target.value as ContentDraft['visibility'] })}><option>全站公开</option><option>成员可见</option><option>组员可见</option></select></label></div></div><div className="admin-modal-foot"><span><Megaphone size={13} /> 保存后可继续编辑</span><div><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={onSave}><ArrowRight size={14} /> 保存内容</button></div></div></section></div>
}

export type AdminCollectionKind = '项目库' | '资源库' | '面经墙'

export type CollectionDraft = {
  kind: AdminCollectionKind
  id?: string
  title: string
  slug: string
  description: string
  intro: string
  githubUrl: string
  docsUrl: string
  demoUrl: string
  issueUrl: string
  coverImage: string
  status: string
  visibility: '全站公开' | '成员可见' | '组员可见'
  category: string
  stack: string
  year: string
  members: string
  stars: string
  difficulty: string
  accent: string
  icon: string
  featured: boolean
  memberIds: string[]
  joinEnabled: boolean
  joinNote: string
  milestones: ProjectMilestone[]
  logs: ProjectLogEntry[]
  type: string
  tags: string
  author: string
  views: string
  updated: string
  company: string
  role: string
  cohort: string
  date: string
  rounds: string
  summary: string
}

function collectionIcon(kind: AdminCollectionKind) {
  if (kind === '项目库') return Rocket
  if (kind === '资源库') return Folder
  return MessageCircle
}

function ProjectDetailEditor({ draft, update, members }: { draft: CollectionDraft; update: (patch: Partial<CollectionDraft>) => void; members: Member[] }) {
  const [uploadError, setUploadError] = React.useState('')
  const updateMilestone = (id: string, patch: Partial<ProjectMilestone>) => update({ milestones: draft.milestones.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const addMilestone = () => update({ milestones: [...draft.milestones, { id: `milestone-${Date.now()}`, year: String(new Date().getFullYear()), title: '', summary: '', status: '计划中' }] })
  const removeMilestone = (id: string) => update({ milestones: draft.milestones.filter((item) => item.id !== id) })
  const updateLog = (id: string, patch: Partial<ProjectLogEntry>) => update({ logs: draft.logs.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const addLog = () => update({ logs: [...draft.logs, { id: `log-${Date.now()}`, date: new Date().toLocaleDateString('zh-CN'), title: '', detail: '', author: '', authorInitials: '' }] })
  const removeLog = (id: string) => update({ logs: draft.logs.filter((item) => item.id !== id) })
  const toggleMember = (id: string) => update({ memberIds: draft.memberIds.includes(id) ? draft.memberIds.filter((memberId) => memberId !== id) : [...draft.memberIds, id] })
  const uploadCover = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!isSupportedImage(file)) { setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。'); event.target.value = ''; return } setUploadError(''); const reader = new FileReader(); reader.onerror = () => setUploadError('封面读取失败，请重新选择文件。'); reader.onload = () => { update({ coverImage: String(reader.result) }); event.target.value = '' }; reader.readAsDataURL(file) }
  return <>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT PROFILE</p><h3>项目详情与入口</h3></div><span>公开页面同步</span></div><div className="admin-editor-form-grid"><label><span>项目地址标识</span><input value={draft.slug} onChange={(event) => update({ slug: event.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() })} placeholder="例如：ai-campus" /></label><label><span>GitHub 地址</span><input type="url" value={draft.githubUrl} onChange={(event) => update({ githubUrl: event.target.value })} placeholder="https://github.com/..." /></label></div><div className="admin-editor-form-grid"><label><span>项目文档地址</span><input type="url" value={draft.docsUrl} onChange={(event) => update({ docsUrl: event.target.value })} placeholder="https://... 或 #/resources/..." /></label><label><span>在线演示地址</span><input type="url" value={draft.demoUrl} onChange={(event) => update({ demoUrl: event.target.value })} placeholder="https://..." /></label></div><label><span>Issue / 反馈地址</span><input type="url" value={draft.issueUrl} onChange={(event) => update({ issueUrl: event.target.value })} placeholder="https://github.com/.../issues" /></label><label><span>项目完整介绍</span><textarea value={draft.intro} onChange={(event) => update({ intro: event.target.value })} rows={4} placeholder="介绍项目目标、解决的问题、使用方式和当前进展" /></label><div className="admin-project-cover-editor"><div className="admin-project-cover-preview">{draft.coverImage ? <img src={draft.coverImage} alt="项目封面预览" /> : <Rocket size={22} />}</div><div><strong>项目封面</strong><small>用于项目卡片与详情页，可上传 JPG、PNG 或 WebP。</small>{uploadError && <small className="admin-upload-error">{uploadError}</small>}<input id="admin-project-cover" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} /><label className="secondary-button admin-small-button" htmlFor="admin-project-cover">{draft.coverImage ? '更换封面' : '上传封面'}</label>{draft.coverImage && <button type="button" className="admin-link-button admin-danger-link" onClick={() => update({ coverImage: '' })}>移除封面</button>}</div></div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT HISTORY</p><h3>项目族谱</h3></div><button type="button" className="secondary-button admin-small-button" onClick={addMilestone}><Plus size={14} /> 添加阶段</button></div><div className="admin-project-repeat-list">{draft.milestones.map((item) => <article className="admin-project-repeat-card" key={item.id}><div className="admin-editor-form-grid"><label><span>年份</span><input value={item.year} onChange={(event) => updateMilestone(item.id, { year: event.target.value })} placeholder="2026" /></label><label><span>阶段状态</span><select value={item.status ?? '计划中'} onChange={(event) => updateMilestone(item.id, { status: event.target.value as ProjectMilestone['status'] })}><option>已完成</option><option>进行中</option><option>计划中</option></select></label></div><label><span>阶段名称</span><input value={item.title} onChange={(event) => updateMilestone(item.id, { title: event.target.value })} placeholder="例如：Agent v3" /></label><label><span>阶段说明</span><input value={item.summary} onChange={(event) => updateMilestone(item.id, { summary: event.target.value })} placeholder="技术栈、产出或版本说明" /></label><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeMilestone(item.id)}><Trash2 size={13} /> 删除阶段</button></article>)}{draft.milestones.length === 0 && <div className="admin-empty admin-project-repeat-empty"><Route size={18} /><span>还没有项目阶段，点击“添加阶段”开始记录。</span></div>}</div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">SHIP LOG</p><h3>开发日志</h3></div><button type="button" className="secondary-button admin-small-button" onClick={addLog}><Plus size={14} /> 添加日志</button></div><div className="admin-project-repeat-list">{draft.logs.map((item) => <article className="admin-project-repeat-card" key={item.id}><div className="admin-editor-form-grid"><label><span>日期</span><input value={item.date} onChange={(event) => updateLog(item.id, { date: event.target.value })} placeholder="05-16" /></label><label><span>作者</span><input value={item.author ?? ''} onChange={(event) => updateLog(item.id, { author: event.target.value })} placeholder="成员姓名" /></label></div><label><span>日志标题</span><input value={item.title} onChange={(event) => updateLog(item.id, { title: event.target.value })} placeholder="完成了什么" /></label><label><span>日志内容</span><textarea value={item.detail} onChange={(event) => updateLog(item.id, { detail: event.target.value })} rows={2} placeholder="补充改动内容和影响" /></label><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeLog(item.id)}><Trash2 size={13} /> 删除日志</button></article>)}{draft.logs.length === 0 && <div className="admin-empty admin-project-repeat-empty"><ScrollText size={18} /><span>还没有开发日志，点击“添加日志”开始记录。</span></div>}</div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT CREW</p><h3>协作成员与招募</h3></div><span>{draft.memberIds.length} 人已加入</span></div><div className="admin-member-picker">{members.map((member) => <label key={member.id}><input type="checkbox" checked={draft.memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} /><span><strong>{member.name}</strong><small>{member.cohort} · {member.direction}</small></span></label>)}{members.length === 0 && <small>暂无成员资料，请先在成员账号中添加成员。</small>}</div><label className="admin-check-field"><input type="checkbox" checked={draft.joinEnabled} onChange={(event) => update({ joinEnabled: event.target.checked })} /><span>开放项目加入申请</span></label><label><span>招募说明</span><input value={draft.joinNote} onChange={(event) => update({ joinNote: event.target.value })} placeholder="例如：欢迎熟悉 Python、前端或知识库方向的成员参与" /></label></section>
  </>
}

export function createCollectionDraft(kind: AdminCollectionKind, item?: Project | Resource | InterviewExperience, defaults: { author?: string; cohort?: string } = {}): CollectionDraft {
  const base: CollectionDraft = {
    kind,
    id: item?.id,
    title: '',
    slug: '',
    description: '',
    intro: '',
    githubUrl: '',
    docsUrl: '',
    demoUrl: '',
    issueUrl: '',
    coverImage: '',
    status: kind === '项目库' ? '维护中' : '已发布',
    visibility: item?.visibility === 'contributors' ? '组员可见' : item?.visibility === 'members' ? '成员可见' : '全站公开',
    category: '',
    stack: '',
    year: String(new Date().getFullYear()),
    members: '0',
    stars: '0',
    difficulty: '1',
    accent: 'blue',
    icon: 'rocket',
    featured: false,
    memberIds: [],
    joinEnabled: true,
    joinNote: '',
    milestones: [],
    logs: [],
    type: '文档',
    tags: '',
    author: defaults.author ?? '',
    views: '0',
    updated: new Date().toLocaleDateString('zh-CN'),
    company: '',
    role: '',
    cohort: defaults.cohort ?? '',
    date: new Date().toLocaleDateString('zh-CN'),
    rounds: '1',
    summary: '',
  }
  if (kind === '项目库') {
    const project = item as Project | undefined
    return { ...base, title: project?.name ?? '', slug: project?.slug ?? '', description: project?.description ?? '', intro: project?.intro ?? project?.description ?? '', githubUrl: project?.githubUrl ?? '', docsUrl: project?.docsUrl ?? '', demoUrl: project?.demoUrl ?? '', issueUrl: project?.issueUrl ?? '', coverImage: project?.coverImage ?? '', status: project?.status ?? base.status, category: project?.category ?? '科技小组', stack: project?.stack.join(', ') ?? '', year: String(project?.year ?? base.year), members: String(project?.members ?? 0), stars: String(project?.stars ?? 0), difficulty: String(project?.difficulty ?? 1), accent: project?.accent ?? 'blue', icon: project?.icon ?? 'rocket', featured: Boolean(project?.featured), memberIds: [...(project?.memberIds ?? [])], joinEnabled: project?.joinEnabled !== false, joinNote: project?.joinNote ?? '', milestones: (project?.milestones ?? []).map((milestone) => ({ ...milestone })), logs: (project?.logs ?? []).map((log) => ({ ...log })) }
  }
  if (kind === '资源库') {
    const resource = item as Resource | undefined
    return { ...base, title: resource?.title ?? '', description: resource?.description ?? '', category: resource?.category ?? '小组资料', type: resource?.type ?? '文档', tags: resource?.tags.join(', ') ?? '', author: resource?.author ?? base.author, views: String(resource?.views ?? 0), updated: resource?.updated ?? base.updated }
  }
  const interview = item as InterviewExperience | undefined
  return { ...base, title: interview?.role ?? '', description: interview?.summary ?? '', summary: interview?.summary ?? '', company: interview?.company ?? '', role: interview?.role ?? '', author: interview?.author ?? base.author, cohort: interview?.cohort ?? base.cohort, date: interview?.date ?? base.date, difficulty: interview?.difficulty ?? '中等', rounds: String(interview?.rounds ?? 1), tags: interview?.tags.join(', ') ?? '' }
}

export type LearningRouteDraft = {
  id: string
  title: string
  direction: string
  description: string
  nodes: LearningNode[]
  featuredProjectIds: string[]
}

export function createLearningRouteDraft(nodes: LearningNode[], route?: Partial<LearningRoute>): LearningRouteDraft {
  return { id: route?.id ?? 'pyagent', title: route?.title ?? 'PyAgent · 从基础到真实项目', direction: route?.direction ?? 'PyAgent', description: route?.description ?? '把 Python 能力带进一个可交付的 Agent 项目。', nodes: nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])] })), featuredProjectIds: [...(route?.featuredProjectIds ?? [])] }
}

export function AdminContentManagerModal({ kind, items, members = [], defaults, onClose, onSave, onDelete }: { kind: AdminCollectionKind; items: Project[] | Resource[] | InterviewExperience[]; members?: Member[]; defaults?: { author?: string; cohort?: string }; onClose: () => void; onSave: (draft: CollectionDraft) => void | { id: string } | Promise<void | { id: string }>; onDelete: (id: string) => void | Promise<boolean | void> }) {
  const [search, setSearch] = React.useState('')
  const [draft, setDraft] = React.useState<CollectionDraft>(() => createCollectionDraft(kind, items[0], defaults))
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; label: string } | null>(null)
  const [busyAction, setBusyAction] = React.useState<'save' | 'delete' | null>(null)
  const Icon = collectionIcon(kind)
  const visibleItems = items.filter((item) => {
    const label = kind === '项目库' ? (item as Project).name : kind === '资源库' ? (item as Resource).title : (item as InterviewExperience).role
    const detail = kind === '面经墙' ? (item as InterviewExperience).company : (item as Project | Resource).description
    return `${label} ${detail}`.toLowerCase().includes(search.toLowerCase())
  })
  const update = (patch: Partial<CollectionDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const choose = (item: Project | Resource | InterviewExperience) => setDraft(createCollectionDraft(kind, item, defaults))
  const addNew = () => setDraft(createCollectionDraft(kind, undefined, defaults))
  const title = kind === '项目库' ? '项目库' : kind === '资源库' ? '资源库' : '面经墙'
  const saveDraft = async () => {
    if (busyAction) return
    setBusyAction('save')
    try {
      const saved = await onSave(draft)
      if (saved?.id) setDraft((current) => ({ ...current, id: saved.id }))
    } finally {
      setBusyAction(null)
    }
  }
  const confirmDelete = async () => {
    if (!pendingDelete || busyAction) return
    setBusyAction('delete')
   try {
     await onDelete(pendingDelete.id)
      const replacement = items.find((item) => item.id !== pendingDelete.id)
      setDraft(createCollectionDraft(kind, replacement, defaults))
     setPendingDelete(null)
    } finally {
      setBusyAction(null)
    }
  }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-collection-modal" role="dialog" aria-modal="true" aria-labelledby="admin-collection-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">CONTENT / {kind === '项目库' ? 'PROJECTS' : kind === '资源库' ? 'RESOURCES' : 'INTERVIEWS'}</p><h2 id="admin-collection-title">管理{title}</h2><p>左侧选择已有内容，右侧编辑后保存，公开页面会同步更新。</p></div><button className="icon-button small" onClick={onClose} aria-label={`关闭${title}管理`}><X size={16} /></button></div>
    <div className="admin-collection-layout"><aside className="admin-collection-list"><button type="button" className="admin-collection-new" onClick={addNew}><Plus size={14} /> 新建{kind === '项目库' ? '项目' : kind === '资源库' ? '资源' : '面经'}</button><div className="admin-collection-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${title}`} /></div><div className="admin-structure-list">{visibleItems.map((item) => { const itemTitle = kind === '项目库' ? (item as Project).name : kind === '资源库' ? (item as Resource).title : (item as InterviewExperience).role; const itemNote = kind === '面经墙' ? (item as InterviewExperience).company : (item as Project | Resource).category; return <button type="button" key={item.id} className={draft.id === item.id ? 'active' : ''} onClick={() => choose(item)}><strong>{itemTitle || '未命名内容'}</strong><small>{itemNote || '待补充'} · {item.id === draft.id ? '正在编辑' : '点击编辑'}</small></button> })}{visibleItems.length === 0 && <div className="admin-empty admin-collection-empty"><Icon size={20} /><span>还没有匹配内容</span></div>}</div></aside>
      <div className="admin-collection-editor"><div className="admin-editor-form">
        <div className="admin-editor-form-grid"><label><span>{kind === '项目库' ? '项目名称' : kind === '资源库' ? '资源标题' : '岗位名称'}</span><input value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="输入公开展示名称" autoFocus /></label>{kind === '面经墙' ? <label><span>公司 / 组织</span><input value={draft.company} onChange={(event) => update({ company: event.target.value })} placeholder="例如：字节跳动" /></label> : <label><span>分类</span><input value={draft.category} onChange={(event) => update({ category: event.target.value })} placeholder={kind === '项目库' ? 'AI / Web / 算法' : '课程 / 文档 / 工具'} /></label>}</div>
        {kind === '项目库' && <><label><span>项目简介</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={3} placeholder="说明项目要解决的问题和当前进展" /></label><div className="admin-editor-form-grid"><label><span>技术栈（逗号分隔）</span><input value={draft.stack} onChange={(event) => update({ stack: event.target.value })} placeholder="Python, FastAPI, React" /></label><label><span>状态</span><select value={draft.status} onChange={(event) => update({ status: event.target.value })}><option>招募中</option><option>维护中</option><option>已归档</option></select></label></div><div className="admin-editor-form-grid"><label><span>年份</span><input type="number" value={draft.year} onChange={(event) => update({ year: event.target.value })} /></label><label><span>参与人数</span><input type="number" min="0" value={draft.members} onChange={(event) => update({ members: event.target.value })} /></label></div><div className="admin-editor-form-grid"><label><span>社区星标</span><input type="number" min="0" value={draft.stars} onChange={(event) => update({ stars: event.target.value })} /></label><label><span>难度（1—5）</span><input type="number" min="1" max="5" value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value })} /></label></div><label className="admin-check-field"><input type="checkbox" checked={draft.featured} onChange={(event) => update({ featured: event.target.checked })} /><span>设为工具页推荐项目</span></label><ProjectDetailEditor draft={draft} update={update} members={members} /></>}
        {kind === '资源库' && <><label><span>资源简介</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={3} placeholder="说明这份资料适合谁、如何使用" /></label><div className="admin-editor-form-grid"><label><span>资源类型</span><select value={draft.type} onChange={(event) => update({ type: event.target.value })}><option>文档</option><option>视频</option><option>课程</option><option>链接</option><option>工具</option></select></label><label><span>作者 / 贡献者</span><input value={draft.author} onChange={(event) => update({ author: event.target.value })} placeholder="填写贡献者" /></label></div><label><span>标签（逗号分隔）</span><input value={draft.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="Python, 入门, 推荐" /></label></>}
        {kind === '面经墙' && <><label><span>面试总结</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value, summary: event.target.value })} rows={3} placeholder="记录流程、重点问题和复盘建议" /></label><div className="admin-editor-form-grid"><label><span>作者</span><input value={draft.author} onChange={(event) => update({ author: event.target.value })} /></label><label><span>届次</span><input value={draft.cohort} onChange={(event) => update({ cohort: event.target.value })} placeholder="2029 届" /></label></div><div className="admin-editor-form-grid"><label><span>面试日期</span><input value={draft.date} onChange={(event) => update({ date: event.target.value })} /></label><label><span>难度</span><select value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value })}><option>简单</option><option>中等</option><option>困难</option></select></label></div><div className="admin-editor-form-grid"><label><span>面试轮次</span><input type="number" min="1" value={draft.rounds} onChange={(event) => update({ rounds: event.target.value })} /></label><label><span>标签（逗号分隔）</span><input value={draft.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="八股, 项目, 反问" /></label></div></>}
        <div className="admin-editor-form-grid"><label><span>可见范围</span><select value={draft.visibility} onChange={(event) => update({ visibility: event.target.value as CollectionDraft['visibility'] })}><option>全站公开</option><option>成员可见</option><option>组员可见</option></select></label><label><span>{kind === '项目库' ? '视觉色调' : '更新时间'}</span>{kind === '项目库' ? <select value={draft.accent} onChange={(event) => update({ accent: event.target.value })}>{accents.map((accent) => <option key={accent} value={accent}>{accent}</option>)}</select> : <input value={draft.updated} onChange={(event) => update({ updated: event.target.value })} />}</label></div>
      </div></div></div>
    <div className="admin-modal-foot"><span>{draft.id ? '已保存后可继续编辑' : '新内容尚未保存'}</span><div className="admin-modal-actions">{draft.id && <button className="admin-link-button admin-danger-link" disabled={Boolean(busyAction)} onClick={() => setPendingDelete({ id: draft.id!, label: draft.title || '这条内容' })}><Trash2 size={13} /> 删除</button>}<button className="secondary-button admin-small-button" disabled={Boolean(busyAction)} onClick={onClose}>取消</button><button className="primary-button admin-small-button" disabled={Boolean(busyAction)} onClick={() => void saveDraft()}><Save size={14} /> {busyAction === 'save' ? '保存中…' : `保存${title}`}</button></div></div>
  </section>{pendingDelete && <div className="admin-delete-confirm-scrim" role="presentation" onClick={() => setPendingDelete(null)}><section className="admin-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-confirm-title" onClick={(event) => event.stopPropagation()}><div className="admin-delete-confirm-head"><span className="admin-delete-confirm-icon"><Trash2 size={17} /></span><div><p className="eyebrow">DANGER ZONE / DELETE</p><h3 id="admin-delete-confirm-title">删除{title}内容？</h3></div></div><p>将删除“{pendingDelete.label}”，公开页面也会同步移除。这个操作无法撤销。</p><div className="admin-delete-confirm-actions"><button type="button" className="secondary-button admin-small-button" disabled={busyAction === 'delete'} onClick={() => setPendingDelete(null)}>保留内容</button><button type="button" className="admin-danger-button admin-small-button" disabled={busyAction === 'delete'} onClick={() => void confirmDelete()}><Trash2 size={14} /> {busyAction === 'delete' ? '删除中…' : '确认删除'}</button></div></section></div>}</div>
}

export function AdminLearningRouteModal({ draft: initialDraft, routes = [], projects = [], onClose, onSave, onDelete, onSelectRoute, onNewRoute }: { draft: LearningRouteDraft; routes?: LearningRoute[]; projects?: Project[]; onClose: () => void; onSave: (draft: LearningRouteDraft) => void; onDelete?: (id: string) => void; onSelectRoute?: (id: string) => void; onNewRoute?: () => void }) {
  const [draft, setDraft] = React.useState<LearningRouteDraft>(() => ({ ...initialDraft, nodes: initialDraft.nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])] })), featuredProjectIds: [...(initialDraft.featuredProjectIds ?? [])] }))
  React.useLayoutEffect(() => {
    setDraft({ ...initialDraft, nodes: initialDraft.nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])] })), featuredProjectIds: [...(initialDraft.featuredProjectIds ?? [])] })
  }, [initialDraft.id])
  const routeList = draft.id.startsWith('new-route-')
    ? [...routes, { id: draft.id, title: draft.title, direction: draft.direction, description: draft.description, nodes: draft.nodes, featuredProjectIds: draft.featuredProjectIds }]
    : routes
  const updateNode = (id: string, patch: Partial<LearningNode>) => setDraft((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) }))
  const addNode = () => setDraft((current) => ({ ...current, nodes: [...current.nodes, { id: `node-${Date.now()}`, title: '', duration: '2 周', resources: 0, projects: 0, description: '', projectIds: [] }] }))
  const removeNode = (id: string) => setDraft((current) => ({ ...current, nodes: current.nodes.filter((node) => node.id !== id) }))
  const toggleProject = (ids: string[], projectId: string) => ids.includes(projectId) ? ids.filter((id) => id !== projectId) : [...ids, projectId]
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-learning-modal" role="dialog" aria-modal="true" aria-labelledby="admin-learning-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">LEARNING / ROUTE BUILDER</p><h2 id="admin-learning-title">编辑学习路线</h2><p>按方向维护路线，再给每个节点绑定真实项目；右侧项目入口也从这里配置。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭学习路线编辑"><X size={16} /></button></div>
    <div className="learning-editor-layout">    <div className="learning-editor-sidebar"><div className="learning-editor-sidebar-head"><div><span className="eyebrow">ROUTES</span><strong>路线目录</strong></div>{onNewRoute && <button type="button" className="icon-button small" onClick={onNewRoute} aria-label="新建学习方向"><Plus size={15} /></button>}</div>{onNewRoute && <button type="button" className="learning-editor-new" onClick={onNewRoute}><Plus size={14} /> 新建方向</button>}<div className="learning-editor-route-list">{routeList.map((route) => <button type="button" key={route.id} className={route.id === draft.id ? 'active' : ''} onClick={() => { if (!route.id.startsWith('new-route-')) onSelectRoute?.(route.id) }}><span className="learning-editor-route-icon"><Route size={14} /></span><span><strong>{route.direction || route.title}</strong><small>{route.nodes.length} 个节点{route.id.startsWith('new-route-') ? ' · 正在编辑' : ''}</small></span><ChevronRight size={14} /></button>)}{routeList.length === 0 && <div className="learning-editor-sidebar-empty"><Route size={18} /><span>还没有路线</span></div>}</div><div className="learning-editor-sidebar-tip"><Sparkles size={15} /><span>每条路线可以绑定不同项目，成员按方向查看。</span></div></div>
    <div className="learning-editor-main"><div className="learning-editor-main-head"><div className="learning-editor-main-head-copy"><div><span className="eyebrow">CURRENT ROUTE</span><h3>{draft.direction || '未命名方向'}</h3></div><span className="learning-editor-count">{draft.nodes.length} 个学习节点</span></div><div className="learning-editor-route-actions">{onDelete && (draft.id.startsWith('new-route-') || draft.id !== 'pyagent') && <button type="button" className="admin-link-button admin-danger-link learning-editor-delete-button" onClick={() => onDelete(draft.id)}><Trash2 size={13} /> {draft.id.startsWith('new-route-') ? '取消新建' : '删除路线'}</button>}{draft.id === 'pyagent' && <span className="admin-route-protected">默认路线</span>}<button type="button" className="secondary-button admin-small-button" onClick={onClose}>取消编辑</button><button type="button" className="primary-button admin-small-button" onClick={() => onSave(draft)}><Save size={14} /> 保存当前方向</button></div></div>    <div className="admin-editor-form"><div className="admin-editor-form-grid"><label><span>方向名称</span><input value={draft.direction} onChange={(event) => setDraft({ ...draft, direction: event.target.value })} placeholder="例如：前端" /></label><label><span>路线名称</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /></label></div><label><span>路线简介</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="说明这条路线适合谁，以及最终能完成什么" /></label>
      <div className="admin-route-featured-picker"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT ENTRY</p><h3>路线右侧项目入口</h3></div><span>可多选</span></div><div className="admin-project-picker">{projects.map((project) => <label key={project.id}><input type="checkbox" checked={draft.featuredProjectIds.includes(project.id)} onChange={() => setDraft({ ...draft, featuredProjectIds: toggleProject(draft.featuredProjectIds, project.id) })} /><span><strong>{project.name}</strong><small>{project.category} · {project.status}</small></span></label>)}</div>{projects.length === 0 && <small>项目库暂无可展示项目，请先添加项目。</small>}</div>
      <div className="admin-route-node-head"><div><p className="eyebrow">ROUTE NODES</p><h3>学习节点</h3></div><button className="secondary-button admin-small-button" onClick={addNode}><Plus size={14} /> 添加节点</button></div><div className="admin-route-nodes">{draft.nodes.map((node, index) => <article className="admin-route-node" key={node.id}><div className="admin-route-node-index">{String(index + 1).padStart(2, '0')}</div><div className="admin-route-node-fields"><div className="admin-editor-form-grid"><label><span>节点标题</span><input value={node.title} onChange={(event) => updateNode(node.id, { title: event.target.value })} placeholder="例如：Python 基础与工程习惯" /></label><label><span>预计时长</span><input value={node.duration} onChange={(event) => updateNode(node.id, { duration: event.target.value })} placeholder="2 周" /></label></div><div className="admin-editor-form-grid"><label><span>资源数</span><input type="number" min="0" value={node.resources} onChange={(event) => updateNode(node.id, { resources: Number(event.target.value) || 0 })} /></label><label><span>项目数</span><input type="number" min="0" value={node.projects} onChange={(event) => updateNode(node.id, { projects: Number(event.target.value) || 0 })} /></label></div><label><span>节点说明</span><textarea value={node.description ?? ''} onChange={(event) => updateNode(node.id, { description: event.target.value })} rows={2} placeholder="写清本阶段的产出和验收方式" /></label><div className="admin-node-project-picker"><span>节点项目入口</span><div className="admin-project-picker compact">{projects.map((project) => <label key={project.id}><input type="checkbox" checked={(node.projectIds ?? []).includes(project.id)} onChange={() => updateNode(node.id, { projectIds: toggleProject(node.projectIds ?? [], project.id) })} /><span>{project.name}</span></label>)}</div></div></div><button type="button" className="admin-route-node-remove admin-danger-link" onClick={() => removeNode(node.id)} aria-label={`删除第 ${index + 1} 个学习节点`}><Trash2 size={14} /></button></article>)}</div>{draft.nodes.length === 0 && <div className="admin-empty admin-route-empty"><Route size={20} /><strong>还没有学习节点</strong><span>点击“添加节点”，从第一阶段开始搭建路线。</span></div>}</div>
     <div className="admin-modal-foot"><span><Route size={13} /> {draft.nodes.length} 个节点 · 保存后学习路线页面同步</span></div>
    </div>
    </div>  </section></div>
}
