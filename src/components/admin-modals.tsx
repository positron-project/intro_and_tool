import * as React from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronRight, CloudDownload, Eye, EyeOff, FileText, Folder, GripVertical, MessageCircle, Megaphone, PlayCircle, Plus, Rocket, Route, Save, ScrollText, Search, SlidersHorizontal, Sparkles, Tag, Trash2, UserCog, X } from 'lucide-react'
import type { Announcement, AnnouncementCategory, ContentCategory, InterviewExperience, LearningLink, LearningNode, LearningRoute, Member, Project, ProjectCategory, ProjectLogEntry, ProjectMilestone, Resource, ResourceAttachment, ResourceLink, WorkbenchFeedItem, WorkbenchSettings } from '../types'
import { ResourceLinksEditor } from './ResourceLinksEditor'
import { useContent } from '../services/content.context'
import { apiConfig } from '../services/api-client'
import { MAX_RESOURCE_ATTACHMENTS, uploadAsset, validateResourceAttachmentFiles } from '../services/upload.service'
import { initialsFromName } from '../utils/identity'
import { isProjectMemberSelected, normalizeProjectMemberIds, toggleProjectMember } from '../utils/project-members'
import { requestAppConfirmation } from './AppConfirmation'
import { LearningMarkdownField } from './LearningMarkdownField'

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
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="admin-member-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">ACCOUNT / EDITOR</p><h2 id="admin-member-title">{draft.id ? '编辑成员资料' : '添加成员账号'}</h2><p>成员资料会同步到小组风采和项目协作卡片。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭成员编辑"><X size={16} /></button></div><div className="admin-editor-form"><div className="admin-editor-form-grid"><label><span>姓名</span><input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="成员姓名" autoFocus /></label><label><span>头像缩写</span><input value={initialsFromName(draft.name) || draft.initials} readOnly aria-readonly="true" /></label></div><div className="admin-editor-form-grid"><label><span>角色</span><select value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value })}><option>项目成员</option><option>组员</option><option>负责人</option><option>组长</option></select></label><label><span>届次</span>{cohortOptions.length ? <select value={draft.cohort} onChange={(event) => onChange({ ...draft, cohort: event.target.value })}>{cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort} 届</option>)}</select> : <input value={draft.cohort} onChange={(event) => onChange({ ...draft, cohort: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2029" />}</label></div><label><span>小组方向</span>{directionOptions.length ? <select value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value })}><option value="">待补充</option>{directionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select> : <input value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value })} placeholder="算法组 / 项目组 / 网安组" />}</label><label><span>头像色调</span><div className="admin-accent-picker">{accents.map((accent) => <button type="button" className={`admin-accent-dot accent-${accent} ${draft.accent === accent ? 'active' : ''}`} key={accent} onClick={() => onChange({ ...draft, accent })} aria-label={`选择${accent}色`} />)}</div></label></div><div className="admin-modal-foot"><span><UserCog size={13} /> 角色权限由后台统一校验</span><div><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={onSave}><Check size={14} /> 保存成员</button></div></div></section></div>
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
  downloadUrl: string
  coverImage: string
  galleryImages: string
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
  accessMode: 'external_link' | 'attachment' | 'article'
  resourceUrl: string
  links: ResourceLink[]
  attachments: ResourceAttachment[]
  content: string
  resourceStatus: 'draft' | 'pending' | 'published' | 'archived' | 'offline'
  sourceName: string
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
  const [memberQuery, setMemberQuery] = React.useState('')
  const updateMilestone = (id: string, patch: Partial<ProjectMilestone>) => update({ milestones: draft.milestones.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const createMilestone = (): ProjectMilestone => ({ id: `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, year: String(new Date().getFullYear()), title: '', summary: '', status: '计划中' })
  const addMilestone = () => update({ milestones: [...draft.milestones, createMilestone()] })
  const addMilestoneAfter = (id: string) => {
    const index = draft.milestones.findIndex((item) => item.id === id)
    if (index < 0) return
    const milestones = [...draft.milestones]
    milestones.splice(index + 1, 0, createMilestone())
    update({ milestones })
  }
  const removeMilestone = async (id: string) => {
    const milestone = draft.milestones.find((item) => item.id === id)
    if (!milestone) return
    const hasContent = Boolean(milestone.title.trim() || milestone.summary.trim() || milestone.year !== String(new Date().getFullYear()) || (milestone.status && milestone.status !== '计划中'))
    if (hasContent) {
      const confirmed = await requestAppConfirmation({
        title: '删除项目阶段',
        message: `确定删除“${milestone.title.trim() || milestone.year + ' 年阶段'}”吗？删除后需要保存项目才会生效。`,
        confirmLabel: '删除阶段',
        tone: 'danger',
      })
      if (!confirmed) return
    }
    update({ milestones: draft.milestones.filter((item) => item.id !== id) })
  }
  const updateLog = (id: string, patch: Partial<ProjectLogEntry>) => update({ logs: draft.logs.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const addLog = () => update({ logs: [...draft.logs, { id: `log-${Date.now()}`, date: new Date().toLocaleDateString('zh-CN'), title: '', detail: '', author: '', authorInitials: '' }] })
  const removeLog = (id: string) => update({ logs: draft.logs.filter((item) => item.id !== id) })
  const toggleMember = (member: Member) => {
    const memberIds = toggleProjectMember(draft.memberIds, member, members)
    update({ memberIds, members: String(memberIds.length) })
  }
  const normalizedMemberQuery = memberQuery.trim().toLocaleLowerCase()
  const filteredMembers = members.filter((member) => !normalizedMemberQuery || `${member.name} ${member.cohort} ${member.direction}`.toLocaleLowerCase().includes(normalizedMemberQuery))
  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!isSupportedImage(file)) { setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。'); event.target.value = ''; return } setUploadError(''); if (apiConfig.contentSource === 'api') { try { const asset = await uploadAsset(file, { folder: 'projects', alt: draft.title.trim() || '项目封面' }); update({ coverImage: asset.url }); } catch (error) { setUploadError(error instanceof Error ? error.message : '封面上传失败，请稍后重试。') } finally { event.target.value = '' } return } const reader = new FileReader(); reader.onerror = () => setUploadError('封面读取失败，请重新选择文件。'); reader.onload = () => { update({ coverImage: String(reader.result) }); event.target.value = '' }; reader.readAsDataURL(file) }
  return <>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT PROFILE</p><h3>项目详情与入口</h3></div><span>公开页面同步</span></div><div className="admin-editor-form-grid"><label><span>项目地址标识</span><input value={draft.slug} onChange={(event) => update({ slug: event.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() })} placeholder="例如：ai-campus" /></label><label><span>GitHub 地址</span><input type="url" value={draft.githubUrl} onChange={(event) => update({ githubUrl: event.target.value })} placeholder="https://github.com/..." /></label></div><div className="admin-editor-form-grid"><label><span>项目文档地址</span><input type="url" value={draft.docsUrl} onChange={(event) => update({ docsUrl: event.target.value })} placeholder="https://... 或 #/resources/..." /></label><label><span>在线演示地址</span><input type="url" value={draft.demoUrl} onChange={(event) => update({ demoUrl: event.target.value })} placeholder="https://..." /></label></div><label><span>Issue / 反馈地址</span><input type="url" value={draft.issueUrl} onChange={(event) => update({ issueUrl: event.target.value })} placeholder="https://github.com/.../issues" /></label><label><span>项目完整介绍</span><textarea value={draft.intro} onChange={(event) => update({ intro: event.target.value })} rows={4} placeholder="介绍项目目标、解决的问题、使用方式和当前进展" /></label><div className="admin-project-cover-editor"><div className="admin-project-cover-preview">{draft.coverImage ? <img src={draft.coverImage} alt="项目封面预览" /> : <Rocket size={22} />}</div><div><strong>项目封面</strong><small>用于项目卡片与详情页，可上传 JPG、PNG 或 WebP。</small>{uploadError && <small className="admin-upload-error">{uploadError}</small>}<input id="admin-project-cover" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} /><label className="secondary-button admin-small-button" htmlFor="admin-project-cover">{draft.coverImage ? '更换封面' : '上传封面'}</label>{draft.coverImage && <button type="button" className="admin-link-button admin-danger-link" onClick={() => update({ coverImage: '' })}>移除封面</button>}</div></div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT HISTORY</p><h3>项目族谱</h3></div><button type="button" className="secondary-button admin-small-button" onClick={addMilestone}><Plus size={14} /> 添加阶段</button></div><div className="admin-project-repeat-list">{draft.milestones.map((item, index) => <article className="admin-project-repeat-card" key={item.id}><div className="admin-project-milestone-actions"><span>阶段 {String(index + 1).padStart(2, '0')}</span><div><button type="button" className="admin-link-button" onClick={() => addMilestoneAfter(item.id)} aria-label={`在第 ${index + 1} 个项目阶段下方添加阶段`}><Plus size={13} /> 下方添加</button><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeMilestone(item.id)} aria-label={`删除第 ${index + 1} 个项目阶段`}><Trash2 size={13} /> 删除阶段</button></div></div><div className="admin-editor-form-grid"><label><span>年份</span><input value={item.year} onChange={(event) => updateMilestone(item.id, { year: event.target.value })} placeholder="2026" /></label><label><span>阶段状态</span><select value={item.status ?? '计划中'} onChange={(event) => updateMilestone(item.id, { status: event.target.value as ProjectMilestone['status'] })}><option>已完成</option><option>进行中</option><option>计划中</option></select></label></div><label><span>阶段名称</span><input value={item.title} onChange={(event) => updateMilestone(item.id, { title: event.target.value })} placeholder="例如：Agent v3" /></label><label><span>阶段说明</span><input value={item.summary} onChange={(event) => updateMilestone(item.id, { summary: event.target.value })} placeholder="技术栈、产出或版本说明" /></label></article>)}{draft.milestones.length === 0 && <div className="admin-empty admin-project-repeat-empty"><Route size={18} /><span>还没有项目阶段，点击“添加阶段”开始记录。</span></div>}</div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">SHIP LOG</p><h3>开发日志</h3></div><button type="button" className="secondary-button admin-small-button" onClick={addLog}><Plus size={14} /> 添加日志</button></div><div className="admin-project-repeat-list">{draft.logs.map((item) => <article className="admin-project-repeat-card" key={item.id}><div className="admin-editor-form-grid"><label><span>日期</span><input value={item.date} onChange={(event) => updateLog(item.id, { date: event.target.value })} placeholder="05-16" /></label><label><span>作者</span><input value={item.author ?? ''} onChange={(event) => updateLog(item.id, { author: event.target.value })} placeholder="成员姓名" /></label></div><label><span>日志标题</span><input value={item.title} onChange={(event) => updateLog(item.id, { title: event.target.value })} placeholder="完成了什么" /></label><label><span>日志内容</span><textarea value={item.detail} onChange={(event) => updateLog(item.id, { detail: event.target.value })} rows={2} placeholder="补充改动内容和影响" /></label><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeLog(item.id)}><Trash2 size={13} /> 删除日志</button></article>)}{draft.logs.length === 0 && <div className="admin-empty admin-project-repeat-empty"><ScrollText size={18} /><span>还没有开发日志，点击“添加日志”开始记录。</span></div>}</div></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT CREW</p><h3>协作成员与招募</h3></div><span>{draft.memberIds.length} 人已加入</span></div><label className="admin-search admin-project-member-search"><Search size={14} /><input type="search" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="搜索姓名、届次或方向" aria-label="搜索协作成员" />{memberQuery && <button type="button" className="admin-project-member-search-clear" onClick={() => setMemberQuery('')} aria-label="清除成员搜索"><X size={13} /></button>}</label><div className="admin-member-picker">{filteredMembers.map((member) => <label key={member.id}><input type="checkbox" checked={isProjectMemberSelected(draft.memberIds, member, members)} onChange={() => toggleMember(member)} /><span><strong>{member.name}</strong><small>{member.cohort} · {member.direction}</small></span></label>)}{members.length === 0 && <small>暂无成员资料，请先在成员账号中添加成员。</small>}{members.length > 0 && filteredMembers.length === 0 && <small className="admin-project-member-empty">没有匹配的成员，换个姓名、届次或方向试试。</small>}</div><label className="admin-check-field"><input type="checkbox" checked={draft.joinEnabled} onChange={(event) => update({ joinEnabled: event.target.checked })} /><span>开放项目加入申请</span></label><label><span>招募说明</span><input value={draft.joinNote} onChange={(event) => update({ joinNote: event.target.value })} placeholder="例如：欢迎熟悉 Python、前端或知识库方向的成员参与" /></label></section>
    <section className="admin-project-editor-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT DOWNLOAD</p><h3>项目文件</h3></div><span>可选</span></div><label><span>项目文件下载地址</span><input type="url" value={draft.downloadUrl} onChange={(event) => update({ downloadUrl: event.target.value })} placeholder="ZIP、安装包或其他文件地址" /></label></section>
  </>
}

export function createCollectionDraft(kind: AdminCollectionKind, item?: Project | Resource | InterviewExperience, defaults: { author?: string; cohort?: string } = {}, members: Member[] = []): CollectionDraft {
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
    downloadUrl: '',
    coverImage: '',
    galleryImages: '',
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
    accessMode: 'external_link',
    resourceUrl: '',
    links: [],
    attachments: [],
    content: '',
    resourceStatus: 'published',
    sourceName: '',
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
    const memberIds = normalizeProjectMemberIds(project?.memberIds ?? [], members)
    return { ...base, title: project?.name ?? '', slug: project?.slug ?? '', description: project?.description ?? '', intro: project?.intro ?? project?.description ?? '', githubUrl: project?.githubUrl ?? '', docsUrl: project?.docsUrl ?? '', demoUrl: project?.demoUrl ?? '', issueUrl: project?.issueUrl ?? '', downloadUrl: project?.downloadUrl ?? '', coverImage: project?.coverImage ?? '', galleryImages: (project?.galleryImages ?? []).join('\n'), status: project?.status ?? base.status, category: project?.category ?? '科技小组', stack: project?.stack.join(', ') ?? '', year: String(project?.year ?? base.year), members: String(memberIds.length || project?.members || 0), stars: String(project?.stars ?? 0), difficulty: String(project?.difficulty ?? 1), accent: project?.accent ?? 'blue', icon: project?.icon ?? 'rocket', featured: Boolean(project?.featured), memberIds, joinEnabled: project?.joinEnabled !== false, joinNote: project?.joinNote ?? '', milestones: (project?.milestones ?? []).map((milestone) => ({ ...milestone })), logs: (project?.logs ?? []).map((log) => ({ ...log })) }
  }
  if (kind === '资源库') {
    const resource = item as Resource | undefined
    return { ...base, title: resource?.title ?? '', description: resource?.description ?? '', category: resource?.category ?? '小组资料', type: resource?.type ?? 'article', tags: resource?.tags.join(', ') ?? '', author: resource?.author ?? base.author, views: String(resource?.views ?? 0), updated: resource?.updated ?? base.updated, accessMode: resource?.accessMode ?? (resource?.content ? 'article' : resource?.downloadUrl || resource?.attachments?.length ? 'attachment' : 'external_link'), resourceUrl: resource?.resourceUrl ?? '', links: resource?.links?.length ? resource.links.map((link) => ({ ...link })) : resource?.resourceUrl ? [{ title: '外部资源', url: resource.resourceUrl }] : [], attachments: (resource?.attachments ?? (resource?.downloadUrl ? [{ name: '资源附件', url: resource.downloadUrl }] : [])).map((attachment) => ({ ...attachment })), content: resource?.content ?? '', resourceStatus: resource?.status ?? 'published', sourceName: resource?.sourceName ?? '' }
  }
  const interview = item as InterviewExperience | undefined
  return { ...base, title: interview?.role ?? '', description: interview?.summary ?? '', summary: interview?.summary ?? '', category: interview?.category ?? '', company: interview?.company ?? '', role: interview?.role ?? '', author: interview?.author ?? base.author, cohort: interview?.cohort ?? base.cohort, date: interview?.date ?? base.date, difficulty: interview?.difficulty ?? '中等', rounds: String(interview?.rounds ?? 1), tags: interview?.tags.join(', ') ?? '' }
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
  return { id: route?.id ?? 'pyagent', title: route?.title ?? 'PyAgent · 从基础到真实项目', direction: route?.direction ?? 'PyAgent', description: route?.description ?? '把 Python 能力带进一个可交付的 Agent 项目。', nodes: nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])], resourceIds: [...(node.resourceIds ?? [])], cloudDriveLinks: [...(node.cloudDriveLinks ?? [])] })), featuredProjectIds: [...(route?.featuredProjectIds ?? [])] }
}

export function AdminContentManagerModal({ kind, items, members = [], defaults, categories = [], onOpenWorkbench, onManageCategories, onManagePrompts, onClose, onSave, onDelete }: { kind: AdminCollectionKind; items: Project[] | Resource[] | InterviewExperience[]; members?: Member[]; defaults?: { author?: string; cohort?: string }; categories?: ContentCategory[]; onOpenWorkbench?: () => void; onManageCategories?: () => void; onManagePrompts?: () => void; onClose: () => void; onSave: (draft: CollectionDraft) => void | { id: string } | Promise<void | { id: string }>; onDelete: (id: string) => void | Promise<boolean | void> }) {
  const { data: contentData } = useContent()
  const configuredCategories = categories.length ? categories : kind === '项目库' ? contentData.projectCategories : kind === '资源库' ? contentData.resourceCategories : contentData.interviewCategories
  const [search, setSearch] = React.useState('')
  const createFreshDraft = () => {
    const next = createCollectionDraft(kind, undefined, defaults, members)
    if (configuredCategories[0]) next.category = configuredCategories[0].key
    return next
  }
  const [draft, setDraft] = React.useState<CollectionDraft>(() => items[0] ? createCollectionDraft(kind, items[0], defaults, members) : createFreshDraft())
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; label: string } | null>(null)
  const [busyAction, setBusyAction] = React.useState<'save' | 'delete' | null>(null)
  const [resourceUploadBusy, setResourceUploadBusy] = React.useState(false)
  const [resourceUploadError, setResourceUploadError] = React.useState('')
  const Icon = collectionIcon(kind)
  const visibleItems = items.filter((item) => {
    const label = kind === '项目库' ? (item as Project).name : kind === '资源库' ? (item as Resource).title : (item as InterviewExperience).role
    const detail = kind === '面经墙' ? (item as InterviewExperience).company : (item as Project | Resource).description
    return `${label} ${detail}`.toLowerCase().includes(search.toLowerCase())
  })
  const update = (patch: Partial<CollectionDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const uploadResourceAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const validationError = validateResourceAttachmentFiles(files, draft.attachments.length)
    if (validationError) { setResourceUploadError(validationError); return }
    setResourceUploadBusy(true)
    setResourceUploadError('')
    const results = await Promise.allSettled(files.map((file) => uploadAsset(file, { folder: 'resources' })))
    const completed = results.flatMap((result, index) => result.status === 'fulfilled' ? [{ assetId: result.value.id, name: result.value.name || files[index].name, url: result.value.url, mimeType: result.value.mimeType, size: result.value.size, sortOrder: draft.attachments.length + index }] : [])
    if (completed.length) update({ attachments: [...draft.attachments, ...completed] })
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) {
      const firstReason = failures[0].status === 'rejected' ? failures[0].reason : undefined
      setResourceUploadError(firstReason instanceof Error ? firstReason.message : `${failures.length} 个文件上传失败，请重试`)
    }
    setResourceUploadBusy(false)
  }
  const choose = (item: Project | Resource | InterviewExperience) => setDraft(createCollectionDraft(kind, item, defaults, members))
  const addNew = () => setDraft(createFreshDraft())
  const title = kind === '项目库' ? '项目库' : kind === '资源库' ? '资源库' : '面经墙'
  const categoryOptions = [...configuredCategories.filter((category) => category.enabled), ...(draft.category && !configuredCategories.some((category) => category.key === draft.category) ? [{ id: 'legacy-category', key: draft.category, label: draft.category, accent: 'blue', icon: 'tag', order: 999, enabled: true }] : [])]
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
    <div className="admin-modal-head"><div><p className="eyebrow">CONTENT / {kind === '项目库' ? 'PROJECTS' : kind === '资源库' ? 'RESOURCES' : 'INTERVIEWS'}</p><h2 id="admin-collection-title">管理{title}</h2><p>左侧选择已有内容，右侧编辑后保存，公开页面会同步更新。</p></div><div className="admin-modal-head-actions">{onOpenWorkbench && <button type="button" className="admin-link-button" onClick={onOpenWorkbench}><SlidersHorizontal size={13} /> 首页展示规则</button>}{kind === '资源库' && onManagePrompts && <button type="button" className="admin-link-button" onClick={onManagePrompts}><Sparkles size={13} /> Prompt 模板</button>}{onManageCategories && <button type="button" className="admin-link-button" onClick={onManageCategories}><Tag size={13} /> 管理分类</button>}<button className="icon-button small" onClick={onClose} aria-label={`关闭${title}管理`}><X size={16} /></button></div></div>
    <div className="admin-collection-layout"><aside className="admin-collection-list"><button type="button" className="admin-collection-new" onClick={addNew}><Plus size={14} /> 新建{kind === '项目库' ? '项目' : kind === '资源库' ? '资源' : '面经'}</button><div className="admin-collection-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${title}`} /></div><div className="admin-structure-list">{visibleItems.map((item) => { const itemTitle = kind === '项目库' ? (item as Project).name : kind === '资源库' ? (item as Resource).title : (item as InterviewExperience).role; const itemNote = kind === '面经墙' ? (item as InterviewExperience).company : (item as Project | Resource).category; return <button type="button" key={item.id} className={draft.id === item.id ? 'active' : ''} onClick={() => choose(item)}><strong>{itemTitle || '未命名内容'}</strong><small>{itemNote || '待补充'} · {item.id === draft.id ? '正在编辑' : '点击编辑'}</small></button> })}{visibleItems.length === 0 && <div className="admin-empty admin-collection-empty"><Icon size={20} /><span>还没有匹配内容</span></div>}</div></aside>
      <div className="admin-collection-editor"><div className="admin-editor-form">
        <div className="admin-editor-form-grid"><label><span>{kind === '项目库' ? '项目名称' : kind === '资源库' ? '资源标题' : '岗位名称'}</span><input value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="输入公开展示名称" autoFocus /></label><label><span>分类</span>{categoryOptions.length ? <select value={draft.category} onChange={(event) => update({ category: event.target.value })}>{categoryOptions.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select> : <input value={draft.category} onChange={(event) => update({ category: event.target.value })} placeholder="先在分类设置中新增分类" />}</label></div>
        {kind === '面经墙' && <label><span>公司 / 组织</span><input value={draft.company} onChange={(event) => update({ company: event.target.value })} placeholder="例如：字节跳动" /></label>}
        {kind === '项目库' && <><label><span>项目简介</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={3} placeholder="说明项目要解决的问题和当前进展" /></label><div className="admin-editor-form-grid"><label><span>技术栈（逗号分隔）</span><input value={draft.stack} onChange={(event) => update({ stack: event.target.value })} placeholder="Python, FastAPI, React" /></label><label><span>状态</span><select value={draft.status} onChange={(event) => update({ status: event.target.value })}><option>招募中</option><option>维护中</option><option>已归档</option></select></label></div><div className="admin-editor-form-grid"><label><span>年份</span><input type="number" value={draft.year} onChange={(event) => update({ year: event.target.value })} /></label><label><span>协作成员数量（按列表自动统计）</span><input type="number" min="0" value={draft.members} readOnly /></label></div><div className="admin-editor-form-grid"><label><span>收藏数（兼容旧数据）</span><input type="number" min="0" value={draft.stars} onChange={(event) => update({ stars: event.target.value })} /></label><label><span>难度（1—5）</span><input type="number" min="1" max="5" value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value })} /></label></div><label className="admin-check-field"><input type="checkbox" checked={draft.featured} onChange={(event) => update({ featured: event.target.checked })} /><span>设为工具页推荐项目</span></label><label className="admin-project-gallery-input"><span>项目展示图片地址（每行一个）</span><textarea value={draft.galleryImages} onChange={(event) => update({ galleryImages: event.target.value })} rows={3} placeholder="https://.../screen-1.png\nhttps://.../screen-2.png" /><small>第一张图片会作为详情页主图；封面仍用于项目卡片。</small></label><ProjectDetailEditor draft={draft} update={update} members={members} /></>}
        {kind === '资源库' && <><label><span>资源简介</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={3} placeholder="说明这份资料适合谁、如何使用" /></label><div className="admin-editor-form-grid"><label><span>资源类型</span><select value={draft.type} onChange={(event) => update({ type: event.target.value })}><option value="article">文档 / 文章</option><option value="video">视频</option><option value="course">课程</option><option value="link">链接</option><option value="tool">工具</option><option value="repository">代码仓库</option><option value="file">文件</option></select></label><label><span>访问方式</span><select value={draft.accessMode} onChange={(event) => update({ accessMode: event.target.value as CollectionDraft['accessMode'] })}><option value="external_link">外部链接</option><option value="attachment">下载附件</option><option value="article">站内阅读</option></select></label></div><div className="admin-editor-form-grid"><label><span>发布状态</span><select value={draft.resourceStatus} onChange={(event) => update({ resourceStatus: event.target.value as CollectionDraft['resourceStatus'] })}><option value="draft">草稿</option><option value="pending">待审核</option><option value="published">已发布</option><option value="archived">已归档</option><option value="offline">已下线</option></select></label><label><span>作者 / 贡献者</span><input value={draft.author} onChange={(event) => update({ author: event.target.value })} placeholder="填写贡献者" /></label></div><label><span>来源署名（可选）</span><input value={draft.sourceName} onChange={(event) => update({ sourceName: event.target.value })} placeholder="例如：FastAPI 官方文档" /></label>{draft.accessMode === 'external_link' && <ResourceLinksEditor value={draft.links} onChange={(links) => update({ links })} />}{draft.accessMode === 'attachment' && <div className="resource-attachment-editor"><div className="resource-attachment-editor-head"><span>资源附件</span><small>最多 {MAX_RESOURCE_ATTACHMENTS} 个文件 · 单个不超过 20 MB</small></div><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.md,.png,.jpg,.jpeg,.webp" multiple disabled={resourceUploadBusy || apiConfig.contentSource !== 'api'} onChange={(event) => void uploadResourceAttachments(event)} /><small>{resourceUploadBusy ? '正在上传附件…' : apiConfig.contentSource === 'api' ? '选择文件后立即上传到文件存储，保存资源时关联附件。' : '连接后端后可上传文件。'}</small>{resourceUploadError && <small className="admin-upload-error">{resourceUploadError}</small>}{draft.attachments.length > 0 && <ul className="resource-upload-list">{draft.attachments.map((attachment, index) => <li className="resource-upload-item" key={attachment.assetId ?? attachment.id ?? attachment.url}><span><Folder size={14} /><span>{attachment.name}<small>{attachment.size ? (attachment.size / 1024 / 1024).toFixed(1) + ' MB' : '已上传'}</small></span></span><button type="button" className="admin-link-button admin-danger-link" onClick={() => update({ attachments: draft.attachments.filter((_, itemIndex) => itemIndex !== index) })}>移除</button></li>)}</ul>}</div>}{draft.accessMode === 'article' && <label><span>站内正文</span><textarea value={draft.content} onChange={(event) => update({ content: event.target.value })} rows={8} placeholder="支持由后端保存的 Markdown 或纯文本内容" /></label>}<label><span>标签（逗号分隔）</span><input value={draft.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="Python, 入门, 推荐" /></label></>}
        {kind === '面经墙' && <><label><span>面试总结</span><textarea value={draft.description} onChange={(event) => update({ description: event.target.value, summary: event.target.value })} rows={3} placeholder="记录流程、重点问题和复盘建议" /></label><div className="admin-editor-form-grid"><label><span>作者</span><input value={draft.author} onChange={(event) => update({ author: event.target.value })} /></label><label><span>届次</span><input value={draft.cohort} onChange={(event) => update({ cohort: event.target.value })} placeholder="2029 届" /></label></div><div className="admin-editor-form-grid"><label><span>面试日期</span><input value={draft.date} onChange={(event) => update({ date: event.target.value })} /></label><label><span>难度</span><select value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value })}><option>简单</option><option>中等</option><option>困难</option></select></label></div><div className="admin-editor-form-grid"><label><span>面试轮次</span><input type="number" min="1" value={draft.rounds} onChange={(event) => update({ rounds: event.target.value })} /></label><label><span>标签（逗号分隔）</span><input value={draft.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="八股, 项目, 反问" /></label></div></>}
        <div className="admin-editor-form-grid"><label><span>可见范围</span><select value={draft.visibility} onChange={(event) => update({ visibility: event.target.value as CollectionDraft['visibility'] })}><option>全站公开</option><option>成员可见</option><option>组员可见</option></select></label><label><span>{kind === '项目库' ? '视觉色调' : '更新时间'}</span>{kind === '项目库' ? <select value={draft.accent} onChange={(event) => update({ accent: event.target.value })}>{accents.map((accent) => <option key={accent} value={accent}>{accent}</option>)}</select> : <input value={draft.updated} onChange={(event) => update({ updated: event.target.value })} />}</label></div>
      </div></div></div>
    <div className="admin-modal-foot"><span>{draft.id ? '已保存后可继续编辑' : '新内容尚未保存'}</span><div className="admin-modal-actions">{draft.id && <button className="admin-link-button admin-danger-link" disabled={Boolean(busyAction)} onClick={() => setPendingDelete({ id: draft.id!, label: draft.title || '这条内容' })}><Trash2 size={13} /> 删除</button>}<button className="secondary-button admin-small-button" disabled={Boolean(busyAction)} onClick={onClose}>取消</button><button className="primary-button admin-small-button" disabled={Boolean(busyAction)} onClick={() => void saveDraft()}><Save size={14} /> {busyAction === 'save' ? '保存中…' : `保存${title}`}</button></div></div>
  </section>{pendingDelete && <div className="admin-delete-confirm-scrim" role="presentation" onClick={() => setPendingDelete(null)}><section className="admin-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-confirm-title" onClick={(event) => event.stopPropagation()}><div className="admin-delete-confirm-head"><span className="admin-delete-confirm-icon"><Trash2 size={17} /></span><div><p className="eyebrow">DANGER ZONE / DELETE</p><h3 id="admin-delete-confirm-title">删除{title}内容？</h3></div></div><p>将删除“{pendingDelete.label}”，公开页面也会同步移除。这个操作无法撤销。</p><div className="admin-delete-confirm-actions"><button type="button" className="secondary-button admin-small-button" disabled={busyAction === 'delete'} onClick={() => setPendingDelete(null)}>保留内容</button><button type="button" className="admin-danger-button admin-small-button" disabled={busyAction === 'delete'} onClick={() => void confirmDelete()}><Trash2 size={14} /> {busyAction === 'delete' ? '删除中…' : '确认删除'}</button></div></section></div>}</div>
}

export type ProjectCategoryDraft = {
  id?: string
  key: string
  label: string
  description: string
  accent: string
  icon: string
  order: number
  enabled: boolean
  builtIn?: boolean
}

function createProjectCategoryDraft(category?: ProjectCategory, order = 1): ProjectCategoryDraft {
  return category
    ? { id: category.id, key: category.key, label: category.label, description: category.description ?? '', accent: category.accent, icon: category.icon, order: category.order, enabled: category.enabled, builtIn: category.builtIn }
    : { key: '', label: '', description: '', accent: 'blue', icon: 'spark', order, enabled: true }
}

const categoryAccents = ['blue', 'violet', 'mint', 'orange', 'rose']
const categoryIcons = [
  { value: 'spark', label: '星芒' },
  { value: 'code', label: '代码' },
  { value: 'terminal', label: '终端' },
  { value: 'route', label: '路线' },
  { value: 'rocket', label: '火箭' },
  { value: 'folder', label: '文件夹' },
  { value: 'users', label: '成员' },
]

export type CategoryResource = 'projects' | 'resources' | 'interviews'

const categoryResourceLabels: Record<CategoryResource, { noun: string; eyebrow: string; usage: string }> = {
  projects: { noun: '项目', eyebrow: 'PROJECTS', usage: '个项目使用' },
  resources: { noun: '资源', eyebrow: 'RESOURCES', usage: '份资源使用' },
  interviews: { noun: '面经', eyebrow: 'INTERVIEWS', usage: '篇面经使用' },
}

export function AdminWorkbenchSettingsModal({ initialSettings, announcements, projects, resources, onClose, onSave }: { initialSettings: WorkbenchSettings; announcements: Announcement[]; projects: Project[]; resources: Resource[]; onClose: () => void; onSave: (settings: WorkbenchSettings) => void | Promise<void> }) {
  const [draft, setDraft] = React.useState<WorkbenchSettings>(() => ({ ...initialSettings, liveItems: initialSettings.liveItems.map((item) => ({ ...item })), projectIds: [...initialSettings.projectIds] }))
  const [busy, setBusy] = React.useState(false)
  const [tab, setTab] = React.useState<'live' | 'projects'>('live')
  const [pickerQuery, setPickerQuery] = React.useState('')
  const feedOptions: Array<WorkbenchFeedItem & { label: string; detail: string; typeLabel: string }> = [
    ...announcements.filter((item) => item.published !== false).map((item) => ({ type: 'announcement' as const, id: item.id, label: item.title, detail: item.detail, typeLabel: '公告' })),
    ...projects.map((item) => ({ type: 'project' as const, id: item.id, label: item.name, detail: item.description, typeLabel: '项目' })),
    ...resources.map((item) => ({ type: 'resource' as const, id: item.id, label: item.title, detail: item.description, typeLabel: '资源' })),
  ]
  const feedKey = (item: WorkbenchFeedItem) => item.type + ':' + item.id
  const isFeedSelected = (item: WorkbenchFeedItem) => draft.liveItems.some((current) => feedKey(current) === feedKey(item))
  const toggleFeed = (item: WorkbenchFeedItem) => setDraft((current) => ({ ...current, liveItems: isFeedSelected(item) ? current.liveItems.filter((value) => feedKey(value) !== feedKey(item)) : [...current.liveItems, item] }))
  const moveFeed = (index: number, direction: -1 | 1) => setDraft((current) => {
    const target = index + direction
    if (target < 0 || target >= current.liveItems.length) return current
    const next = [...current.liveItems]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    return { ...current, liveItems: next }
  })
  const toggleProject = (id: string) => setDraft((current) => ({ ...current, projectIds: current.projectIds.includes(id) ? current.projectIds.filter((value) => value !== id) : [...current.projectIds, id] }))
  const normalizedPickerQuery = pickerQuery.trim().toLowerCase()
  const filteredFeedOptions = feedOptions.filter((item) => !normalizedPickerQuery || `${item.label} ${item.detail} ${item.typeLabel}`.toLowerCase().includes(normalizedPickerQuery))
  const filteredProjects = projects.filter((project) => !normalizedPickerQuery || `${project.name} ${project.description} ${project.category} ${project.status} ${project.year}`.toLowerCase().includes(normalizedPickerQuery))
  const save = async () => { if (busy) return; setBusy(true); try { await onSave(draft) } finally { setBusy(false) } }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-workbench-modal admin-home-rules-modal" role="dialog" aria-modal="true" aria-labelledby="admin-workbench-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">CONTENT / HOME DISPLAY</p><h2 id="admin-workbench-title">首页展示规则</h2><p>分别管理动态流和进行中的项目，设置会同步到工具页。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭工作台设置"><X size={16} /></button></div>
    <nav className="admin-workbench-tabs" aria-label="首页展示规则分类"><button type="button" className={tab === 'live' ? 'active' : ''} onClick={() => { setTab('live'); setPickerQuery('') }}>本届正在发生</button><button type="button" className={tab === 'projects' ? 'active' : ''} onClick={() => { setTab('projects'); setPickerQuery('') }}>当前进行的项目</button></nav>
    <div className="admin-workbench-layout">
      {tab === 'live' && <section className="admin-workbench-section"><div className="admin-route-node-head"><div><p className="eyebrow">LIVE WORKSPACE</p><h3>本届正在发生</h3></div><label className="admin-inline-switch"><input type="checkbox" checked={draft.liveEnabled} onChange={(event) => setDraft({ ...draft, liveEnabled: event.target.checked })} /><span>{draft.liveEnabled ? '已展示' : '已隐藏'}</span></label></div><div className="admin-editor-form-grid"><label><span>模块标题</span><input value={draft.liveTitle} onChange={(event) => setDraft({ ...draft, liveTitle: event.target.value })} placeholder="本届正在发生" /></label><label><span>轮播间隔（秒）</span><input type="number" min="2" max="30" step="0.5" value={draft.liveRotationSeconds} onChange={(event) => setDraft({ ...draft, liveRotationSeconds: Number(event.target.value) || 2 })} /></label></div><label><span>模块说明</span><input value={draft.liveSubtitle} onChange={(event) => setDraft({ ...draft, liveSubtitle: event.target.value })} placeholder="来自公告、项目和资源的最新动态" /></label><div className="admin-workbench-picker-head"><strong>选择展示内容</strong><small>不选择时自动显示最新公告、项目和资源</small></div><label className="admin-workbench-search"><Search size={14} /><input value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="搜索公告、项目或资源" aria-label="搜索首页动态内容" /></label><div className="admin-workbench-picker">{filteredFeedOptions.map((item) => <label key={feedKey(item)} className={isFeedSelected(item) ? 'selected' : ''}><input type="checkbox" checked={isFeedSelected(item)} onChange={() => toggleFeed(item)} /><span><strong>{item.label}</strong><small>{item.typeLabel} · {item.detail || '暂无说明'}</small></span></label>)}{filteredFeedOptions.length === 0 && <small>{feedOptions.length === 0 ? '暂无可配置内容，请先维护公告、项目或资源。' : '没有匹配的内容，请换个关键词。'}</small>}</div>{draft.liveItems.length > 0 && <div className="admin-workbench-order"><strong>展示顺序</strong>{draft.liveItems.map((item, index) => { const option = feedOptions.find((value) => feedKey(value) === feedKey(item)); return <div key={feedKey(item)}><span>{index + 1}. {option?.label ?? item.id}</span><span><button type="button" className="icon-button small" disabled={index === 0} onClick={() => moveFeed(index, -1)} aria-label="上移"><ArrowUp size={13} /></button><button type="button" className="icon-button small" disabled={index === draft.liveItems.length - 1} onClick={() => moveFeed(index, 1)} aria-label="下移"><ArrowDown size={13} /></button></span></div> })}</div>}</section>}
      {tab === 'projects' && <section className="admin-workbench-section"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT IN PROGRESS</p><h3>当前进行的项目</h3></div><label className="admin-inline-switch"><input type="checkbox" checked={draft.projectsEnabled} onChange={(event) => setDraft({ ...draft, projectsEnabled: event.target.checked })} /><span>{draft.projectsEnabled ? '已展示' : '已隐藏'}</span></label></div><div className="admin-editor-form-grid"><label><span>模块标题</span><input value={draft.projectsTitle} onChange={(event) => setDraft({ ...draft, projectsTitle: event.target.value })} placeholder="当前进行的项目" /></label><label><span>轮播间隔（秒）</span><input type="number" min="2" max="30" step="0.5" value={draft.projectRotationSeconds} onChange={(event) => setDraft({ ...draft, projectRotationSeconds: Number(event.target.value) || 2 })} /></label></div><div className="admin-workbench-picker-head"><strong>选择展示项目</strong><small>不选择时自动展示所有未归档项目</small></div><label className="admin-workbench-search"><Search size={14} /><input value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="搜索项目名称、分类或届次" aria-label="搜索首页项目" /></label><div className="admin-workbench-picker">{filteredProjects.map((project) => <label key={project.id} className={draft.projectIds.includes(project.id) ? 'selected' : ''}><input type="checkbox" checked={draft.projectIds.includes(project.id)} onChange={() => toggleProject(project.id)} /><span><strong>{project.name}</strong><small>{project.status} · {project.year} 届 · {project.category}</small></span></label>)}{filteredProjects.length === 0 && <small>{projects.length === 0 ? '项目库暂无内容，请先添加项目。' : '没有匹配的项目，请换个关键词。'}</small>}</div></section>}
    </div>
    <div className="admin-modal-foot"><span>保存后首页展示规则会同步到工具页</span><div><button className="secondary-button admin-small-button" disabled={busy} onClick={onClose}>取消</button><button className="primary-button admin-small-button" disabled={busy} onClick={() => void save()}><Save size={14} /> {busy ? '保存中…' : '保存展示规则'}</button></div></div>
  </section></div>
}

export function AdminCategoryManagerModal({ resource, categories, items = [], onClose, onSave, onDelete, onMove }: { resource: CategoryResource; categories: ContentCategory[]; items?: Array<Project | Resource | InterviewExperience>; onClose: () => void; onSave: (draft: ProjectCategoryDraft) => void | Promise<void>; onDelete: (id: string) => void | Promise<void>; onMove: (id: string, direction: 'up' | 'down') => void | Promise<void> }) {
  const labels = categoryResourceLabels[resource]
  const orderedCategories = [...categories].sort((a, b) => a.order - b.order)
  const [draft, setDraft] = React.useState<ProjectCategoryDraft | null>(null)
  const [error, setError] = React.useState('')
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<ProjectCategory | null>(null)
  const [categoryQuery, setCategoryQuery] = React.useState('')
  const categoryUsage = (category: ContentCategory) => items.filter((item) => 'category' in item && item.category === category.key).length
  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase()
  const visibleCategories = orderedCategories.filter((category) => !normalizedCategoryQuery || `${category.label} ${category.key} ${category.description ?? ''}`.toLowerCase().includes(normalizedCategoryQuery))
  const beginNew = () => { setError(''); setDraft(createProjectCategoryDraft(undefined, orderedCategories.length + 1)) }
  const beginEdit = (category: ProjectCategory) => { setError(''); setDraft(createProjectCategoryDraft(category)) }
  const update = (patch: Partial<ProjectCategoryDraft>) => setDraft((current) => current ? { ...current, ...patch } : current)
  const toggleCategory = async (category: ProjectCategory) => {
    setError('')
    setBusyId(category.id)
    try { await onSave({ ...createProjectCategoryDraft(category), enabled: !category.enabled }) } catch (cause) { setError(cause instanceof Error ? cause.message : '分类状态更新失败，请稍后重试') } finally { setBusyId(null) }
  }
  const save = async () => {
    if (!draft) return
    const label = draft.label.trim()
    const key = draft.key.trim()
    if (!label) { setError('请填写分类名称'); return }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(key)) { setError('分类标识需为 1—32 位字母、数字、下划线或短横线'); return }
    if (orderedCategories.some((category) => category.key.toLowerCase() === key.toLowerCase() && category.id !== draft.id)) { setError('分类标识已存在，请换一个'); return }
    setError('')
    setBusyId(draft.id ?? 'new')
    try { await onSave({ ...draft, label, key, description: draft.description.trim() }); setDraft(null) } catch (cause) { setError(cause instanceof Error ? cause.message : '分类保存失败，请稍后重试') } finally { setBusyId(null) }
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusyId(pendingDelete.id)
    try { await onDelete(pendingDelete.id); setPendingDelete(null) } catch (cause) { setError(cause instanceof Error ? cause.message : '分类删除失败，请稍后重试') } finally { setBusyId(null) }
  }
  return <div className="admin-modal-scrim admin-category-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-category-modal" role="dialog" aria-modal="true" aria-labelledby="admin-category-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">{labels.eyebrow} / TAXONOMY</p><h2 id="admin-category-title">管理{labels.noun}分类</h2><p>配置{labels.noun}库筛选项。更改会同步到编辑器和公开页面。</p></div><div className="admin-modal-head-actions"><button type="button" className="primary-button admin-small-button" onClick={beginNew}><Plus size={14} /> 新增分类</button><button type="button" className="icon-button small" onClick={onClose} aria-label={`关闭${labels.noun}分类设置`}><X size={16} /></button></div></div>
    <label className="admin-search admin-admin-list-search"><Search size={14} /><input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={`${labels.noun}分类`} aria-label={`${labels.noun}分类`} /></label>
    <div className="admin-category-note"><Tag size={15} /><span>“全部”会自动保留。内置分类不能删除，但可以停用；自定义分类在没有{labels.noun}使用时才可删除。</span></div>
    <div className="admin-category-list">{visibleCategories.map((category) => { const index = orderedCategories.indexOf(category); const usage = categoryUsage(category); return <article className={`admin-category-row ${!category.enabled ? 'disabled' : ''}`} key={category.id}><span className={`admin-category-swatch accent-${category.accent}`} /><div className="admin-category-main"><div><strong>{category.label}</strong><code>{category.key}</code></div><small>{category.description || '未填写分类说明'} · {usage} {labels.usage}</small></div><span className={`admin-category-status ${category.enabled ? 'enabled' : ''}`}>{category.enabled ? <><Eye size={12} /> 已启用</> : <><EyeOff size={12} /> 已停用</>}</span><div className="admin-category-actions"><button type="button" className="icon-button small" onClick={() => void onMove(category.id, 'up')} disabled={index === 0 || Boolean(busyId)} aria-label={`上移${category.label}`} title="上移"><ArrowUp size={14} /></button><button type="button" className="icon-button small" onClick={() => void onMove(category.id, 'down')} disabled={index === orderedCategories.length - 1 || Boolean(busyId)} aria-label={`下移${category.label}`} title="下移"><ArrowDown size={14} /></button><button type="button" className="admin-link-button" onClick={() => beginEdit(category)} disabled={Boolean(busyId)}><GripVertical size={13} /> 编辑</button><button type="button" className="admin-link-button" onClick={() => void toggleCategory(category)} disabled={Boolean(busyId)}>{category.enabled ? '停用' : '启用'}</button><button type="button" className="admin-link-button admin-danger-link" onClick={() => setPendingDelete(category)} disabled={category.builtIn || usage > 0 || Boolean(busyId)} title={category.builtIn ? '内置分类不可删除' : usage > 0 ? `请先迁移使用中的${labels.noun}` : '删除分类'}><Trash2 size={13} /> 删除</button></div></article> })}{visibleCategories.length === 0 && <div className="admin-empty"><Tag size={20} /><strong>{orderedCategories.length ? `没有匹配的${labels.noun}分类` : `还没有${labels.noun}分类`}</strong><span>{orderedCategories.length ? '换个关键词再试试。' : `新增一个${labels.noun}分类后，${labels.noun}库就会出现对应筛选项。`}</span></div>}</div>
    {draft && <div className="admin-category-editor"><div className="admin-category-editor-head"><div><p className="eyebrow">{draft.id ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</p><h3>{draft.id ? `编辑${draft.label || `${labels.noun}分类`}` : `新增${labels.noun}分类`}</h3></div><button type="button" className="icon-button small" onClick={() => setDraft(null)} aria-label="关闭分类编辑"><X size={15} /></button></div><div className="admin-editor-form"><div className="admin-editor-form-grid"><label><span>分类名称</span><input value={draft.label} onChange={(event) => update({ label: event.target.value })} placeholder="例如：数据工程" autoFocus /></label><label><span>分类标识</span><input value={draft.key} onChange={(event) => update({ key: event.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) })} placeholder="例如：data-engineering" disabled={draft.builtIn} /></label></div><label><span>分类说明</span><input value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder={`一句话说明这类${labels.noun}`} /></label><div className="admin-editor-form-grid"><label><span>强调色</span><div className="admin-accent-picker">{categoryAccents.map((accent) => <button type="button" className={`admin-accent-dot accent-${accent} ${draft.accent === accent ? 'active' : ''}`} key={accent} onClick={() => update({ accent })} aria-label={`选择${accent}色`} />)}</div></label><label><span>分类图标</span><select value={draft.icon} onChange={(event) => update({ icon: event.target.value })}>{categoryIcons.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label></div><label className="admin-check-field"><input type="checkbox" checked={draft.enabled} onChange={(event) => update({ enabled: event.target.checked })} /><span>在{labels.noun}库筛选栏中显示</span></label>{error && <p className="admin-inline-error" role="alert">{error}</p>}<div className="admin-modal-foot"><span>{draft.builtIn ? '内置分类 · 标识不可修改' : '分类标识用于内容数据关联'}</span><div><button type="button" className="secondary-button admin-small-button" onClick={() => setDraft(null)}>取消</button><button type="button" className="primary-button admin-small-button" disabled={busyId !== null} onClick={() => void save()}><Save size={14} /> {busyId ? '保存中…' : '保存分类'}</button></div></div></div></div>}
    {pendingDelete && <AdminDeleteConfirm request={{ title: `删除“${pendingDelete.label}”？`, message: `删除后${labels.noun}库筛选栏会移除该分类，这个操作无法撤销。`, confirmLabel: '确认删除', cancelLabel: '保留分类', onConfirm: confirmDelete }} busy={busyId === pendingDelete.id} onCancel={() => { if (!busyId) setPendingDelete(null) }} />}
  </section></div>
}

export const AdminProjectCategoryModal = (props: Omit<React.ComponentProps<typeof AdminCategoryManagerModal>, 'resource'> & { projects?: Project[] }) => <AdminCategoryManagerModal resource="projects" items={props.projects} {...props} />

export function AdminLearningRouteModal({ draft: initialDraft, routes = [], projects = [], resources = [], onClose, onSave, onDelete, onSelectRoute, onNewRoute }: { draft: LearningRouteDraft; routes?: LearningRoute[]; projects?: Project[]; resources?: Resource[]; onClose: () => void; onSave: (draft: LearningRouteDraft) => void; onDelete?: (id: string) => void; onSelectRoute?: (id: string) => void; onNewRoute?: () => void }) {
  const [draft, setDraft] = React.useState<LearningRouteDraft>(() => ({ ...initialDraft, nodes: initialDraft.nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])], resourceIds: [...(node.resourceIds ?? [])], cloudDriveLinks: [...(node.cloudDriveLinks ?? [])] })), featuredProjectIds: [...(initialDraft.featuredProjectIds ?? [])] }))
  const [routeQuery, setRouteQuery] = React.useState('')
  const [resourceQueries, setResourceQueries] = React.useState<Record<string, string>>({})
  React.useLayoutEffect(() => {
    setDraft({ ...initialDraft, nodes: initialDraft.nodes.map((node) => ({ ...node, projectIds: [...(node.projectIds ?? [])], resourceIds: [...(node.resourceIds ?? [])], cloudDriveLinks: [...(node.cloudDriveLinks ?? [])] })), featuredProjectIds: [...(initialDraft.featuredProjectIds ?? [])] })
  }, [initialDraft.id])
  const routeList = draft.id.startsWith('new-route-')
    ? [...routes, { id: draft.id, title: draft.title, direction: draft.direction, description: draft.description, nodes: draft.nodes, featuredProjectIds: draft.featuredProjectIds }]
    : routes
  const normalizedRouteQuery = routeQuery.trim().toLowerCase()
  const visibleRoutes = routeList.filter((route) => !normalizedRouteQuery || `${route.title} ${route.direction} ${route.description}`.toLowerCase().includes(normalizedRouteQuery))
  const availableResources = resources.filter((resource) => !resource.status || resource.status === 'published')
  const resourcesForNode = (node: LearningNode) => {
    const query = (resourceQueries[node.id] ?? '').trim().toLowerCase()
    return availableResources.filter((resource) => !query || `${resource.title} ${resource.category} ${resource.type} ${resource.tags.join(' ')}`.toLowerCase().includes(query))
  }
  const updateNode = (id: string, patch: Partial<LearningNode>) => setDraft((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) }))
  const createNode = (): LearningNode => ({ id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: '', duration: '2 周', resources: 0, projects: 0, description: '', projectIds: [] })
  const addNode = () => setDraft((current) => ({ ...current, nodes: [...current.nodes, createNode()] }))
  const addNodeAfter = (id: string) => setDraft((current) => {
    const nodeIndex = current.nodes.findIndex((node) => node.id === id)
    if (nodeIndex < 0) return current
    const nodes = [...current.nodes]
    nodes.splice(nodeIndex + 1, 0, createNode())
    return { ...current, nodes }
  })
  const removeNode = async (id: string) => {
    const node = draft.nodes.find((item) => item.id === id)
    if (!node) return
    const hasContent = Boolean(
      node.title.trim() || node.description?.trim() ||
      node.resourceLinks?.some((link) => link.title.trim() || link.url.trim()) ||
      node.videoLinks?.some((link) => link.title.trim() || link.url.trim()) ||
      node.videoTitle?.trim() || node.videoUrl?.trim() ||
      node.cloudDriveLinks?.some((link) => link.title.trim() || link.url.trim() || link.description?.trim()) ||
      node.resourceIds?.length || node.projectIds?.length,
    )
    if (hasContent) {
      const confirmed = await requestAppConfirmation({
        title: '删除学习路线节点',
        message: `确定删除“${node.title.trim() || '未命名节点'}”吗？删除后需要保存路线才会生效。`,
        confirmLabel: '删除节点',
        tone: 'danger',
      })
      if (!confirmed) return
    }
    setDraft((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== id) }))
  }
  const updateNodeLinks = (nodeId: string, field: 'resourceLinks' | 'videoLinks' | 'cloudDriveLinks', links: LearningLink[]) => {
    const patch: Partial<LearningNode> = { [field]: links }
    if (field === 'videoLinks') {
      patch.videoTitle = links[0]?.title ?? ''
      patch.videoUrl = links[0]?.url ?? ''
    }
    updateNode(nodeId, patch)
  }
  const toggleProject = (ids: string[], projectId: string) => ids.includes(projectId) ? ids.filter((id) => id !== projectId) : [...ids, projectId]
  const toggleResource = (ids: string[], resourceId: string) => ids.includes(resourceId) ? ids.filter((id) => id !== resourceId) : [...ids, resourceId]
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-learning-modal" role="dialog" aria-modal="true" aria-labelledby="admin-learning-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head"><div><p className="eyebrow">LEARNING / ROUTE BUILDER</p><h2 id="admin-learning-title">编辑学习路线</h2><p>按方向维护路线，再给每个节点绑定真实项目；右侧项目入口也从这里配置。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭学习路线编辑"><X size={16} /></button></div>
    <div className="learning-editor-layout">    <div className="learning-editor-sidebar"><div className="learning-editor-sidebar-head"><div><span className="eyebrow">ROUTES</span><strong>路线目录</strong></div>{onNewRoute && <button type="button" className="icon-button small" onClick={onNewRoute} aria-label="新建学习方向"><Plus size={15} /></button>}</div>{onNewRoute && <button type="button" className="learning-editor-new" onClick={onNewRoute}><Plus size={14} /> 新建方向</button>}<label className="admin-search admin-admin-list-search"><Search size={14} /><input value={routeQuery} onChange={(event) => setRouteQuery(event.target.value)} placeholder="搜索路线、方向或简介" aria-label="搜索学习路线" /></label><div className="learning-editor-route-list">{visibleRoutes.map((route) => <button type="button" key={route.id} className={route.id === draft.id ? 'active' : ''} onClick={() => { if (!route.id.startsWith('new-route-')) onSelectRoute?.(route.id) }}><span className="learning-editor-route-icon"><Route size={14} /></span><span><strong>{route.direction || route.title}</strong><small>{route.nodes.length} 个节点{route.id.startsWith('new-route-') ? ' · 正在编辑' : ''}</small></span><ChevronRight size={14} /></button>)}{visibleRoutes.length === 0 && <div className="learning-editor-sidebar-empty"><Search size={18} /><span>{routeList.length === 0 ? '还没有路线' : '没有匹配的路线'}</span></div>}</div><div className="learning-editor-sidebar-tip"><Sparkles size={15} /><span>每条路线可以绑定不同项目，成员按方向查看。</span></div></div>
    <div className="learning-editor-main"><div className="learning-editor-main-head"><div className="learning-editor-main-head-copy"><div><span className="eyebrow">CURRENT ROUTE</span><h3>{draft.direction || '未命名方向'}</h3></div><span className="learning-editor-count">{draft.nodes.length} 个学习节点</span></div><div className="learning-editor-route-actions">{onDelete && (draft.id.startsWith('new-route-') || draft.id !== 'pyagent') && <button type="button" className="admin-link-button admin-danger-link learning-editor-delete-button" onClick={() => onDelete(draft.id)}><Trash2 size={13} /> {draft.id.startsWith('new-route-') ? '取消新建' : '删除路线'}</button>}{draft.id === 'pyagent' && <span className="admin-route-protected">默认路线</span>}<button type="button" className="secondary-button admin-small-button" onClick={onClose}>取消编辑</button><button type="button" className="primary-button admin-small-button" onClick={() => onSave(draft)}><Save size={14} /> 保存当前方向</button></div></div>    <div className="admin-editor-form"><div className="admin-editor-form-grid"><label><span>方向名称</span><input value={draft.direction} onChange={(event) => setDraft({ ...draft, direction: event.target.value })} placeholder="例如：前端" /></label><label><span>路线名称</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /></label></div><LearningMarkdownField label="路线简介" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} rows={4} placeholder="说明这条路线适合谁，以及最终能完成什么" />
      <div className="admin-route-featured-picker"><div className="admin-route-node-head"><div><p className="eyebrow">PROJECT ENTRY</p><h3>路线右侧项目入口</h3></div><span>可多选</span></div><div className="admin-project-picker">{projects.map((project) => <label key={project.id}><input type="checkbox" checked={draft.featuredProjectIds.includes(project.id)} onChange={() => setDraft({ ...draft, featuredProjectIds: toggleProject(draft.featuredProjectIds, project.id) })} /><span><strong>{project.name}</strong><small>{project.category} · {project.status}</small></span></label>)}</div>{projects.length === 0 && <small>项目库暂无可展示项目，请先添加项目。</small>}</div>
      <div className="admin-route-node-head"><div><p className="eyebrow">ROUTE NODES</p><h3>学习节点</h3></div><button className="secondary-button admin-small-button" onClick={addNode}><Plus size={14} /> 添加节点</button></div>
      <div className="admin-route-nodes">
        {draft.nodes.map((node, index) => <article className="admin-route-node" key={node.id}>
          <div className="admin-route-node-index">{String(index + 1).padStart(2, '0')}</div>
          <div className="admin-route-node-fields">
            <div className="learning-node-actions">
              <button type="button" className="admin-link-button" onClick={() => addNodeAfter(node.id)} aria-label={`在第 ${index + 1} 个学习节点下方添加节点`}><Plus size={13} /> 下方添加</button>
              <button type="button" className="admin-link-button admin-danger-link" onClick={() => removeNode(node.id)} aria-label={`删除第 ${index + 1} 个学习节点`}><Trash2 size={13} /> 删除节点</button>
            </div>
            <div className="admin-editor-form-grid">
              <label><span>节点标题</span><input value={node.title} onChange={(event) => updateNode(node.id, { title: event.target.value })} placeholder="例如：Python 基础与工程习惯" /></label>
              <label><span>预计时长</span><input value={node.duration} onChange={(event) => updateNode(node.id, { duration: event.target.value })} placeholder="2 周" /></label>
            </div>
            <LearningMarkdownField label="节点说明" value={node.description ?? ''} onChange={(description) => updateNode(node.id, { description })} rows={3} placeholder="写清本阶段的产出和验收方式" />
            <section className="admin-node-links">
              <div className="admin-node-links-head"><strong><FileText size={14} /> 文档资料</strong><button type="button" className="text-button" onClick={() => updateNodeLinks(node.id, 'resourceLinks', [...(node.resourceLinks ?? []), { id: `resource-link-${Date.now()}`, title: '', url: '' }])}><Plus size={13} /> 添加文档</button></div>
              {(node.resourceLinks ?? []).map((link, linkIndex) => <div className="admin-node-link-row" key={link.id}>
                <label><span>资料名称</span><input value={link.title} onChange={(event) => updateNodeLinks(node.id, 'resourceLinks', (node.resourceLinks ?? []).map((item, index) => index === linkIndex ? { ...item, title: event.target.value } : item))} placeholder="例如：Python 官方教程" /></label>
                <label><span>文档地址</span><input type="url" value={link.url} onChange={(event) => updateNodeLinks(node.id, 'resourceLinks', (node.resourceLinks ?? []).map((item, index) => index === linkIndex ? { ...item, url: event.target.value } : item))} placeholder="https://..." /></label>
                <button type="button" className="admin-route-node-remove admin-danger-link" onClick={() => updateNodeLinks(node.id, 'resourceLinks', (node.resourceLinks ?? []).filter((item) => item.id !== link.id))} aria-label={`删除文档资料 ${link.title || linkIndex + 1}`}><Trash2 size={14} /></button>
              </div>)}
            </section>
            <section className="admin-node-links">
              <div className="admin-node-links-head"><strong><PlayCircle size={14} /> 视频课程</strong><button type="button" className="text-button" onClick={() => {
                const currentLinks = node.videoLinks ?? (node.videoTitle || node.videoUrl ? [{ id: `legacy-video-${node.id}`, title: node.videoTitle ?? '', url: node.videoUrl ?? '' }] : [])
                updateNodeLinks(node.id, 'videoLinks', [...currentLinks, { id: `video-link-${Date.now()}`, title: '', url: '' }])
              }}><Plus size={13} /> 添加视频</button></div>
              {(node.videoLinks ?? (node.videoTitle || node.videoUrl ? [{ id: `legacy-video-${node.id}`, title: node.videoTitle ?? '', url: node.videoUrl ?? '' }] : [])).map((link, linkIndex, currentLinks) => <div className="admin-node-link-row" key={link.id}>
                <label><span>课程名称</span><input value={link.title} onChange={(event) => updateNodeLinks(node.id, 'videoLinks', currentLinks.map((item, index) => index === linkIndex ? { ...item, title: event.target.value } : item))} placeholder="例如：Python 入门课程" /></label>
                <label><span>视频地址</span><input type="url" value={link.url} onChange={(event) => updateNodeLinks(node.id, 'videoLinks', currentLinks.map((item, index) => index === linkIndex ? { ...item, url: event.target.value } : item))} placeholder="https://..." /></label>
                <button type="button" className="admin-route-node-remove admin-danger-link" onClick={() => updateNodeLinks(node.id, 'videoLinks', currentLinks.filter((item) => item.id !== link.id))} aria-label={`删除视频课程 ${link.title || linkIndex + 1}`}><Trash2 size={14} /></button>
              </div>)}
            </section>
            <section className="admin-node-links">
              <div className="admin-node-links-head"><strong><CloudDownload size={14} /> 网盘资料</strong><button type="button" className="text-button" onClick={() => updateNodeLinks(node.id, 'cloudDriveLinks', [...(node.cloudDriveLinks ?? []), { id: `drive-link-${Date.now()}`, title: '', url: '', description: '' }])}><Plus size={13} /> 添加网盘链接</button></div>
              {(node.cloudDriveLinks ?? []).map((link, linkIndex) => <div className="admin-node-drive-row" key={link.id}>
                <div className="admin-editor-form-grid"><label><span>资料名称</span><input value={link.title} onChange={(event) => updateNodeLinks(node.id, 'cloudDriveLinks', (node.cloudDriveLinks ?? []).map((item, index) => index === linkIndex ? { ...item, title: event.target.value } : item))} placeholder="例如：Python 课程资料包" /></label><label><span>网盘地址</span><input type="url" value={link.url} onChange={(event) => updateNodeLinks(node.id, 'cloudDriveLinks', (node.cloudDriveLinks ?? []).map((item, index) => index === linkIndex ? { ...item, url: event.target.value } : item))} placeholder="https://..." /></label></div>
                <div className="admin-node-drive-note"><label><span>说明 / 提取码（可选）</span><input value={link.description ?? ''} onChange={(event) => updateNodeLinks(node.id, 'cloudDriveLinks', (node.cloudDriveLinks ?? []).map((item, index) => index === linkIndex ? { ...item, description: event.target.value } : item))} placeholder="例如：包含课件和练习 · 提取码 abcd" /></label><button type="button" className="admin-route-node-remove admin-danger-link" onClick={() => updateNodeLinks(node.id, 'cloudDriveLinks', (node.cloudDriveLinks ?? []).filter((item) => item.id !== link.id))} aria-label={`删除网盘资料 ${link.title || linkIndex + 1}`}><Trash2 size={14} /></button></div>
              </div>)}
              {(node.cloudDriveLinks ?? []).length === 0 && <small className="admin-node-drive-empty">网盘资料单独填写；也可以在下方关联资源库中选择已发布的资源。</small>}
            </section>
            <section className="admin-node-links admin-node-project-links">
              <div className="admin-node-links-head"><strong><Folder size={14} /> 关联资源库</strong><span>{(node.resourceIds ?? []).length} 项已选</span></div>
              <label className="admin-search admin-node-resource-search"><Search size={13} /><input value={resourceQueries[node.id] ?? ''} onChange={(event) => setResourceQueries((current) => ({ ...current, [node.id]: event.target.value }))} placeholder="搜索资源名称、分类或标签" aria-label={`搜索第 ${index + 1} 个学习节点可关联的资源`} /></label>
              <div className="admin-project-picker compact admin-node-resource-picker">{resourcesForNode(node).map((resource) => <label key={resource.id}><input type="checkbox" checked={(node.resourceIds ?? []).includes(resource.id)} onChange={() => updateNode(node.id, { resourceIds: toggleResource(node.resourceIds ?? [], resource.id) })} /><span>{resource.title}<small>{resource.category} · {resource.type}</small></span></label>)}{resourcesForNode(node).length === 0 && <small className="admin-node-resource-empty">{availableResources.length ? '没有匹配的资源，换个关键词试试。' : '资源库暂时没有已发布的资源。'}</small>}</div>
            </section>
            <section className="admin-node-links admin-node-project-links">
              <div className="admin-node-links-head"><strong><Folder size={14} /> 节点项目入口</strong></div>
              <div className="admin-project-picker compact">{projects.map((project) => <label key={project.id}><input type="checkbox" checked={(node.projectIds ?? []).includes(project.id)} onChange={() => updateNode(node.id, { projectIds: toggleProject(node.projectIds ?? [], project.id) })} /><span>{project.name}</span></label>)}</div>
            </section>
          </div>
        </article>)}
      </div>
      {draft.nodes.length === 0 && <div className="admin-empty admin-route-empty"><Route size={20} /><strong>还没有学习节点</strong><span>点击“添加节点”，从第一阶段开始搭建路线。</span></div>}</div>
     <div className="admin-modal-foot"><span><Route size={13} /> {draft.nodes.length} 个节点 · 保存后学习路线页面同步</span></div>
    </div>
    </div>  </section></div>
}
