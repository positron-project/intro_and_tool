import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Gauge,
  Github,
  ImagePlus,
  KeyRound,
  Layers3,
  LockKeyhole,
  Mail,
  Megaphone,
  MessageCircle,
  Palette,
  Plus,
  Quote,
  Radio,
  RefreshCw,
  Rocket,
  Route,
  Save,
  ScrollText,
  Search,
  Send,
  ServerCog,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { apiConfig } from '../../services/api-client'
import { useContent } from '../../services/content.context'
import { isCoreTeam, useClubConfig } from '../../services/club-config.context'
import { useAuth } from '../../services/auth.context'
import {
  canAccessAdmin,
  canManageContent,
  canManageGlobalContent,
  canManageInvites,
  isDemoAuth,
  listManagedAccounts,
  updateManagedAccountRole,
  updateManagedAccountStatus,
} from '../../services/auth.service'
import { createInviteCode, deleteInviteCode, listInviteCodes, revokeInviteCode } from '../../services/invite.service'
import { listContributionSubmissions, requestContributionChanges, reviewContributionSubmission } from '../../services/contribution.service'
import { deleteFeedbackMessage, listFeedbackMessages, updateFeedbackMessage } from '../../services/feedback.service'
import { uploadAsset } from '../../services/upload.service'
import { isRemoteClubConfigEnabled } from '../../services/club-config.service'
import { listProjectJoinRequests, reviewProjectJoinRequest, type ProjectJoinRequest } from '../../services/project.service'
import { competitionDateInput, competitionDateLabel, competitionStage } from '../../services/competition.service'
import { isRemoteCompetitionProjectsEnabled, syncCompetitionProjects } from '../../services/competition-project.service'
import { isRemoteSettingsEnabled, updateSiteSettings, updateUserPreferences } from '../../services/settings.service'
import { deleteAllAuditLogs, deleteAuditLog, isRemoteAuditEnabled, listAllAuditLogs, listAuditLogs, type AuditLog } from '../../services/audit.service'
import { listInterviewReviewQueue } from '../../services/interview.service'
import { listPromptReviewQueue, reviewPrompt } from '../../services/prompt.service'
import type {
  AccountStatus,
  AdminContributionRow,
  AuthUser,
  CompetitionEvent,
  CompetitionProject,
  CompetitionTrack,
  ContributionSubmission,
  CreateInput,
  InterviewExperience,
  InterviewSubmission,
  InviteCode,
  Member,
  Project,
  PromptReviewItem,
} from '../../types'
import {
  AdminAnnouncementModal,
  AdminCategoryManagerModal,
  AdminContentManagerModal,
  AdminContentModal,
  AdminDeleteConfirm,
  AdminLearningRouteModal,
  AdminMemberModal,
  AdminWorkbenchSettingsModal,
  createLearningRouteDraft,
  createMemberDraft,
  type AdminCollectionKind,
  type AdminDeleteRequest,
  type AnnouncementDraft,
  type CategoryResource,
  type CollectionDraft,
  type ContentDraft,
  type LearningRouteDraft,
  type MemberDraft,
  type ProjectCategoryDraft,
} from '../admin-modals'
import { AdminPromptManagerModal } from '../prompt-modals'
import { InterviewReviewDrawer } from '../interviews'
import {
  Avatar,
  MAX_LOCAL_AVATAR_BYTES,
  MAX_LOCAL_IMAGE_BYTES,
  Tag,
  accountDirectoryDirection,
  compareMembersByCohort,
  isSupportedImage,
  initialsFromName,
  mergeManagedTeamMembers,
  normalizeMemberTeamId,
  roleLabels,
  safeImageSource,
  safeLink,
  type BackgroundPreference,
  type Theme,
} from '../../lib/app-shared'

type AdminSection = 'overview' | 'cohorts' | 'members' | 'content' | 'announcements' | 'contributions' | 'invites' | 'personalization' | 'security' | 'logs'

type CompetitionEditorValue = {
  title: string
  seriesName: string
  type: string
  organizer: string
  officialUrl: string
  registrationStart: string
  registrationEnd: string
  eventStart: string
  eventEnd: string
  resultDate: string
  lifecycle: NonNullable<CompetitionEvent['lifecycle']>
  date: string
  deadline: string
  description: string
  status: CompetitionEvent['status']
  accent: string
  tracks: CompetitionTrack[]
  projects: CompetitionProject[]
}


function AdminCohortManager({ onClose, initialCohortId, allowedCohortId }: { onClose: () => void; initialCohortId?: string; allowedCohortId?: string }) {
  const { sortedCohorts, saveCohort, removeCohort, saveTeam, removeTeam } = useClubConfig()
  const availableCohorts = allowedCohortId ? sortedCohorts.filter((cohort) => cohort.id === allowedCohortId) : sortedCohorts
  const [selectedId, setSelectedId] = useState(initialCohortId ?? availableCohorts[0]?.id ?? '')
  const [creatingNew, setCreatingNew] = useState(false)
  const [form, setForm] = useState({ year: '', generationLabel: '', status: 'draft' as 'active' | 'archived' | 'draft', description: '' })
  const [teamForm, setTeamForm] = useState({ id: '', name: '', description: '', accent: 'blue', memberCapacity: '' })
  const [teamEditorOpen, setTeamEditorOpen] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [cohortQuery, setCohortQuery] = useState('')
  const selected = availableCohorts.find((cohort) => cohort.id === selectedId)
  const normalizedCohortQuery = cohortQuery.trim().toLowerCase()
  const visibleCohorts = availableCohorts.filter((cohort) => !normalizedCohortQuery || `${cohort.year} ${cohort.generationLabel} ${cohort.status === 'active' ? '当前届' : cohort.status === 'archived' ? '已归档' : '筹备中'}`.toLowerCase().includes(normalizedCohortQuery))

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    if (creatingNew) return
    if (initialCohortId && availableCohorts.some((cohort) => cohort.id === initialCohortId)) setSelectedId(initialCohortId)
    else if (!availableCohorts.some((cohort) => cohort.id === selectedId)) setSelectedId(availableCohorts[0]?.id ?? '')
  }, [creatingNew, initialCohortId, availableCohorts, selectedId])

  useEffect(() => {
    const next = availableCohorts.find((cohort) => cohort.id === selectedId)
    if (!next) return
    setForm((current) => current.year === next.year && current.generationLabel === next.generationLabel && current.status === next.status && current.description === next.description
      ? current
      : { year: next.year, generationLabel: next.generationLabel, status: next.status, description: next.description })
  }, [selectedId, availableCohorts])

  const choose = (id: string) => {
    const next = availableCohorts.find((cohort) => cohort.id === id)
    setCreatingNew(false)
    setSelectedId(id)
    if (next) setForm({ year: next.year, generationLabel: next.generationLabel, status: next.status, description: next.description })
    setTeamEditorOpen(false)
  }
  const saveNew = () => {
    if (allowedCohortId) return
    setCreatingNew(true)
    setSelectedId('')
    setForm({ year: '', generationLabel: '', status: 'draft', description: '' })
    setTeamEditorOpen(false)
  }
  const save = async () => {
    if (!form.year.trim()) return
    if (allowedCohortId && (!selected || selected.id !== allowedCohortId)) {
      setActionError('届次负责人只能编辑自己负责的届次')
      return
    }
    setActionError('')
    const year = form.year.trim()
    const generation = Number(year) - 2025
    const generatedLabel = generation > 0 ? generation + ' 代 · ' + (form.status === 'active' ? '共学进行中' : form.status === 'archived' ? '已归档' : '筹备中') : year + ' 届'
    try {
      const result = await saveCohort({ id: selected?.id, year, generationLabel: form.generationLabel.trim() || generatedLabel, status: form.status, description: form.description.trim() })
      setCreatingNew(false)
      setSelectedId(result.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '届次保存失败，请稍后重试')
    }
  }
  const openTeamEditor = (team?: { id: string; name: string; description: string; accent: string; memberCapacity?: number | null; members: unknown[] }) => {
    setTeamForm(team
      ? { id: team.id, name: team.name, description: team.description, accent: team.accent, memberCapacity: team.memberCapacity == null ? '' : String(team.memberCapacity) }
      : { id: '', name: '', description: '', accent: 'blue', memberCapacity: '' })
    setTeamEditorOpen(true)
  }
  const saveTeamDraft = async () => {
    if (!selected || !teamForm.name.trim()) return
    setActionError('')
    const capacityInput = teamForm.memberCapacity.trim()
    const parsedCapacity = capacityInput ? Number(capacityInput) : null
    if (capacityInput && (parsedCapacity === null || !Number.isInteger(parsedCapacity) || parsedCapacity < 1)) {
      setActionError('成员人数请填写大于等于 1 的整数，留空表示暂不设置')
      return
    }
    try {
      await saveTeam(selected.id, { id: teamForm.id || undefined, name: teamForm.name.trim(), description: teamForm.description.trim(), accent: teamForm.accent, memberCapacity: parsedCapacity })
      setTeamEditorOpen(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '小组保存失败，请稍后重试')
    }
  }
  const applyDefaultTeams = async () => {
    if (!selected) return
    setActionError('')
    const defaults = [
      { id: 'algorithm', name: '算法组', description: '算法、模型与实验方向。', accent: 'violet' },
      { id: 'project', name: '项目组', description: '项目协作、交付与持续迭代。', accent: 'blue' },
      { id: 'cybersecurity', name: '网安组', description: '安全研究、攻防实践与风险防护。', accent: 'rose' },
    ]
    try {
      await Promise.all(defaults.filter((item) => !selected.teams.some((team) => isCoreTeam(team) && (team.id === item.id || team.name.replace(/[\s·_-]/g, '').toLowerCase() === item.name.replace(/[\s·_-]/g, '').toLowerCase()))).map((item) => saveTeam(selected.id, item)))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '固定小组保存失败，请稍后重试')
    }
  }
  const deleteTeam = (teamId: string) => {
    if (!selected) return
    const team = selected.teams.find((item) => item.id === teamId)
    if (!team || isCoreTeam(team)) return
    setDeleteRequest({
      title: '删除自定义小组？',
      message: <>将删除“{team.name}”的方向配置和成员关联，其他固定小组不受影响。</>,
      cancelLabel: '保留小组',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await removeTeam(selected.id, teamId)
          setDeleteRequest(null)
        } catch (error) {
          setActionError(error instanceof Error ? error.message : '小组删除失败，请稍后重试')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const requestDeleteCohort = () => {
    if (!selected || allowedCohortId) return
    const nextId = availableCohorts.find((item) => item.id !== selected.id)?.id ?? ''
    setDeleteRequest({
      title: '删除 ' + selected.year + ' 届？',
      message: <>将移除这一届的届次资料、方向配置和前台展示，其他届次不会受到影响。</>,
      cancelLabel: '保留届次',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await removeCohort(selected.id)
          setSelectedId(nextId)
          setDeleteRequest(null)
        } catch (error) {
          setActionError(error instanceof Error ? error.message : '届次删除失败，请稍后重试')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}>
    <section className="admin-editor-modal admin-structure-modal" role="dialog" aria-modal="true" aria-labelledby="admin-cohort-manager-title" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-head admin-cohort-modal-head">
          <div><p className="eyebrow">STRUCTURE / COHORTS</p><h2 id="admin-cohort-manager-title">届次与小组</h2><p>{allowedCohortId ? '当前只编辑自己负责的届次，小组设置会同步到对应成员页面。' : '每届默认包含算法、项目、网安三个方向，真实成员可在成员账号中补充。'}</p></div>
        <div className="admin-cohort-head-actions"><span className="admin-modal-context"><Layers3 size={14} /> 组织结构</span><button className="icon-button small" onClick={onClose} aria-label="关闭届次管理"><X size={16} /></button></div>
      </div>
      {actionError && <p className="admin-inline-error" role="alert">{actionError}</p>}
      <div className="admin-structure-layout admin-cohort-layout">
        <aside className="admin-structure-list admin-cohort-rail">
           <div className="admin-cohort-rail-head"><div><span className="eyebrow">DIRECTORY</span><strong>届次目录</strong></div><span>{availableCohorts.length} 届</span></div>
           <label className="admin-search admin-admin-list-search"><Search size={14} /><input value={cohortQuery} onChange={(event) => setCohortQuery(event.target.value)} placeholder="搜索年份或届次" aria-label="搜索届次" /></label>
           {!allowedCohortId && <button className="admin-cohort-new-button" onClick={saveNew}><Plus size={14} /> 新增届次</button>}
           <div className="admin-cohort-rail-items">
             {visibleCohorts.map((cohort) => <button key={cohort.id} className={selectedId === cohort.id ? 'active' : ''} onClick={() => choose(cohort.id)}>
              <span className="admin-cohort-rail-year">{cohort.year}<small>届</small></span>
              <span className="admin-cohort-rail-copy"><strong>{cohort.generationLabel || '未命名届次'}</strong><small>{cohort.status === 'active' ? '当前届' : cohort.status === 'archived' ? '已归档' : '筹备中'} · {cohort.teams.length} 个小组</small></span>
              <ChevronRight size={14} />
            </button>)}
            {visibleCohorts.length === 0 && <div className="admin-empty admin-list-empty"><Search size={18} /><strong>没有匹配的届次</strong><span>换个年份或届次标签再试试。</span></div>}
          </div>
          <div className="admin-cohort-rail-note"><ShieldCheck size={14} /><span>切换届次只会改变右侧编辑上下文，不会自动保存表单。</span></div>
        </aside>
        <div className="admin-structure-editor admin-cohort-editor">
          <div className="admin-cohort-editor-head">
            <div><span className="eyebrow">{selected ? `${selected.year} COHORT` : 'NEW COHORT'}</span><h3>{selected ? `${selected.year} 届资料` : '创建新届次'}</h3><p>{selected ? (selected.description || '补充这届小组的协作主题和方向配置。') : '保存后会自动生成算法、项目、网安三个固定小组。'}</p></div>
             <div className="admin-cohort-editor-actions">{selected && !allowedCohortId && <button className="admin-link-button admin-danger-link" onClick={requestDeleteCohort}><Trash2 size={13} /> 删除届次</button>}<Tag tone={form.status === 'active' ? 'mint' : form.status === 'archived' ? 'neutral' : 'orange'}>{form.status === 'active' ? '当前届' : form.status === 'archived' ? '已归档' : '筹备中'}</Tag></div>
          </div>
          <section className="admin-cohort-form-surface">
            <div className="admin-cohort-section-head"><div><span className="admin-section-icon tone-blue"><CalendarDays size={15} /></span><span><strong>届次资料</strong><small>名称、状态和公开简介</small></span></div><button className="primary-button admin-small-button" onClick={save}><Save size={14} /> 保存届次</button></div>
            <div className="admin-editor-form">
              <div className="admin-editor-form-grid">
                <label><span>届次年份</span><input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2030" /></label>
                <label><span>状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}><option value="active">当前届</option><option value="draft">筹备中</option><option value="archived">已归档</option></select></label>
              </div>
              <label><span>届次标签</span><input value={form.generationLabel} onChange={(event) => setForm({ ...form, generationLabel: event.target.value })} placeholder="第五代 · 共学进行中" /></label>
              <label><span>届次简介</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="介绍这届小组的协作主题" /></label>
            </div>
          </section>
          {selected && <section className="admin-team-editor admin-cohort-team-surface">
            <div className="admin-cohort-section-head"><div><span className="admin-section-icon tone-violet"><Users size={15} /></span><span><strong>小组方向</strong><small>{selected.teams.length} 个方向 · 成员人数由管理员配置</small></span></div><button className="secondary-button admin-small-button" onClick={applyDefaultTeams}><Plus size={14} /> 补齐固定小组</button></div>
            <div className="admin-team-grid">
              {selected.teams.map((team) => <article className="admin-team-row admin-cohort-team-card" key={team.id}>
                <div className="admin-cohort-team-card-head"><span className={'admin-team-icon tone-' + team.accent}><Users size={15} /></span><span className="admin-team-card-badge">{isCoreTeam(team) ? '固定方向' : '自定义'}</span></div>
                <div className="admin-cohort-team-copy"><strong>{team.name}</strong><small>{team.description || '暂未填写小组简介'}</small></div>
                <div className="admin-cohort-team-meta"><span><Users size={12} /> {team.memberCapacity == null ? '未设置成员人数' : `${team.memberCapacity} 人`}</span><div className="admin-row-actions"><button className="admin-link-button" onClick={() => openTeamEditor(team)}>编辑</button>{!isCoreTeam(team) && <button className="admin-link-button admin-danger-link" onClick={() => deleteTeam(team.id)}>删除</button>}</div></div>
              </article>)}
            </div>
            <button className="secondary-button admin-small-button admin-add-team-button" onClick={() => openTeamEditor()}><Plus size={14} /> 新增小组</button>
          </section>}
        </div>
      </div>
      <div className="admin-modal-foot admin-cohort-modal-foot">
        <span><CheckCircle2 size={13} /> {selected ? '修改只会作用于当前选中的届次' : '保存后前台会立即出现新的届次'}</span>
        <div className="admin-modal-actions"><button className="secondary-button admin-small-button" onClick={onClose}>完成</button></div>
      </div>
    </section>
    {teamEditorOpen && <div className="admin-modal-scrim admin-nested-modal" role="presentation" onClick={() => setTeamEditorOpen(false)}>
      <section className="admin-form-modal admin-team-form-modal" role="dialog" aria-modal="true" aria-labelledby="admin-team-editor-title" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head"><div><p className="eyebrow">TEAM / EDITOR</p><h2 id="admin-team-editor-title">{teamForm.id ? '编辑小组' : '新增小组'}</h2><p>调整方向信息后，届次卡片和成员页面会同步更新。</p></div><button className="icon-button small" onClick={() => setTeamEditorOpen(false)} aria-label="关闭小组编辑"><X size={16} /></button></div>
        <div className="admin-editor-form">
          <div className="admin-editor-form-grid"><label><span>小组名称</span><input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder="例如：算法组" autoFocus /></label><label><span>成员人数（可选）</span><input type="number" min="1" value={teamForm.memberCapacity} onChange={(event) => setTeamForm({ ...teamForm, memberCapacity: event.target.value })} placeholder="留空表示未设置" /></label></div>
          <label><span>小组简介</span><textarea rows={3} value={teamForm.description} onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })} placeholder="写清楚这个方向负责什么" /></label>
          <label><span>视觉颜色</span><select value={teamForm.accent} onChange={(event) => setTeamForm({ ...teamForm, accent: event.target.value })}><option value="blue">蓝色</option><option value="violet">紫色</option><option value="mint">薄荷绿</option><option value="rose">玫红</option><option value="orange">橙色</option></select></label>
        </div>
        <div className="admin-modal-foot"><span>保存后立即同步</span><div><button className="secondary-button admin-small-button" onClick={() => setTeamEditorOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={saveTeamDraft}><Save size={14} /> 保存小组</button></div></div>
      </section>
    </div>}
  {deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}
  </div>
}

function AdminPhotoManager({ onClose, allowedCohortId }: { onClose: () => void; allowedCohortId?: string }) {
  const { sortedCohorts, photos, savePhoto, setPhotoCover, removePhoto } = useClubConfig()
  const availableCohorts = allowedCohortId ? sortedCohorts.filter((cohort) => cohort.id === allowedCohortId) : sortedCohorts
  const [cohortId, setCohortId] = useState(allowedCohortId ?? availableCohorts[0]?.id ?? '')
  const [caption, setCaption] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [photoActionBusy, setPhotoActionBusy] = useState<string | null>(null)
  const selectedPhotos = photos.filter((photo) => photo.cohortId === cohortId)
  useEffect(() => {
    if (!availableCohorts.some((cohort) => cohort.id === cohortId)) setCohortId(availableCohorts[0]?.id ?? '')
  }, [availableCohorts, cohortId])
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !cohortId) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) {
      setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。')
      event.target.value = ''
      return
    }
    setUploadError('')
    const persistPhoto = async (dataUrl: string) => {
      try {
        await savePhoto({ id: 'photo-' + Date.now(), cohortId, dataUrl, name: file.name, caption: caption.trim() || file.name, createdAt: new Date().toISOString(), isCover: selectedPhotos.length === 0 })
        setCaption('')
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : '照片保存失败，请稍后重试。')
      } finally {
        event.target.value = ''
      }
    }
    if (isRemoteClubConfigEnabled) {
      void uploadAsset(file, { folder: 'cohort-photos', alt: caption.trim() || file.name })
        .then((asset) => persistPhoto(asset.url))
        .catch((error) => {
          setUploadError(error instanceof Error ? error.message : '照片上传失败，请稍后重试。')
          event.target.value = ''
        })
      return
    }
    const reader = new FileReader()
    reader.onerror = () => { setUploadError('照片读取失败，请重新选择文件。'); event.target.value = '' }
    reader.onload = () => { void persistPhoto(String(reader.result)) }
    reader.readAsDataURL(file)
  }
  const makeCover = async (id: string) => {
    setPhotoActionBusy(id)
    setUploadError('')
    try {
      await setPhotoCover(id)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '封面更新失败，请稍后重试。')
    } finally {
      setPhotoActionBusy(null)
    }
  }
  const remove = async (id: string) => {
    setPhotoActionBusy(id)
    setUploadError('')
    try {
      await removePhoto(id)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '照片删除失败，请稍后重试。')
    } finally {
      setPhotoActionBusy(null)
    }
  }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-photo-modal" role="dialog" aria-modal="true" aria-labelledby="admin-photo-manager-title" onClick={(event) => event.stopPropagation()}>
    <div className="admin-modal-head admin-photo-modal-head"><div><p className="eyebrow">MEDIA / PHOTO ARCHIVE</p><h2 id="admin-photo-manager-title">历届合影管理</h2><p>整理每一届的照片墙，封面会自动同步到小组风采页面。</p></div><div className="admin-photo-head-meta"><span><Camera size={14} /> {selectedPhotos.length} 张照片</span><button className="icon-button small" onClick={onClose} aria-label="关闭照片管理"><X size={16} /></button></div></div>
     <div className="admin-photo-context"><div className="admin-photo-context-field"><span className="admin-section-icon tone-blue"><CalendarDays size={15} /></span><label><span>当前届次</span><select value={cohortId} onChange={(event) => setCohortId(event.target.value)} disabled={Boolean(allowedCohortId)}>{availableCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.year} 届</option>)}</select></label></div><label className="admin-photo-caption-field"><span>照片说明（上传时使用）</span><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="例如：2029 届第一次全员合影" /></label></div>
    <div className="admin-upload-box admin-photo-upload-box"><span><ImagePlus size={18} /></span><div><strong>上传届次合影</strong><small>支持 JPG、PNG、WebP，单张不超过 10 MB。{isRemoteClubConfigEnabled ? '保存后会同步到后端照片服务。' : '照片会保存在当前浏览器。'}</small>{uploadError && <small className="admin-upload-error">{uploadError}</small>}</div><input id="admin-cohort-photo-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} /><label className="secondary-button admin-small-button" htmlFor="admin-cohort-photo-upload">选择照片</label></div>
    <section className="admin-photo-library"><div className="admin-photo-library-head"><div><span className="eyebrow">PHOTO LIBRARY</span><h3>{cohortId ? `${sortedCohorts.find((cohort) => cohort.id === cohortId)?.year ?? ''} 届照片` : '照片库'}</h3></div><span>封面用于前台首图</span></div><div className="admin-photo-grid">{selectedPhotos.length ? selectedPhotos.map((photo) => <article key={photo.id}><div className="admin-photo-image-wrap">{photo.isCover && <span className="admin-photo-cover-label">封面</span>}<img src={photo.dataUrl} alt={photo.caption} /></div><div><div className="admin-photo-meta"><strong>{photo.caption}</strong><small>{photo.isCover ? '当前封面 · 已同步前台' : '普通照片'}</small></div><div className="admin-row-actions admin-photo-actions"><button className="admin-link-button" onClick={() => void makeCover(photo.id)} disabled={photo.isCover || photoActionBusy !== null}>{photo.isCover ? '已是封面' : photoActionBusy === photo.id ? '保存中…' : '设为封面'}</button><button className="admin-link-button admin-danger-link" onClick={() => void remove(photo.id)} disabled={photoActionBusy !== null}><Trash2 size={13} /> {photoActionBusy === photo.id ? '处理中…' : '删除'}</button></div></div></article>) : <div className="admin-empty admin-photo-empty"><span className="admin-photo-empty-icon"><Camera size={21} /></span><strong>这一届还没有照片</strong><span>从上方选择一张图片，照片墙就会开始建立。</span></div>}</div></section>
    <div className="admin-modal-foot admin-photo-modal-foot"><span><CheckCircle2 size={13} /> 照片会在前台即时同步</span><button className="secondary-button admin-small-button" onClick={onClose}>完成</button></div>
  </section></div>
}

function AdminCopyManager({ onClose }: { onClose: () => void }) {
  const { siteCopy, updateSiteCopy } = useClubConfig()
  const [selectedId, setSelectedId] = useState(siteCopy[0]?.id ?? '')
  const selected = siteCopy.find((item) => item.id === selectedId)
  const [draft, setDraft] = useState({ title: selected?.title ?? '', body: selected?.body ?? '', author: selected?.author ?? '' })
  const [saveError, setSaveError] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  useEffect(() => { if (selected) setDraft({ title: selected.title, body: selected.body, author: selected.author ?? '' }) }, [selectedId, selected])
  const save = async () => {
    if (!selected) return
    if (!draft.title.trim()) {
      setSaveError('标题不能为空。')
      return
    }
    setSaveError('')
    setSaveBusy(true)
    try {
      await updateSiteCopy(selected.id, { title: draft.title.trim(), body: draft.body.trim(), author: draft.author.trim() || null })
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '文案保存失败，请稍后重试。')
    } finally {
      setSaveBusy(false)
    }
  }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">COPY / EDITOR</p><h2>站点文案与寄语</h2><p>这里修改后会同步到工具页、首页和小组风采，不需要重新发布前端。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭文案管理"><X size={16} /></button></div><div className="admin-copy-tabs">{siteCopy.map((item) => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)} disabled={saveBusy}>{item.label}</button>)}</div>{selected && <div className="admin-editor-form"><label><span>标题 / 第一行</span><input value={draft.title} onChange={(event) => { setSaveError(''); setDraft({ ...draft, title: event.target.value }) }} /></label><label><span>正文 / 第二行</span><textarea rows={5} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><label><span>署名（可选）</span><input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label></div>}{saveError && <p className="admin-inline-error" role="alert">{saveError}</p>}<div className="admin-modal-foot"><span>保存后前台即时同步</span><div><button className="secondary-button admin-small-button" onClick={onClose} disabled={saveBusy}>取消</button><button className="primary-button admin-small-button" onClick={() => void save()} disabled={saveBusy}><Save size={14} /> {saveBusy ? '保存中…' : '保存文案'}</button></div></div></section></div>
}

function createEmptyCompetitionDraft(): CompetitionEditorValue {
  return { title: '', seriesName: '', type: '', organizer: '', officialUrl: '', registrationStart: '', registrationEnd: '', eventStart: '', eventEnd: '', resultDate: '', lifecycle: 'draft', date: '', deadline: '', description: '', status: '草稿', accent: 'blue', tracks: [], projects: [] }
}

function competitionDraftFromEvent(event?: CompetitionEvent): CompetitionEditorValue {
  if (!event) return createEmptyCompetitionDraft()
  return {
    title: event.title,
    seriesName: event.seriesName ?? '',
    type: event.type,
    organizer: event.organizer ?? '',
    officialUrl: event.officialUrl ?? '',
    registrationStart: competitionDateInput(event.registrationStart),
    registrationEnd: competitionDateInput(event.registrationEnd),
    eventStart: competitionDateInput(event.eventStart ?? event.date),
    eventEnd: competitionDateInput(event.eventEnd),
    resultDate: competitionDateInput(event.resultDate),
    lifecycle: event.lifecycle ?? 'published',
    date: event.date,
    deadline: event.deadline,
    description: event.description,
    status: competitionStage(event),
    accent: event.accent,
    tracks: (event.tracks ?? []).map((track) => ({ ...track, registrationStart: competitionDateInput(track.registrationStart), registrationEnd: competitionDateInput(track.registrationEnd) })),
    projects: (event.projects ?? []).map((project) => ({ ...project })),
  }
}

function parseCompetitionCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === ',' && !quoted) { values.push(current.trim()); current = ''; continue }
    current += char
  }
  values.push(current.trim())
  return values
}

function parseCompetitionCsv(text: string): { rows: CompetitionEditorValue[]; error?: string } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return { rows: [], error: '请至少提供一行表头和一条赛事记录。' }
  const aliases: Record<string, keyof CompetitionEditorValue> = { series: 'seriesName', seriesname: 'seriesName', 赛事系列: 'seriesName', title: 'title', 比赛名称: 'title', type: 'type', 比赛类型: 'type', organizer: 'organizer', 主办方: 'organizer', registrationstart: 'registrationStart', 报名开始: 'registrationStart', registrationend: 'registrationEnd', 报名截止: 'registrationEnd', eventstart: 'eventStart', 比赛开始: 'eventStart', eventend: 'eventEnd', 比赛结束: 'eventEnd', resultdate: 'resultDate', 结果公布: 'resultDate', officialurl: 'officialUrl', 官方链接: 'officialUrl', description: 'description', 比赛简介: 'description' }
  const headers = parseCompetitionCsvLine(lines[0]).map((header) => aliases[header.toLowerCase().replace(/[\s_-]/g, '')] ?? aliases[header])
  if (!headers.includes('title')) return { rows: [], error: '表头必须包含 title 或 比赛名称。' }
  const rows: CompetitionEditorValue[] = []
  lines.slice(1).forEach((line, rowIndex) => {
    const values = parseCompetitionCsvLine(line)
    const raw: Record<string, string> = {}
    headers.forEach((key, index) => { if (key) raw[key] = values[index] ?? '' })
    if (!raw.title?.trim()) return
    rows.push({ ...createEmptyCompetitionDraft(), title: raw.title.trim(), seriesName: raw.seriesName?.trim() ?? '', type: raw.type?.trim() || '其他', organizer: raw.organizer?.trim() ?? '', officialUrl: raw.officialUrl?.trim() ?? '', registrationStart: raw.registrationStart?.trim() ?? '', registrationEnd: raw.registrationEnd?.trim() ?? '', eventStart: raw.eventStart?.trim() ?? '', eventEnd: raw.eventEnd?.trim() ?? '', resultDate: raw.resultDate?.trim() ?? '', date: raw.eventStart?.trim() ?? '', deadline: raw.registrationEnd?.trim() ?? '', description: raw.description?.trim() || '暂无比赛简介', lifecycle: 'published', status: '即将开始', accent: ['blue', 'orange', 'violet', 'mint'][rowIndex % 4], projects: [] })
  })
  return rows.length ? { rows } : { rows: [], error: '没有读取到有效赛事，请检查 title 或 比赛名称列。' }
}

function CompetitionBatchImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: CompetitionEditorValue[], onProgress: (completed: number) => void) => Promise<void> }) {
  const [csv, setCsv] = useState('series,title,type,organizer,registrationStart,registrationEnd,eventStart,eventEnd,resultDate,officialUrl,description\n蓝桥杯,2027 蓝桥杯省赛,省级竞赛,蓝桥杯组委会,2027-03-01 00:00,2027-04-10 23:59,2027-04-20 09:00,2027-04-20 18:00,2027-05-01 00:00,https://example.com,填写赛事简介')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [hasAttempted, setHasAttempted] = useState(false)
  const parsed = parseCompetitionCsv(csv)
  const importRows = async () => {
    if (parsed.error || !parsed.rows.length) { setError(parsed.error ?? '请先填写赛事数据。'); return }
    if (completedCount >= parsed.rows.length) { setError('这批赛事已经全部导入，可以关闭此窗口。'); return }
    setError('')
    setBusy(true)
    setHasAttempted(true)
    const completedBeforeAttempt = completedCount
    try {
      await onImport(
        parsed.rows.slice(completedBeforeAttempt),
        (completed) => setCompletedCount(completedBeforeAttempt + completed),
      )
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '批量导入失败，请稍后重试。')
    } finally { setBusy(false) }
  }
  return <div className="admin-modal-scrim admin-nested-modal" role="presentation" onClick={(event) => { event.stopPropagation(); onClose() }}><section className="admin-form-modal competition-batch-modal" role="dialog" aria-modal="true" aria-labelledby="competition-batch-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">COMPETITIONS / IMPORT</p><h2 id="competition-batch-title">批量导入赛事</h2><p>一行一场比赛，支持英文表头或中文表头。带逗号的内容请用双引号包起来。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭批量导入"><X size={16} /></button></div><label className="competition-csv-field"><span>CSV 内容</span><textarea value={csv} disabled={busy || hasAttempted} onChange={(event) => { const nextCsv = event.target.value; setCsv(nextCsv); setError('') }} rows={10} spellCheck={false} /></label><div className="competition-import-preview"><span><Upload size={14} /> 已导入 {completedCount} / {parsed.rows.length} 场</span><small>{hasAttempted ? '本批次已开始导入，CSV 已锁定；若网络超时，请先刷新赛事列表确认结果再重试。' : parsed.error || '失败后可从尚未成功的赛事继续导入。'}</small></div>{error && <p className="admin-inline-error" role="alert">{error}</p>}<div className="admin-modal-foot"><span>请求失败后可继续导入剩余赛事</span><div><button className="secondary-button admin-small-button" onClick={onClose} disabled={busy}>取消</button><button className="primary-button admin-small-button" onClick={() => void importRows()} disabled={busy || Boolean(parsed.error) || completedCount >= parsed.rows.length}><Upload size={14} /> {busy ? '导入中…' : completedCount >= parsed.rows.length ? '已全部导入' : completedCount ? '继续导入' : hasAttempted ? '重试导入' : '导入赛事'}</button></div></div></section></div>
}

function AdminCompetitionManager({ events, onClose, onSave, onBatchSave, onDelete }: { events: CompetitionEvent[]; onClose: () => void; onSave: (id: string | undefined, value: CompetitionEditorValue, intent: 'draft' | 'publish' | 'save', onCreated: (event: CompetitionEvent) => void) => Promise<void>; onBatchSave: (values: CompetitionEditorValue[], onProgress: (completed: number) => void) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(events[0]?.id)
  const [createdEvent, setCreatedEvent] = useState<CompetitionEvent | null>(null)
  const selected = events.find((event) => event.id === selectedId) ?? (createdEvent?.id === selectedId ? createdEvent : undefined)
  const [draft, setDraft] = useState<CompetitionEditorValue>(() => competitionDraftFromEvent(events[0]))
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [competitionQuery, setCompetitionQuery] = useState('')
  const [trackQuery, setTrackQuery] = useState('')
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null)
  const [seriesFilter, setSeriesFilter] = useState('全部赛事系列')
  const [batchOpen, setBatchOpen] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const normalizedCompetitionQuery = competitionQuery.trim().toLowerCase()
  const seriesOptions = ['全部赛事系列', ...Array.from(new Set(events.map((event) => event.seriesName?.trim()).filter(Boolean) as string[])).sort()]
  const visibleEvents = events.filter((event) => {
    const matchesSeries = seriesFilter === '全部赛事系列' || event.seriesName === seriesFilter
    const matchesSearch = !normalizedCompetitionQuery || `${event.title} ${event.seriesName ?? ''} ${event.type} ${event.organizer ?? ''} ${competitionStage(event)} ${event.date} ${event.deadline}`.toLowerCase().includes(normalizedCompetitionQuery)
    return matchesSeries && matchesSearch
  })
  const visibleDraftTracks = draft.tracks.filter((track) => !trackQuery.trim() || `${track.name} ${track.format ?? ''} ${track.audience ?? ''} ${track.requirements ?? ''}`.toLowerCase().includes(trackQuery.trim().toLowerCase()))
  useEffect(() => {
    if (!selectedId) return
    if (events.some((event) => event.id === selectedId)) return
    if (createdEvent?.id === selectedId) return
    const next = events[0]
    setSelectedId(next?.id)
    setDraft(competitionDraftFromEvent(next))
  }, [events, selectedId, createdEvent])
  const select = (event?: CompetitionEvent) => { setSelectedId(event?.id); setCreatedEvent(null); setDraft(competitionDraftFromEvent(event)); setExpandedTrackId(null); setTrackQuery(''); setUploadError(''); setSaveError('') }
  const updateProject = (id: string, patch: Partial<CompetitionProject>) => setDraft((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) }))
  const addProject = () => setDraft((current) => ({ ...current, projects: [...current.projects, { id: `competition-project-${Date.now()}`, title: '', cohort: '', description: '', imageUrl: '', projectUrl: '' }] }))
  const removeProject = (id: string) => setDraft((current) => ({ ...current, projects: current.projects.filter((project) => project.id !== id) }))
  const updateTrack = (id: string, patch: Partial<CompetitionTrack>) => setDraft((current) => ({ ...current, tracks: current.tracks.map((track) => track.id === id ? { ...track, ...patch } : track) }))
  const addTrack = () => {
    const track: CompetitionTrack = { id: `competition-track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', description: '', audience: '', format: '个人/组队', teamSize: '', requirements: '', registrationStart: '', registrationEnd: '', registrationUrl: '', rulesUrl: '', awards: '' }
    setDraft((current) => ({ ...current, tracks: [...current.tracks, track] }))
    setExpandedTrackId(track.id)
    setTrackQuery('')
  }
  const removeTrack = (id: string) => {
    setDraft((current) => ({ ...current, tracks: current.tracks.filter((track) => track.id !== id) }))
    setExpandedTrackId((current) => current === id ? null : current)
  }
  const toggleTrackEditor = (id: string) => setExpandedTrackId((current) => current === id ? null : id)
  const uploadProjectImage = async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) { setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。'); event.target.value = ''; return }
    setUploadError('')
    if (isRemoteSettingsEnabled) {
      try { const asset = await uploadAsset(file, { folder: 'competition-projects', alt: '赛事历届项目图片' }); updateProject(id, { imageUrl: asset.url, imageAssetId: asset.id }) } catch (error) { setUploadError(error instanceof Error ? error.message : '图片上传失败，请稍后重试。') } finally { event.target.value = '' }
      return
    }
    const reader = new FileReader()
    reader.onerror = () => { setUploadError('图片读取失败，请重新选择文件。'); event.target.value = '' }
    reader.onload = () => { updateProject(id, { imageUrl: String(reader.result) }); event.target.value = '' }
    reader.readAsDataURL(file)
  }
  const removeSelected = () => {
    if (!selected) return
    setDeleteRequest({ title: '删除比赛？', message: '将删除“' + selected.title + '”及其历届项目资料，比赛中心详情页也会同步移除。', cancelLabel: '保留比赛', confirmLabel: '确认删除', onConfirm: async () => { setDeleteBusy(true); try { await onDelete(selected.id); setSelectedId(undefined); setDraft(competitionDraftFromEvent()); setDeleteRequest(null) } catch { /* Parent reports the request error. */ } finally { setDeleteBusy(false) } } })
  }
  const stagePreview = competitionStage({
    ...draft,
    id: selectedId ?? 'draft',
    title: draft.title,
    date: draft.eventStart || draft.date,
    deadline: draft.registrationEnd || draft.deadline,
  })
  const stagePreviewLabel = draft.lifecycle === 'archived' ? '已归档' : stagePreview
  const primarySaveIntent = draft.lifecycle === 'draft' || (draft.lifecycle === 'published' && selected?.lifecycle !== 'published') ? 'publish' : 'save'
  const primarySaveLabel = primarySaveIntent === 'publish' ? '发布赛事' : draft.lifecycle === 'archived' ? '保存归档' : '保存修改'
  const save = async (intent: 'draft' | 'publish' | 'save') => {
    if (!draft.title.trim() || !(draft.eventStart.trim() || draft.date.trim()) || !(draft.registrationEnd.trim() || draft.deadline.trim()) || !draft.description.trim()) {
      setSaveError('请填写比赛名称、比赛开始、报名截止和比赛简介。')
      return
    }
    if (draft.tracks.some((track) => !track.name.trim())) {
      setSaveError('请填写每个赛道的名称，或删除未使用的赛道。')
      return
    }
    setSaveError('')
    setSaveBusy(true)
    const lifecycle = intent === 'publish' ? 'published' : intent === 'draft' ? 'draft' : draft.lifecycle
    const status = lifecycle === 'draft'
      ? '草稿'
      : lifecycle === 'archived'
        ? '已结束'
        : competitionStage({ ...draft, id: selectedId ?? 'draft', lifecycle, date: draft.eventStart || draft.date, deadline: draft.registrationEnd || draft.deadline })
    const value = { ...draft, lifecycle, status }
    try {
      await onSave(selectedId, value, intent, (event) => {
        setCreatedEvent(event)
        setSelectedId(event.id)
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '比赛保存失败，请稍后重试。')
    } finally {
      setSaveBusy(false)
    }
  }
  const updateDraft = (patch: Partial<CompetitionEditorValue>) => {
    setSaveError('')
    setDraft((current) => ({ ...current, ...patch }))
  }
  const editorContent = selected || !events.length || !selectedId
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}>
    <section className="admin-editor-modal admin-competition-modal" role="dialog" aria-modal="true" aria-labelledby="competition-manager-title" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-head">
        <div><p className="eyebrow">COMPETITIONS / EDITOR</p><h2 id="competition-manager-title">比赛中心管理</h2><p>管理赛事信息、时间节点和历届成果；赛事状态根据时间自动计算。</p></div>
        <div className="admin-competition-head-actions">
          <button className="secondary-button admin-small-button" onClick={() => setBatchOpen(true)} disabled={saveBusy}><Upload size={14} /> 批量导入</button>
          <button className="icon-button small" onClick={onClose} aria-label="关闭比赛管理"><X size={16} /></button>
        </div>
      </div>
      <div className="admin-competition-layout">
        <aside className="admin-competition-sidebar">
          <div className="admin-competition-sidebar-actions"><strong>赛事列表 <small>({events.length})</small></strong><button className="admin-link-button" onClick={() => select()} disabled={saveBusy}><Plus size={14} /> 新建</button></div>
          <label className="admin-search"><Search size={14} /><input value={competitionQuery} onChange={(event) => setCompetitionQuery(event.target.value)} placeholder="搜索赛事或主办方" aria-label="搜索赛事" /></label>
          <select className="admin-filter-select competition-series-filter" value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)} aria-label="按赛事系列筛选">{seriesOptions.map((option) => <option key={option}>{option}</option>)}</select>
          <div className="admin-competition-event-list">{visibleEvents.map((event) => <button key={event.id} className={selectedId === event.id ? 'active' : ''} onClick={() => select(event)} aria-current={selectedId === event.id ? 'true' : undefined}><span className="competition-list-dot" data-accent={event.accent} /><span><strong>{event.title}</strong><small>{event.seriesName || event.type} · {event.lifecycle === 'archived' ? '已归档' : competitionStage(event)}</small></span></button>)}{!visibleEvents.length && <div className="admin-empty"><Search size={18} /><span>{events.length ? '没有符合条件的赛事' : '还没有赛事'}</span></div>}</div>
          <p className="admin-competition-sidebar-note"><CircleHelp size={13} /> 保存后会同步到公开比赛中心；已开始导入的批次保留原内容以支持安全续传。</p>
        </aside>
        <div className="admin-competition-editor-shell">
          <div className="admin-editor-form admin-competition-editor">
            {editorContent ? <>
            <section className="competition-editor-section">
              <div className="competition-editor-section-head"><div><p className="eyebrow">BASIC INFORMATION</p><h3>赛事信息</h3></div></div>
              <label><span>比赛名称 <b>*</b></span><input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="例如：2027 蓝桥杯省赛" /></label>
              <div className="admin-editor-form-grid">
                <label><span>赛事系列</span><input value={draft.seriesName} onChange={(event) => updateDraft({ seriesName: event.target.value })} placeholder="例如：蓝桥杯" /></label>
                <label><span>比赛类型</span><input value={draft.type} onChange={(event) => updateDraft({ type: event.target.value })} placeholder="程序设计 / 创新创业" /></label>
              </div>
              <div className="admin-editor-form-grid">
                <label><span>主办方</span><input value={draft.organizer} onChange={(event) => updateDraft({ organizer: event.target.value })} placeholder="赛事主办单位" /></label>
                <label><span>官方链接</span><input type="url" value={draft.officialUrl} onChange={(event) => updateDraft({ officialUrl: event.target.value })} placeholder="https://..." /></label>
              </div>
            </section>
            <section className="competition-editor-section">
              <div className="competition-editor-section-head"><div><p className="eyebrow">SCHEDULE</p><h3>比赛日程</h3></div><span className="competition-auto-note"><Clock3 size={13} /> 状态自动更新</span></div>
              <div className="admin-editor-form-grid">
                <label><span>报名开始</span><input type="datetime-local" value={draft.registrationStart} onChange={(event) => updateDraft({ registrationStart: event.target.value })} /></label>
                <label><span>报名截止 <b>*</b></span><input type="datetime-local" value={draft.registrationEnd} onChange={(event) => updateDraft({ registrationEnd: event.target.value, deadline: event.target.value })} /></label>
                <label><span>比赛开始 <b>*</b></span><input type="datetime-local" value={draft.eventStart} onChange={(event) => updateDraft({ eventStart: event.target.value, date: event.target.value })} /></label>
                <label><span>比赛结束</span><input type="datetime-local" value={draft.eventEnd} onChange={(event) => updateDraft({ eventEnd: event.target.value })} /></label>
                <label><span>结果公布</span><input type="datetime-local" value={draft.resultDate} onChange={(event) => updateDraft({ resultDate: event.target.value })} /></label>
                <label><span>发布状态</span><select value={draft.lifecycle} onChange={(event) => updateDraft({ lifecycle: event.target.value as CompetitionEditorValue['lifecycle'] })}><option value="draft">草稿</option><option value="published">公开</option><option value="archived">归档</option></select></label>
              </div>
              <div className="competition-stage-preview"><span>前台显示状态</span><strong>{draft.lifecycle === 'draft' ? '草稿' : stagePreviewLabel}</strong></div>
            </section>
            <section className="competition-editor-section">
              <div className="competition-editor-section-head"><div><p className="eyebrow">TRACKS / REGISTRATION</p><h3>比赛赛道</h3></div><div className="competition-track-editor-actions"><span>{draft.tracks.length} 个赛道</span><button type="button" className="secondary-button admin-small-button" onClick={addTrack}><Plus size={14} /> 添加赛道</button></div></div>
              {draft.tracks.length > 6 && <div className="admin-search competition-track-search"><Search size={14} /><input value={trackQuery} onChange={(event) => setTrackQuery(event.target.value)} placeholder="搜索赛道名称、赛制或参赛对象" aria-label="搜索赛道" /></div>}
              <div className="competition-track-editor-list">{visibleDraftTracks.map((track) => {
                const index = draft.tracks.findIndex((item) => item.id === track.id)
                const isExpanded = expandedTrackId === track.id
                const detailsId = `competition-track-editor-details-${track.id}`
                const formatOptions = ['个人/组队', '个人赛', '组队赛']
                const summaryParts = [track.format || '赛制待设置', track.audience || '参赛对象待设置', track.registrationEnd ? `截止 ${competitionDateLabel(track.registrationEnd)}` : '报名截止待设置']
                return <article className={`competition-track-editor ${isExpanded ? 'is-expanded' : ''}`} key={track.id}>
                  <div className="competition-track-editor-head">
                    <button type="button" className="competition-track-editor-toggle" aria-expanded={isExpanded} aria-controls={isExpanded ? detailsId : undefined} onClick={() => toggleTrackEditor(track.id)}>
                      <span><strong>{track.name.trim() || `赛道 ${String(index + 1).padStart(2, '0')}（未命名）`}</strong><small>{summaryParts.join(' · ')}</small></span><ChevronDown size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="admin-link-button admin-danger-link" onClick={() => removeTrack(track.id)} aria-label={`删除${track.name || `赛道 ${index + 1}`}`}><Trash2 size={13} /><span>删除</span></button>
                  </div>
                  {isExpanded && <div className="competition-track-editor-details" id={detailsId}>
                    <div className="admin-editor-form-grid">
                      <label><span>赛道名称 <b>*</b></span><input value={track.name} onChange={(event) => updateTrack(track.id, { name: event.target.value })} placeholder="例如：软件设计、电子设计" /></label>
                      <label><span>赛制</span><select value={track.format ?? '个人/组队'} onChange={(event) => updateTrack(track.id, { format: event.target.value })}>{track.format && !formatOptions.includes(track.format) && <option value={track.format}>{track.format}</option>}{formatOptions.map((format) => <option key={format}>{format}</option>)}</select></label>
                      <label><span>参赛对象</span><input value={track.audience ?? ''} onChange={(event) => updateTrack(track.id, { audience: event.target.value })} placeholder="例如：在校本科生" /></label>
                      <label><span>队伍人数</span><input value={track.teamSize ?? ''} onChange={(event) => updateTrack(track.id, { teamSize: event.target.value })} placeholder="例如：2-4 人；个人赛可留空" /></label>
                    </div>
                    <label><span>赛道介绍</span><textarea rows={2} value={track.description ?? ''} onChange={(event) => updateTrack(track.id, { description: event.target.value })} placeholder="介绍赛道方向、作品形式或考核内容" /></label>
                    <label><span>参赛要求</span><textarea rows={2} value={track.requirements ?? ''} onChange={(event) => updateTrack(track.id, { requirements: event.target.value })} placeholder="填写资格、提交材料或其他要求" /></label>
                    <div className="admin-editor-form-grid">
                      <label><span>赛道报名开始</span><input type="datetime-local" value={track.registrationStart ?? ''} onChange={(event) => updateTrack(track.id, { registrationStart: event.target.value })} /></label>
                      <label><span>赛道报名截止</span><input type="datetime-local" value={track.registrationEnd ?? ''} onChange={(event) => updateTrack(track.id, { registrationEnd: event.target.value })} /></label>
                      <label><span>赛道报名链接</span><input type="url" value={track.registrationUrl ?? ''} onChange={(event) => updateTrack(track.id, { registrationUrl: event.target.value })} placeholder="https://..." /></label>
                      <label><span>赛道规则链接</span><input type="url" value={track.rulesUrl ?? ''} onChange={(event) => updateTrack(track.id, { rulesUrl: event.target.value })} placeholder="https://..." /></label>
                    </div>
                    <label><span>奖项设置</span><input value={track.awards ?? ''} onChange={(event) => updateTrack(track.id, { awards: event.target.value })} placeholder="例如：特等奖、一等奖、二等奖" /></label>
                  </div>}
                </article>
              })}
              {draft.tracks.length === 0 && <div className="admin-empty competition-track-empty"><Trophy size={19} /><strong>尚未添加比赛赛道</strong><span>不同赛道可以分别填写参赛要求、报名时间和规则链接。</span></div>}
              {draft.tracks.length > 0 && visibleDraftTracks.length === 0 && <div className="competition-track-no-results">没有找到匹配的赛道。</div>}</div>
            </section>
            <section className="competition-editor-section">
              <div className="competition-editor-section-head"><div><p className="eyebrow">DESCRIPTION</p><h3>比赛简介</h3></div></div>
              <label><span>说明 <b>*</b></span><textarea rows={4} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="介绍比赛内容、报名方式和注意事项" /></label>
            </section>
            <section className="competition-editor-section">
              <div className="competition-editor-section-head"><div><p className="eyebrow">PAST PROJECTS</p><h3>历届成果</h3></div><button className="secondary-button admin-small-button" onClick={addProject}><Plus size={14} /> 添加成果</button></div>
              <div className="competition-project-editor-list">{uploadError && <small className="admin-upload-error">{uploadError}</small>}{draft.projects.map((project) => <article className="competition-project-editor" key={project.id}><div className="competition-project-editor-fields"><div className="admin-editor-form-grid"><label><span>届次</span><input value={project.cohort} onChange={(event) => updateProject(project.id, { cohort: event.target.value })} placeholder="2029" /></label><label><span>项目名称</span><input value={project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} placeholder="校园智能问答" /></label></div><label><span>项目说明</span><textarea rows={2} value={project.description} onChange={(event) => updateProject(project.id, { description: event.target.value })} placeholder="说明项目内容、获奖情况等" /></label><label><span>项目链接</span><input type="url" value={project.projectUrl ?? ''} onChange={(event) => updateProject(project.id, { projectUrl: event.target.value })} placeholder="https://..." /></label></div><div className="competition-project-editor-media">{project.imageUrl ? <img src={project.imageUrl} alt="历届项目预览" /> : <div className="competition-project-placeholder"><ImagePlus size={20} /><span>暂无图片</span></div>}<input className="admin-file-input" id={`competition-project-image-${project.id}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadProjectImage(project.id, event)} /><label className="secondary-button admin-small-button" htmlFor={`competition-project-image-${project.id}`}>上传图片</label><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeProject(project.id)}><Trash2 size={13} /> 删除成果</button></div></article>)}{draft.projects.length === 0 && <div className="admin-empty competition-project-empty"><Trophy size={20} /><strong>尚无历届成果</strong><span>添加后，比赛详情会展示往届项目。</span></div>}</div>
            </section>
            </> : <div className="admin-empty competition-project-empty"><Trophy size={22} /><strong>从列表选择赛事，或新建一场比赛</strong><span>赛事较多时可用搜索和系列筛选快速定位。</span><button className="primary-button admin-small-button" onClick={() => select()}><Plus size={14} /> 新建赛事</button></div>}
            {saveError && <p className="admin-inline-error" role="alert">{saveError}</p>}
          </div>
          <div className="admin-modal-foot admin-competition-actions">
            <span>{selected ? '保存后会同步到比赛中心' : '填写赛事信息后可保存草稿或发布'}</span>
            <div className="admin-modal-actions">
              <button className="admin-link-button admin-danger-link" disabled={!selected || saveBusy || deleteBusy} onClick={() => void removeSelected()}><Trash2 size={13} /> 删除</button>
              <button className="secondary-button admin-small-button" onClick={onClose} disabled={saveBusy}>关闭</button>
              {draft.lifecycle === 'draft' ? <>
                <button className="secondary-button admin-small-button" onClick={() => void save('draft')} disabled={!editorContent || saveBusy || deleteBusy}><Save size={14} /> {saveBusy ? '保存中…' : '保存草稿'}</button>
                <button className="primary-button admin-small-button" onClick={() => void save('publish')} disabled={!editorContent || saveBusy || deleteBusy}><Send size={14} /> {saveBusy ? '发布中…' : '发布赛事'}</button>
              </> : <button className="primary-button admin-small-button" onClick={() => void save(primarySaveIntent)} disabled={!editorContent || saveBusy || deleteBusy}>{primarySaveIntent === 'publish' ? <Send size={14} /> : <Save size={14} />} {saveBusy ? primarySaveIntent === 'publish' ? '发布中…' : '保存中…' : primarySaveLabel}</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
    {batchOpen && <CompetitionBatchImportModal onClose={() => setBatchOpen(false)} onImport={onBatchSave} />}
    {deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}
  </div>
}
type AdminNavItem = {
  id: AdminSection
  label: string
  description: string
  icon: LucideIcon
  leaderOnly?: boolean
}

const adminNavItems: AdminNavItem[] = [
  { id: 'overview', label: '概览', description: '权限与站点状态', icon: Gauge },
  { id: 'cohorts', label: '届次与小组', description: '管理组织结构', icon: Layers3 },
  { id: 'members', label: '成员账号', description: '资料与权限', icon: UserCog },
  { id: 'content', label: '内容管理', description: '项目、资源与面经', icon: Folder },
  { id: 'announcements', label: '公告管理', description: '发布与下线', icon: Megaphone },
  { id: 'contributions', label: '审核中心', description: '处理内容投稿与项目申请', icon: Send, leaderOnly: true },
  { id: 'invites', label: '邀请码', description: '生成加入凭证', icon: KeyRound, leaderOnly: true },
  { id: 'personalization', label: '个性化设置', description: '背景、文案与个人偏好', icon: Palette },
  { id: 'security', label: '安全设置', description: '访问策略与会话', icon: ShieldAlert, leaderOnly: true },
  { id: 'logs', label: '操作日志', description: '查看关键操作记录', icon: ScrollText, leaderOnly: true },
]

const adminSectionMeta: Record<AdminSection, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'ADMIN / OVERVIEW', title: '控制台概览', description: '从这里掌握小组内容、成员与访问策略的整体状态。' },
  cohorts: { eyebrow: 'ADMIN / STRUCTURE', title: '届次与小组', description: '维护届次、方向和负责人边界，保证每一届的内容可追溯。' },
  members: { eyebrow: 'ADMIN / ACCOUNTS', title: '成员账号', description: '管理成员资料、角色与账号状态。密码只通过安全流程重置。' },
  content: { eyebrow: 'ADMIN / CONTENT', title: '内容管理', description: '统一维护学习路线、项目、资源、面经和比赛数据。' },
  announcements: { eyebrow: 'ADMIN / BROADCAST', title: '公告管理', description: '发布、编辑和下线面向小组成员的站内公告。' },
  contributions: { eyebrow: 'ADMIN / MODERATION', title: '审核中心', description: '在内容投稿和项目加入申请之间切换，分别按各自流程处理。' },
  invites: { eyebrow: 'ADMIN / INVITES', title: '邀请码', description: '生成有有效期和使用次数限制的组员邀请凭证。' },
  personalization: { eyebrow: 'ADMIN / EXPERIENCE', title: '个性化设置', description: '管理全站校园背景和首页文案，同时保留成员的个人外观选择。' },
  security: { eyebrow: 'ADMIN / SECURITY', title: '安全设置', description: '配置后台访问策略与会话规则；隧道进程由服务器运维管理。' },
  logs: { eyebrow: 'ADMIN / AUDIT', title: '操作日志', description: '查看关键审核、账号和全站设置操作，方便追溯责任。' },
}

function readAdminPreference<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeAdminPreference(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage may be unavailable. */ }
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function formatInviteExpiry(expiresAt: string) {
  const remainingMs = Date.parse(expiresAt) - Date.now()
  if (remainingMs <= 0) return '已过期'
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000))
  if (remainingHours < 24) return `还剩 ${remainingHours} 小时`
  return `还剩 ${Math.ceil(remainingHours / 24)} 天`
}

const inviteStatusLabels: Record<InviteCode['status'], string> = {
  active: '可使用',
  expired: '已过期',
  exhausted: '次数用完',
  revoked: '已撤销',
}

type AdminMemberRecord = Member & {
  source: 'member' | 'account'
  account?: AuthUser
}

function adminMemberSelectionKey(member: AdminMemberRecord) {
  return member.account ? `account:${member.account.id}` : `member:${member.id}`
}

type ManagedAccountRoleDraft = {
  accountId: string
  role: 'Member' | 'Contributor' | 'CohortLeader' | 'Leader'
  cohort: string
  direction: string
}

type AdminFeedbackRecord = {
  id: string
  category: string
  content: string
  contact?: string
  createdAt: string
  status?: 'pending' | 'read' | 'resolved'
  reviewNote?: string
}

function getContributionStatusLabel(row: AdminContributionRow) {
  if (row.type === 'feedback') {
    return row.feedback?.status === 'resolved' ? '已处理' : row.feedback?.status === 'read' ? '已查看' : '待查看'
  }
  if (row.status === 'changes_requested') return '要求修改'
  if (row.status === 'approved') return '已通过'
  if (row.status === 'rejected') return '已退回'
  return '待处理'
}

function getContributionStatusTone(row: AdminContributionRow) {
  if (row.type === 'feedback') {
    return row.feedback?.status === 'resolved' ? 'mint' : row.feedback?.status === 'read' ? 'blue' : 'orange'
  }
  if (row.status === 'pending' || row.status === 'changes_requested') return 'orange'
  return row.status === 'approved' ? 'mint' : 'red'
}

export function AdminPage({ onNavigate, theme, backgroundPreference, onBackgroundPreferenceChange, backgroundImage, onBackgroundImageChange }: { onNavigate: (path: string) => void; theme: Theme; backgroundPreference: BackgroundPreference; onBackgroundPreferenceChange: (value: BackgroundPreference) => void; backgroundImage: string | null; onBackgroundImageChange: (value: string | null) => void }) {
  const { user, loading, updateProfile, changePassword } = useAuth()
  const { sortedCohorts, currentCohort, loading: configLoading, error: configError, refresh: refreshClubConfig } = useClubConfig()
  const { data, loading: contentLoading, error: contentError, refresh, updateMemberProfileInCache, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createPrompt, updatePrompt, deletePrompt, listProjectReviewQueue, reviewProject, createProjectCategory, updateProjectCategory, deleteProjectCategory, createResourceCategory, updateResourceCategory, deleteResourceCategory, createResource, updateResource, deleteResource, createInterviewCategory, updateInterviewCategory, deleteInterviewCategory, createInterview, updateInterview, deleteInterview, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute, updateWorkbench } = useContent()
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    try {
      const focus = window.sessionStorage.getItem('club-admin-focus-section')
      window.sessionStorage.removeItem('club-admin-focus-section')
      if (focus && ['overview', 'cohorts', 'members', 'content', 'announcements', 'contributions', 'invites', 'personalization', 'security', 'logs'].includes(focus)) return focus as AdminSection
    } catch { /* Storage may be unavailable. */ }
    return 'overview'
  })
  const [memberSearch, setMemberSearch] = useState('')
  const [memberCohortFilter, setMemberCohortFilter] = useState('全部')
  const [memberTeamFilter, setMemberTeamFilter] = useState('全部')
  const [memberPage, setMemberPage] = useState(1)
  const [announcementQuery, setAnnouncementQuery] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [logQuery, setLogQuery] = useState('')
  const [logPage, setLogPage] = useState(1)
  const membersPerPage = 8
  const serviceStatusDetails = [contentError, configError].filter((message): message is string => Boolean(message)).join('；')
  const serviceStatusLabel = contentLoading || configLoading
    ? '正在同步内容'
    : contentError && configError
      ? '部分服务异常'
      : contentError
        ? '部分内容异常'
        : configError
          ? '组织配置异常'
          : '服务已连接'
  const [globalBackground, setGlobalBackground] = useState(() => readAdminPreference('club-admin-global-background', true))
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [backgroundFileName, setBackgroundFileName] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('负责维护本届内容与成员协作')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const announcementItems = data.announcements.map((item) => ({ id: item.id, category: item.category, title: item.title, detail: item.detail, scope: item.scope ?? '全站公开', published: item.published !== false, date: item.date }))
  const memberItems = data.members
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft | null>(null)
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null)
  const [contentDraft, setContentDraft] = useState<ContentDraft | null>(null)
  const [projectReviewQueue, setProjectReviewQueue] = useState<Project[]>([])
  const [projectReviewLoading, setProjectReviewLoading] = useState(false)
  const [projectReviewError, setProjectReviewError] = useState('')
  const [projectReviewBusyId, setProjectReviewBusyId] = useState<string | null>(null)
  const [projectJoinRequests, setProjectJoinRequests] = useState<ProjectJoinRequest[]>([])
  const [projectJoinRequestsLoading, setProjectJoinRequestsLoading] = useState(false)
  const [projectJoinRequestsError, setProjectJoinRequestsError] = useState('')
  const [projectJoinRequestBusyId, setProjectJoinRequestBusyId] = useState<string | null>(null)
  const [collectionManager, setCollectionManager] = useState<AdminCollectionKind | null>(null)
  const [workbenchManagerOpen, setWorkbenchManagerOpen] = useState(false)
  const [categoryManagerResource, setCategoryManagerResource] = useState<CategoryResource | null>(null)
  const [learningRouteOpen, setLearningRouteOpen] = useState(false)
  const [learningRouteId, setLearningRouteId] = useState('pyagent')

  const [cohortManagerOpen, setCohortManagerOpen] = useState(false)
  const [cohortManagerInitialId, setCohortManagerInitialId] = useState<string | undefined>(undefined)
  const [selectedCohortId, setSelectedCohortId] = useState(() => currentCohort?.id ?? sortedCohorts[0]?.id ?? '')
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false)
  const [copyManagerOpen, setCopyManagerOpen] = useState(false)
  const [promptManagerOpen, setPromptManagerOpen] = useState(false)
  const [competitionManagerOpen, setCompetitionManagerOpen] = useState(false)
  const [ipRestriction, setIpRestriction] = useState(() => readAdminPreference('club-admin-ip-restriction', false))
  const [sessionPolicy, setSessionPolicy] = useState(() => readAdminPreference('club-admin-session-policy', true))
  const [tunnelStatus, setTunnelStatus] = useState(() => readAdminPreference('club-admin-tunnel-status', '未连接'))
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [inviteFilter, setInviteFilter] = useState<'active' | 'all'>('active')
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState(() => toDateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
  const [inviteMaxUses, setInviteMaxUses] = useState('1')
  const [inviteCohort, setInviteCohort] = useState(() => currentCohort?.year ?? sortedCohorts[0]?.year ?? '2029')
  const [inviteDirection, setInviteDirection] = useState('算法组')
  const [contributionSubmissions, setContributionSubmissions] = useState<ContributionSubmission[]>([])
  const [interviewReviewQueue, setInterviewReviewQueue] = useState<InterviewSubmission[]>([])
  const [interviewReviewPage, setInterviewReviewPage] = useState({ page: 1, pageSize: 100, total: 0 })
  const [interviewPendingTotal, setInterviewPendingTotal] = useState(0)
  const [interviewReviewLoading, setInterviewReviewLoading] = useState(false)
  const [interviewReviewError, setInterviewReviewError] = useState('')
  const [promptReviewQueue, setPromptReviewQueue] = useState<PromptReviewItem[]>([])
  const [promptReviewError, setPromptReviewError] = useState('')
  const [promptReviewBusyId, setPromptReviewBusyId] = useState<string | null>(null)
  const [contributionTypeFilter, setContributionTypeFilter] = useState<'all' | 'project' | 'resource' | 'feedback' | 'interview' | 'prompt'>('all')
  const [contributionWorkspaceTab, setContributionWorkspaceTab] = useState<'contributions' | 'join-requests'>('contributions')
  const [contributionStatusFilter, setContributionStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'changes_requested' | 'read' | 'resolved' | 'all'>('pending')
  const [contributionQuery, setContributionQuery] = useState('')
  const [contributionCohortFilter, setContributionCohortFilter] = useState('all')
  const [contributionDirectionFilter, setContributionDirectionFilter] = useState('all')
  const [feedbackMessages, setFeedbackMessages] = useState<AdminFeedbackRecord[]>([])
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null)
  const [selectedContribution, setSelectedContributionState] = useState<AdminContributionRow | null>(null)
  const [selectedInterviewReview, setSelectedInterviewReview] = useState<InterviewSubmission | null>(null)
  const setSelectedContribution = (row: AdminContributionRow | null) => {
    if (row?.type === 'interview' && row.interview) {
      setSelectedContributionState(null)
      setSelectedInterviewReview(row.interview)
      return
    }
    setSelectedInterviewReview(null)
    setSelectedContributionState(row)
  }
  const [accountStatuses, setAccountStatuses] = useState<Record<string, AccountStatus>>(() => isDemoAuth ? readAdminPreference('club-demo-account-statuses', {}) : {})
  const [demoAccountDirectory, setDemoAccountDirectory] = useState<AuthUser[]>([])
  const [accountRoleEditorId, setAccountRoleEditorId] = useState<string | null>(null)
  const [accountRoleDraft, setAccountRoleDraft] = useState<ManagedAccountRoleDraft | null>(null)
  const [accountRoleBusy, setAccountRoleBusy] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [auditActionBusy, setAuditActionBusy] = useState(false)
  const [auditDeleteRequest, setAuditDeleteRequest] = useState<AdminDeleteRequest | null>(null)


  useEffect(() => { writeAdminPreference('club-admin-global-background', globalBackground) }, [globalBackground])
  useEffect(() => { writeAdminPreference('club-admin-ip-restriction', ipRestriction) }, [ipRestriction])
  useEffect(() => { writeAdminPreference('club-admin-session-policy', sessionPolicy) }, [sessionPolicy])
  useEffect(() => { writeAdminPreference('club-admin-tunnel-status', tunnelStatus) }, [tunnelStatus])
  useEffect(() => { if (isDemoAuth) writeAdminPreference('club-demo-account-statuses', accountStatuses) }, [accountStatuses])
  useEffect(() => {
    if (!user || !canManageInvites(user)) {
      setInviteCodes([])
      setDemoAccountDirectory([])
      return
    }
    const loadAdminApiData = async () => {
      try { setInviteCodes(await listInviteCodes()) } catch { setInviteCodes([]) }
      try { setDemoAccountDirectory(await listManagedAccounts()) } catch { setDemoAccountDirectory([]) }
    }
    void loadAdminApiData()
    const refreshInviteStatuses = () => { void listInviteCodes().then(setInviteCodes).catch(() => setInviteCodes([])) }
    const timer = window.setInterval(refreshInviteStatuses, 60_000)
    return () => window.clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (!user || !canManageGlobalContent(user)) {
      setContributionSubmissions([])
      return
    }
    void listContributionSubmissions({ reviewQueueOnly: true }).then(setContributionSubmissions).catch(() => setContributionSubmissions([]))
  }, [user])

  useEffect(() => {
    if (!user || !canManageGlobalContent(user) || apiConfig.contentSource !== 'api') {
      setPromptReviewQueue([])
      setPromptReviewError('')
      return
    }
    void listPromptReviewQueue()
      .then(setPromptReviewQueue)
      .catch((error) => {
        setPromptReviewQueue([])
        setPromptReviewError(error instanceof Error ? error.message : 'Prompt 投稿暂时无法加载')
      })
  }, [user])

  const loadInterviewReviewQueue = useCallback(async (page = 1, append = false) => {
    if (!user || !canAccessAdmin(user)) {
      setInterviewReviewQueue([])
      setInterviewReviewPage({ page: 1, pageSize: 100, total: 0 })
      setInterviewPendingTotal(0)
      setInterviewReviewError('')
      return
    }
    setInterviewReviewLoading(true)
    setInterviewReviewError('')
    try {
      const queuePage = await listInterviewReviewQueue({ page, pageSize: 100 })
      const queue = queuePage.items.filter((submission) => canManageContent(user, submission.cohort))
      setInterviewReviewQueue((current) => {
        if (!append) return queue
        const merged = new globalThis.Map(current.map((item) => [item.id, item]))
        queue.forEach((item) => merged.set(item.id, item))
        return [...merged.values()]
      })
      setInterviewReviewPage(queuePage.page)
      setInterviewPendingTotal(queuePage.page.total)
    } catch (reason) {
      if (!append) setInterviewReviewQueue([])
      setInterviewReviewError(reason instanceof Error ? reason.message : '面经审核队列暂时无法加载')
    } finally { setInterviewReviewLoading(false) }
  }, [user])

  useEffect(() => { void loadInterviewReviewQueue() }, [loadInterviewReviewQueue])

  useEffect(() => {
    if (!user || !canManageGlobalContent(user)) { setFeedbackMessages([]); return }
    void listFeedbackMessages({ page: 1, pageSize: 100 }).then((items) => setFeedbackMessages(items)).catch(() => setFeedbackMessages([]))
  }, [activeSection, user])

  useEffect(() => {
    if (!user || !canManageGlobalContent(user) || !isRemoteAuditEnabled) {
      setAuditLogs([])
      setAuditError('')
      setAuditLoading(false)
      return
    }
    if (activeSection !== 'logs') return
    let active = true
    setAuditLoading(true)
    setAuditError('')
    void listAllAuditLogs().then((logs) => {
      if (active) {
        setAuditLogs(logs)
      }
    }).catch((error) => {
      if (active) {
        setAuditLogs([])
        setAuditError(error instanceof Error ? error.message : '操作日志暂时无法加载')
      }
    }).finally(() => { if (active) setAuditLoading(false) })
    return () => { active = false }
  }, [activeSection, user])

  useEffect(() => {
    const isGlobalLeader = user?.role === 'Leader' || user?.role === 'Admin'
    if (!isGlobalLeader && activeSection === 'logs') setActiveSection('overview')
  }, [activeSection, user])

  const loadProjectReviewQueue = useCallback(async () => {
    const canReviewProjects = user?.role === 'Leader'
      || user?.role === 'Admin'
      || user?.role === 'CohortLeader'

    if (!canReviewProjects) {
      setProjectReviewQueue([])
      setProjectReviewError('')
      return
    }

    setProjectReviewLoading(true)
    setProjectReviewError('')

    try {
      setProjectReviewQueue(await listProjectReviewQueue())
    } catch (error) {
      setProjectReviewQueue([])
      setProjectReviewError(
        error instanceof Error
          ? error.message
          : '项目审核队列暂时无法加载',
      )
    } finally {
      setProjectReviewLoading(false)
    }
  }, [listProjectReviewQueue, user?.role])

  useEffect(() => {
    void loadProjectReviewQueue()
  }, [loadProjectReviewQueue])

  const loadProjectJoinRequests = useCallback(async () => {
    const canReviewJoinRequests = user?.role === 'Leader'
      || user?.role === 'Admin'
      || user?.role === 'CohortLeader'

    if (!canReviewJoinRequests) {
      setProjectJoinRequests([])
      setProjectJoinRequestsError('')
      return
    }

    setProjectJoinRequestsLoading(true)
    setProjectJoinRequestsError('')
    try {
      setProjectJoinRequests(await listProjectJoinRequests('pending'))
    } catch (error) {
      setProjectJoinRequests([])
      setProjectJoinRequestsError(error instanceof Error ? error.message : '项目加入申请暂时无法加载')
    } finally {
      setProjectJoinRequestsLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    void loadProjectJoinRequests()
  }, [loadProjectJoinRequests])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const allowedYear = user?.role === 'CohortLeader' ? user.cohort.replace(/\D/g, '') : ''
    const available = sortedCohorts.filter((cohort) => !allowedYear || cohort.year.replace(/\D/g, '') === allowedYear)
    if (!available.some((cohort) => cohort.id === selectedCohortId)) setSelectedCohortId(available[0]?.id ?? '')
  }, [selectedCohortId, sortedCohorts, user?.cohort, user?.role])

  useEffect(() => {
    const nextCohort = sortedCohorts.find((cohort) => cohort.year === inviteCohort) ?? currentCohort
    const directions = nextCohort?.teams.map((team) => team.name) ?? []
    if (directions.length && !directions.includes(inviteDirection)) setInviteDirection(directions[0])
  }, [currentCohort, inviteCohort, inviteDirection, sortedCohorts])

  useEffect(() => {
    if (!user) return
    setProfileName(user.name)
    setProfileBio(user.bio ?? '负责维护本届内容与成员协作')
    setProfileAvatar(user.avatarUrl ?? null)
  }, [user])

  if (loading) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><ShieldCheck size={22} /></span><p className="eyebrow">ADMIN / SESSION</p><h1>正在读取权限</h1><p>请稍候，系统正在确认你的管理员身份。</p></div></div>

  if (!user) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><LockKeyhole size={22} /></span><p className="eyebrow">ADMIN / SIGN IN REQUIRED</p><h1>请先登录</h1><p>管理后台只对届次负责人和组长开放，登录后才能继续。</p><button className="primary-button" onClick={() => onNavigate('#/login')}>前往登录 <ArrowRight size={15} /></button></div></div>

  if (!canAccessAdmin(user)) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><ShieldAlert size={22} /></span><p className="eyebrow">ADMIN / ACCESS DENIED</p><h1>暂时没有后台权限</h1><p>当前身份为“{roleLabels[user.role] ?? user.role}”，管理后台仅对届次负责人和组长开放。</p><button className="secondary-button" onClick={() => onNavigate('#/tools')}>返回工作台 <ArrowRight size={15} /></button></div></div>

  const isLeader = user.role === 'Leader' || user.role === 'Admin'
  const isContributor = user.role === 'Contributor'
  const canEditAdminContent = canManageContent(user)
  const canEditGlobalContent = canManageGlobalContent(user)
  const scopeLabel = isLeader ? '全站范围' : isContributor ? `只读 · ${user.cohort} 届范围` : `${user.cohort} 届范围`
  const userCohortYear = user.cohort.replace(/\D/g, '')
  const userCohortScope = `${userCohortYear} 届可见`
  const belongsToUserCohort = (cohort?: string) => isLeader || Boolean(cohort && cohort.replace(/\D/g, '') === userCohortYear)
  const adminCohorts = sortedCohorts.filter((cohort) => isLeader || cohort.year.replace(/\D/g, '') === userCohortYear)
  const userCohortId = adminCohorts[0]?.id
  const manageableResources = isLeader || apiConfig.contentSource !== 'api'
    ? data.resources
    : userCohortId === undefined
      ? []
      : data.resources.filter((resource) => resource.cohortId != null && String(resource.cohortId) === String(userCohortId))
  const announcementScopeOptions = isLeader
    ? ['全站公开', ...sortedCohorts.map((cohort) => `${cohort.year} 届可见`), '管理员可见']
    : [userCohortScope]
  const canEditAnnouncement = (announcement?: { scope?: string }) => canEditAdminContent && (isLeader || announcement?.scope === userCohortScope)
  const followTheme = backgroundPreference === 'follow'
  const selectedBackground = theme === 'dark' && backgroundPreference !== 'custom' ? 'starfield' : (backgroundPreference === 'follow' ? 'campus' : backgroundPreference)
  const effectiveBackground = selectedBackground
  const currentNav = adminNavItems.find((item) => item.id === activeSection) ?? adminNavItems[0]
  const meta = adminSectionMeta[activeSection]
  const selectedCohort = adminCohorts.find((cohort) => cohort.id === selectedCohortId) ?? adminCohorts[0]
  const accountById = new globalThis.Map(demoAccountDirectory.map((account) => [account.id, account]))
  const directoryMembers: AdminMemberRecord[] = [
    // Member IDs and user IDs are different sequences. Use the explicit
    // userId relation returned by the backend to attach the login account.
    ...memberItems.map((member) => ({ ...member, source: 'member' as const, account: member.userId != null ? accountById.get(String(member.userId)) : undefined })),
    ...demoAccountDirectory
      // Do not render a second account row when its member profile already
      // exists in the members table.
      .filter((account) => !memberItems.some((member) => member.userId != null && String(member.userId) === account.id))
      .map((account) => {
        const cohort = account.cohort === '全站' || account.cohort.endsWith('届') ? account.cohort : `${account.cohort} 届`
        return {
          id: account.id,
          name: account.name,
          role: roleLabels[account.role] ?? account.role,
          cohort,
          direction: accountDirectoryDirection(account),
          projects: [],
          initials: account.initials,
          avatarUrl: account.avatarUrl,
          accent: 'blue',
          source: 'account' as const,
          account,
        }
      }),
  ]
  const memberDirectionOptions = Array.from(new Set([...sortedCohorts.flatMap((cohort) => cohort.teams.map((team) => team.name)), ...directoryMembers.map((member) => member.direction).filter(Boolean)]))
  const scopedMembers = directoryMembers.filter((member) => isLeader || member.cohort.includes(user.cohort))
  const visibleMembers = scopedMembers.filter((member) => {
    const memberYear = member.cohort.replace(/\D/g, '')
    const matchesCohort = memberCohortFilter === '全部' || memberYear === memberCohortFilter
    const matchesTeam = memberTeamFilter === '全部' || member.direction === memberTeamFilter || normalizeMemberTeamId(member.direction) === normalizeMemberTeamId(memberTeamFilter)
    const matchesSearch = (member.name + ' ' + (member.account?.email ?? '') + ' ' + member.direction + ' ' + member.role).toLowerCase().includes(memberSearch.toLowerCase())
    return matchesCohort && matchesTeam && matchesSearch
  }).sort(compareMembersByCohort)
  const teamMemberCount = (cohort: { year: string }, team: { id: string; name: string; members: Array<{ id: string; name: string; role: string; direction: string; initials: string; accent: string }> }) =>
    mergeManagedTeamMembers(team, data.members, cohort.year, data.membersManaged).length
  const memberPageCount = Math.max(1, Math.ceil(visibleMembers.length / membersPerPage))
  const safeMemberPage = Math.min(memberPage, memberPageCount)
  const pagedMembers = visibleMembers.slice((safeMemberPage - 1) * membersPerPage, safeMemberPage * membersPerPage)
  const statCards = [
    { label: '可管理成员', value: isLeader ? data.members.length : scopedMembers.length, note: isLeader ? '跨届成员资料' : `${user.cohort} 届成员`, icon: Users, tone: 'blue' },
    { label: '内容总量', value: data.projects.length + data.resources.length + data.interviews.length, note: '项目 · 资源 · 面经', icon: Layers3, tone: 'violet' },
    { label: '待处理公告', value: announcementItems.length, note: '站内广播记录', icon: Megaphone, tone: 'orange' },
    { label: '当前届次', value: currentCohort?.year ?? '—', note: currentCohort?.generationLabel ?? '等待组织配置', icon: Radio, tone: 'mint' },
  ]
  const recentLogs = isDemoAuth ? [
    { time: '今天 09:42', action: '登录管理后台', target: isLeader ? '全站控制台' : `${user.cohort} 届空间`, tone: 'blue' },
    { time: '昨天 18:20', action: '更新成员方向', target: '网安组 · 2029 届', tone: 'mint' },
    { time: '05-18 14:05', action: '发布公告', target: '蓝桥杯报名通知', tone: 'orange' },
    { time: '05-16 21:11', action: '编辑项目资料', target: '校园 AI 智能助手', tone: 'violet' },
  ] : []
  const formatAuditRows = (logs: AuditLog[]) => logs.map((log) => {
      const result = log.result === 'failure' ? 'failure' : 'success'
      const target = log.target || [log.resourceType, log.resourceId].filter(Boolean).join(' / ') || '未标注对象'
      const actor = log.actorName || (log.actorId === user.id ? user.name : '未知操作者')
      const timestamp = Date.parse(log.createdAt)
      return {
        id: log.id,
        time: Number.isNaN(timestamp) ? log.createdAt : new Date(timestamp).toLocaleString('zh-CN'),
        actor,
        actorInitials: actor === user.name ? user.initials : actor.slice(0, 2),
        action: log.action,
        target,
        result,
        tone: result === 'failure' ? 'red' : 'blue',
      }
    })
  const auditRows = isRemoteAuditEnabled
    ? formatAuditRows(auditLogs)
    : recentLogs.map((log) => ({ id: `${log.time}-${log.action}`, time: log.time, actor: user.name, actorInitials: user.initials, action: log.action, target: log.target, result: 'success' as const, tone: log.tone }))
  const showToast = (message: string) => setToast(message)
  const handleCreateInviteCode = async () => {
    try {
      const created = await createInviteCode({ expiresAt: inviteExpiresAt, maxUses: Number(inviteMaxUses), cohort: inviteCohort, direction: inviteDirection })
      setInviteCodes(await listInviteCodes())
      setInviteExpiresAt(toDateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
      setInviteMaxUses('1')
      showToast(`邀请码 ${created.code} 已生成`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '邀请码生成失败，请检查设置')
    }
  }
  const handleCopyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('邀请码已复制到剪贴板')
    } catch {
      showToast(`复制失败，请手动复制 ${code}`)
    }
  }
  const handleRevokeInviteCode = async (id: string) => {
    try {
      await revokeInviteCode(id)
      setInviteCodes(await listInviteCodes())
      showToast('邀请码已撤销，之后不能再兑换')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '邀请码撤销失败')
    }
  }
  const handleDeleteInviteCode = (inviteCode: InviteCode) => {
    if (inviteCode.status === 'active') return
    const statusLabel = inviteStatusLabels[inviteCode.status]
    setDeleteRequest({
      title: '删除这个邀请码？',
      message: <>将永久删除邀请码“{inviteCode.code}”（当前状态：{statusLabel}），之后无法再查看或恢复。</>,
      cancelLabel: '保留记录',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteInviteCode(inviteCode.id)
          setInviteCodes(await listInviteCodes())
          setDeleteRequest(null)
          showToast('邀请码记录已删除')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '邀请码删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const handleReviewSubmission = async (submission: ContributionSubmission, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved' && apiConfig.contentSource !== 'api') {
        await createResource({ title: submission.title, description: submission.description, category: submission.category, type: submission.resourceType ?? (submission.fileName ? 'file' : 'link'), tags: submission.tags?.length ? submission.tags : ['成员投稿'], author: submission.submitterName, updated: new Date().toLocaleDateString('zh-CN'), views: 0, accent: 'blue', visibility: submission.visibility ?? 'members', accessMode: submission.accessMode ?? (submission.fileName ? 'attachment' : 'external_link'), resourceUrl: submission.resourceUrl, attachments: submission.attachments ?? (submission.fileName ? [{ name: submission.fileName, url: '' }] : undefined), content: submission.content, status: 'published' })
      }
      await reviewContributionSubmission(submission.id, status, status === 'approved' ? '管理员已审核通过' : '管理员暂未通过这份投稿')
      if (status === 'approved' && apiConfig.contentSource === 'api') await refresh()
      setContributionSubmissions(await listContributionSubmissions({ reviewQueueOnly: true }))
      showToast(status === 'approved' ? '投稿已通过并进入资源库' : '投稿已退回，资源库不会展示')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '投稿审核失败，请稍后重试')
    }
  }

  const handleReviewPrompt = async (prompt: PromptReviewItem, status: 'approved' | 'rejected') => {
    setPromptReviewBusyId(prompt.id)
    try {
      const note = status === 'approved' ? '组长已审核通过。' : '组长审核后暂未通过，可以调整内容后重新投稿。'
      const updated = await reviewPrompt(prompt.id, status, note)
      setPromptReviewQueue((current) => current.filter((item) => item.id !== updated.id))
      setSelectedContributionState((current) => current?.type === 'prompt' && current.prompt?.id === updated.id
        ? { ...current, status: updated.status, reviewNote: updated.reviewNote, prompt: updated }
        : current)
      if (status === 'approved') await refresh()
      showToast(status === 'approved' ? 'Prompt 已通过并公开' : 'Prompt 投稿已退回，结果已通知投稿人')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Prompt 审核失败，请稍后重试')
    } finally {
      setPromptReviewBusyId(null)
    }
  }

  const handleUpdateFeedback = async (feedback: AdminFeedbackRecord, status: 'read' | 'resolved') => {
    setFeedbackBusyId(feedback.id)
    try {
      const updatedFeedback = await updateFeedbackMessage(feedback.id, { status })
      setFeedbackMessages((current) => current.map((item) => item.id === updatedFeedback.id ? updatedFeedback : item))
      setSelectedContributionState((current) => {
        if (current?.type !== 'feedback' || current.feedback?.id !== updatedFeedback.id) return current
        if (status === 'resolved' && contributionTypeFilter !== 'feedback') return null
        return {
          ...current,
          feedback: updatedFeedback,
          status: updatedFeedback.status === 'resolved' ? 'approved' : updatedFeedback.status === 'read' ? 'changes_requested' : 'pending',
          reviewNote: updatedFeedback.reviewNote,
        }
      })
      showToast(status === 'read' ? '留言已标记为已查看，记录仍保留' : '留言已标记为已处理，记录仍保留')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '留言状态更新失败，请稍后重试')
    } finally {
      setFeedbackBusyId(null)
    }
  }

  const requestDeleteResolvedFeedback = (row: AdminContributionRow) => {
    const feedback = row.type === 'feedback' ? row.feedback : undefined
    if (!feedback || feedback.status !== 'resolved') return
    setDeleteRequest({
      title: '删除这条已处理的留言？',
      message: <>将永久删除已处理的留言建议“{row.title}”。</>,
      cancelLabel: '保留记录',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteFeedbackMessage(feedback.id)
          setFeedbackMessages((current) => current.filter((item) => item.id !== feedback.id))

          setSelectedContribution(null)
          setDeleteRequest(null)
          showToast('留言建议已删除')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '删除留言失败，请稍后重试')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }

  const handleInterviewReviewComplete = async () => {
    setSelectedContribution(null)
    await loadInterviewReviewQueue()
    await refresh()
    showToast('面经审核已完成，投稿人会在消息中心收到结果')
  }

  const handleRequestContributionChanges = async (submission: ContributionSubmission) => {
    try {
      await requestContributionChanges(submission.id)
      setContributionSubmissions(await listContributionSubmissions({ reviewQueueOnly: true }))
      setSelectedContribution(null)
      showToast('已要求投稿人修改内容')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '要求修改失败，请稍后重试')
    }
  }

  const handleReviewProject = async (project: Project, status: 'approved' | 'rejected') => {
    setProjectReviewBusyId(project.id)
    try {
      await reviewProject(
        project.id,
        status,
        status === 'approved'
          ? '管理员已审核通过'
          : '管理员暂未通过这份项目提交',
      )
      await loadProjectReviewQueue()
      showToast(status === 'approved' ? '项目已通过审核并公开' : '项目已退回，等待修改后重新审核')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '项目审核失败，请稍后重试')
    } finally {
      setProjectReviewBusyId(null)
    }
  }
  const handleReviewProjectJoinRequest = async (request: ProjectJoinRequest, status: 'approved' | 'rejected') => {
    setProjectJoinRequestBusyId(request.id)
    try {
      await reviewProjectJoinRequest(
        request.id,
        status,
        status === 'approved' ? '已通过项目负责人审核' : '暂未通过项目负责人审核',
      )
      await loadProjectJoinRequests()
      await refresh()
      showToast(status === 'approved' ? '加入申请已通过，项目成员已同步' : '加入申请已退回')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加入申请审核失败，请稍后重试')
    } finally {
      setProjectJoinRequestBusyId(null)
    }
  }
  const accountIdForMember = (memberId: string) => {
    const member = memberItems.find((item) => item.id === memberId)
    return member?.userId != null ? String(member.userId) : memberId
  }
  const getMemberAccountStatus = (memberId: string): AccountStatus => {
    const accountId = accountIdForMember(memberId)
    return demoAccountDirectory.find((account) => account.id === accountId)?.status
      ?? accountStatuses[accountId]
      ?? accountStatuses[memberId]
      ?? 'active'
  }
  const handleToggleMemberAccount = async (memberId: string) => {
    if (!isLeader) { showToast('只有组长可以修改账号状态'); return }
    const accountId = accountIdForMember(memberId)
    if (accountId === user.id) { showToast('不能修改当前登录管理员自己的账号状态'); return }
    const nextStatus = getMemberAccountStatus(memberId) === 'disabled' ? 'active' : 'disabled'
    try {
      if (isDemoAuth) {
        setAccountStatuses((current) => ({ ...current, [accountId]: nextStatus }))
      } else {
        const updated = await updateManagedAccountStatus(accountId, nextStatus)
        setAccountStatuses((current) => ({ ...current, [accountId]: updated.status ?? nextStatus }))
        setDemoAccountDirectory((current) => current.map((account) => account.id === accountId ? updated : account))
        await refresh()
      }
      showToast(nextStatus === 'active' ? '账号已恢复使用' : '账号已禁用，不能继续登录')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '账号状态更新失败')
    }
  }
  const handleCloseMemberAccount = async (memberId: string) => {
    if (!isLeader) { showToast('只有组长可以注销账号'); return }
    const accountId = accountIdForMember(memberId)
    if (accountId === user.id) { showToast('不能注销当前登录管理员自己的账号'); return }
    try {
      if (isDemoAuth) {
        setAccountStatuses((current) => ({ ...current, [accountId]: 'closed' }))
      } else {
        const updated = await updateManagedAccountStatus(accountId, 'closed')
        setAccountStatuses((current) => ({ ...current, [accountId]: updated.status ?? 'closed' }))
        setDemoAccountDirectory((current) => current.map((account) => account.id === accountId ? updated : account))
        await refresh()
      }
      showToast('账号已注销，后续不能再登录')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '账号注销失败')
    }
  }
  const handleToggleDemoAccount = async (accountId: string) => {
    if (!isLeader) { showToast('只有组长可以修改登录账号状态'); return }
    if (accountId === user.id) { showToast('不能在当前登录会话中禁用自己'); return }
    const account = demoAccountDirectory.find((item) => item.id === accountId)
    if (!account) return
    try {
      await updateManagedAccountStatus(accountId, account.status === 'disabled' ? 'active' : 'disabled')
      setDemoAccountDirectory(await listManagedAccounts())
      showToast(account.status === 'disabled' ? '账号已恢复使用' : '账号已禁用，之后不能登录')
    } catch (error) { showToast(error instanceof Error ? error.message : '账号状态更新失败') }
  }
  const handleCloseDemoAccount = async (accountId: string) => {
    if (!isLeader) { showToast('只有组长可以注销登录账号'); return }
    if (accountId === user.id) { showToast('请在右上角个人菜单中注销自己的账号'); return }
    try {
      await updateManagedAccountStatus(accountId, 'closed')
      setDemoAccountDirectory(await listManagedAccounts())
      showToast('账号已注销，之后不能登录')
    } catch (error) { showToast(error instanceof Error ? error.message : '账号注销失败') }
  }
  const startAccountRoleEdit = (account: AuthUser) => {
    const cohortYear = account.cohort.replace(/\D/g, '')
    const cohort = sortedCohorts.find((item) => item.year.replace(/\D/g, '') === cohortYear)
    const validDirections = cohort?.teams.map((team) => team.name) ?? []
    const currentDirection = account.directions.find((direction) => validDirections.includes(direction)) ?? ''
    const role = account.role === 'Admin' ? 'Leader' : account.role

    setSelectedMemberId(`account:${account.id}`)
    setAccountRoleDraft({
      accountId: account.id,
      role: ['Member', 'Contributor', 'CohortLeader', 'Leader'].includes(role) ? role as ManagedAccountRoleDraft['role'] : 'Member',
      cohort: cohort?.year ?? '',
      direction: currentDirection,
    })
    setAccountRoleEditorId(account.id)
  }
  const saveAccountRole = async (
    account: AuthUser,
    roleDraft: ManagedAccountRoleDraft,
  ) => {
    if (!isLeader) { showToast('只有组长可以调整账号权限'); return }
    if (account.id === user.id) { showToast('不能在这里修改当前登录组长自己的权限'); return }
    if (roleDraft.role === 'CohortLeader' && !roleDraft.cohort) {
      showToast('请先选择届次负责人所属的届次')
      return
    }
    if (roleDraft.role === 'Contributor' && (!roleDraft.cohort || !roleDraft.direction)) {
      showToast('组员账号必须选择届次和所属小组')
      return
    }

    setAccountRoleBusy(true)
    try {
      const updated = await updateManagedAccountRole(account.id, {
        role: roleDraft.role,
        cohort: roleDraft.cohort || null,
        direction: roleDraft.direction || null,
      })
      setDemoAccountDirectory((current) => current.map((item) => item.id === updated.id ? updated : item))
      await refresh()
      setAccountRoleEditorId(null)
      setAccountRoleDraft(null)
      showToast('账号权限已更新；小组职务保持不变')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '账号权限更新失败')
    } finally {
      setAccountRoleBusy(false)
    }
  }
  const openCohortManager = (cohortId?: string) => {
    if (!canEditAdminContent) { showToast('组员只能查看届次与小组，不能修改组织结构'); return }
    const scopedCohortId = isLeader ? cohortId : sortedCohorts.find((cohort) => cohort.year.replace(/\D/g, '') === userCohortYear)?.id
    if (!isLeader && !scopedCohortId) { showToast('当前账号还没有分配届次'); return }
    setCohortManagerInitialId(cohortId)
    if (!isLeader && scopedCohortId) setCohortManagerInitialId(scopedCohortId)
    setCohortManagerOpen(true)
  }
  const toggleGlobalBackground = async () => {
    if (!isLeader) { showToast('校园背景只能由组长发布'); return }
    const next = !globalBackground
    setGlobalBackground(next)
    onBackgroundPreferenceChange(next ? 'follow' : (backgroundImage ? 'custom' : 'paper'))
    if (!isRemoteSettingsEnabled) return
    try {
      await updateSiteSettings({ schoolBackgroundEnabled: next })
    } catch (error) {
      setGlobalBackground(!next)
      onBackgroundPreferenceChange(next ? (backgroundImage ? 'custom' : 'paper') : 'follow')
      showToast(error instanceof Error ? error.message : '校园背景设置保存失败，请稍后重试')
    }
  }
  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) { showToast('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB'); event.target.value = ''; return }
    if (isRemoteSettingsEnabled) {
      void (async () => {
        try {
          const asset = await uploadAsset(file, { folder: 'backgrounds', alt: '成员个人背景' })
          onBackgroundImageChange(asset.url)
          setGlobalBackground(false)
          onBackgroundPreferenceChange('custom')
          setBackgroundFileName(file.name)
          await updateUserPreferences({ backgroundPreference: 'custom', schoolBackgroundEnabled: false, customBackgroundAssetId: asset.id, customBackgroundUrl: asset.url })
          showToast('背景图片已上传并保存')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '背景图片上传失败，请稍后重试')
        } finally {
          event.target.value = ''
        }
      })()
      return
    }
    const reader = new FileReader()
    reader.onerror = () => showToast('背景图片读取失败，请重新选择文件')
    reader.onload = () => {
      onBackgroundImageChange(String(reader.result))
      setGlobalBackground(false)
      onBackgroundPreferenceChange('custom')
      setBackgroundFileName(file.name)
      event.target.value = ''
      showToast('背景图片已保存到本地，刷新后仍会保留')
    }
    reader.readAsDataURL(file)
  }
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_AVATAR_BYTES)) { showToast('请上传 PNG、JPG 或 WebP 头像，且大小不超过 5 MB'); event.target.value = ''; return }
    if (!isDemoAuth) {
      try {
        const asset = await uploadAsset(file, { folder: 'avatars', alt: profileName.trim() || '成员头像' })
        setProfileAvatar(asset.url)
        showToast('头像已上传，点击保存资料后生效')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '头像上传失败，请稍后重试')
      } finally {
        event.target.value = ''
      }
      return
    }
    const reader = new FileReader()
    reader.onerror = () => showToast('头像读取失败，请重新选择文件')
    reader.onload = () => { setProfileAvatar(String(reader.result)); event.target.value = ''; showToast('头像已载入本地预览，点击保存资料后生效') }
    reader.readAsDataURL(file)
  }
  const saveBackgroundPreferences = async () => {
    if (isRemoteSettingsEnabled) {
      try {
        await updateUserPreferences({
          theme,
          backgroundPreference,
          schoolBackgroundEnabled: backgroundPreference === 'follow',
          customBackgroundUrl: backgroundPreference === 'custom' ? backgroundImage : null,
        })
      } catch (error) {
        // The selection has already been applied to the shared app shell. Do
        // not keep the modal open or roll it back when persistence is offline.
        setBackgroundOpen(false)
        showToast(`背景已应用到当前设备，但服务器同步失败：${error instanceof Error ? error.message : '请稍后重试'}`)
        return
      }
    }
    setBackgroundOpen(false)
    showToast('背景设置已保存')
  }
  const saveProfileChanges = async () => {
    const name = profileName.trim()
    const bio = profileBio.trim()
    if (!name) { showToast('请填写显示姓名'); return }
    if (name.length > 50) { showToast('显示姓名不能超过 50 个字符'); return }
    if (bio.length > 500) { showToast('个人简介不能超过 500 个字符'); return }
    try {
      const updatedUser = await updateProfile({ name, initials: initialsFromName(name), avatarUrl: profileAvatar ?? undefined, bio })
      updateMemberProfileInCache(updatedUser.id, { name: updatedUser.name, initials: initialsFromName(updatedUser.name), avatarUrl: updatedUser.avatarUrl })
      setDemoAccountDirectory((accounts) => {
        const next = accounts.map((account) => account.id === updatedUser.id ? { ...account, ...updatedUser } : account)
        return next.some((account) => account.id === updatedUser.id) ? next : [...next, updatedUser]
      })
      setProfileOpen(false)
      showToast('头像与简介已保存')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '资料保存失败，请稍后重试')
    }
  }
  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { showToast('请完整填写密码字段'); return }
    if (newPassword.length < 8 || newPassword.length > 128) { showToast('新密码长度应为 8 到 128 位'); return }
    if (newPassword !== confirmPassword) { showToast('两次输入的新密码不一致'); return }
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordVisible(false)
      showToast('密码已更新，请使用新密码登录')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '密码修改失败，请稍后重试')
    }
  }
  const openAnnouncementEditor = (item?: typeof announcementItems[number]) => {
    if (!canEditAdminContent) { showToast('组员只能查看公告，不能打开编辑器'); return }
    if (item && !canEditAnnouncement(item)) { showToast('本届负责人只能编辑自己届次的公告'); return }
    setAnnouncementDraft(item ? { id: item.id, category: item.category, title: item.title, detail: item.detail, scope: item.scope, published: item.published } : { category: '通知', title: '', detail: '', scope: isLeader ? '全站公开' : userCohortScope, published: true })
  }
  const saveAnnouncement = async () => {
    if (!canEditAdminContent) { showToast('组员只能查看公告，不能发布或修改公告'); return }
    if (!announcementDraft?.title.trim() || !announcementDraft.detail.trim()) { showToast('请填写公告标题和内容'); return }
    if (!isLeader && (announcementDraft.scope !== userCohortScope || (announcementDraft.id && !canEditAnnouncement(announcementItems.find((item) => item.id === announcementDraft.id))))) {
      showToast('本届负责人只能发布或修改自己届次的公告')
      return
    }
    const date = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-')
    const payload = { category: announcementDraft.category, title: announcementDraft.title.trim(), detail: announcementDraft.detail.trim(), scope: announcementDraft.scope, published: announcementDraft.published, date }
    try {
      if (announcementDraft.id) await updateAnnouncement(announcementDraft.id, payload)
      else await createAnnouncement(payload)
      setAnnouncementDraft(null)
      showToast(announcementDraft.published ? '公告已发布，公开页面已同步' : '公告草稿已保存，仅管理后台可见')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '公告保存失败，请稍后重试')
    }
  }
  const removeAnnouncement = (id: string) => {
    const announcement = announcementItems.find((item) => item.id === id)
    if (!announcement) return
    if (!canEditAnnouncement(announcement)) { showToast('本届负责人只能删除自己届次的公告'); return }
    setDeleteRequest({
      title: '删除这条公告？',
      message: <>将下线并删除“{announcement.title}”，首页和其他公开页面不会再显示这条公告。</>,
      cancelLabel: '保留公告',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteAnnouncement(id)
          setDeleteRequest(null)
          showToast('公告已删除，公开页面已同步')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '公告删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const removeMember = (id: string) => {
    if (!canEditAdminContent) { showToast('组员只能查看成员目录，不能删除成员'); return }
    const member = memberItems.find((item) => item.id === id)
    if (!member) return
    if (!belongsToUserCohort(member.cohort)) { showToast('不能操作其他届次的成员'); return }
    setDeleteRequest({
      title: '删除成员账号？',
      message: <>将删除“{member.name}”的账号资料，并从小组风采和项目协作中移除。</>,
      cancelLabel: '保留账号',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteMember(id)
          setDeleteRequest(null)
          showToast('成员账号已删除，小组风采已同步')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '成员删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const openMemberEditor = (member?: typeof memberItems[number]) => {
    if (!canEditAdminContent) { showToast('组员只能查看成员目录，不能打开编辑器'); return }
    if (member && !belongsToUserCohort(member.cohort)) { showToast('不能编辑其他届次的成员'); return }
    setMemberDraft(createMemberDraft(member, isLeader ? (memberCohortFilter === '全部' ? (selectedCohort?.year ?? '2029') : memberCohortFilter) : user.cohort))
  }
  const saveMember = async () => {
    if (!canEditAdminContent) { showToast('组员只能查看成员目录，不能修改成员资料'); return }
    if (!memberDraft?.name.trim()) { showToast('请填写成员姓名'); return }
    const cohortYear = memberDraft.cohort.replace(/\D/g, '') || (isLeader ? '2029' : userCohortYear)
    if (!isLeader && cohortYear !== userCohortYear) { showToast('本届负责人不能修改其他届次的成员'); return }
    if (!isLeader && memberDraft.id) {
      const existing = memberItems.find((item) => item.id === memberDraft.id)
      if (!existing || !belongsToUserCohort(existing.cohort)) { showToast('不能编辑其他届次的成员'); return }
    }
    const cohort = `${cohortYear} 届`
    const payload = { name: memberDraft.name.trim(), role: memberDraft.role, cohort, direction: memberDraft.direction.trim() || '待补充', initials: memberDraft.initials.trim() || memberDraft.name.trim().slice(0, 2), accent: memberDraft.accent, projects: memberDraft.projects ?? [] }
    try {
      if (memberDraft.id) await updateMember(memberDraft.id, payload)
      else await createMember(payload)
      const wasEditing = Boolean(memberDraft.id)
      setMemberDraft(null)
      showToast(wasEditing ? '成员资料已更新，小组风采已同步' : '成员账号已添加，小组风采已同步')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '成员保存失败，请稍后重试')
    }
  }
  const openContentEditor = (module = '内容') => {
    setContentDraft({ module, title: '', description: '', status: '草稿', visibility: isLeader ? '全站公开' : '成员可见' })
  }
  const saveContent = async () => {
    if (!canEditAdminContent) { showToast('组员只能查看内容，不能新增内容'); return }
    if (!contentDraft?.title.trim() || !contentDraft.description.trim()) { showToast('请填写标题和描述'); return }
    const title = contentDraft.title.trim()
    const description = contentDraft.description.trim()
    const now = new Date().getFullYear()
    const visibility = contentDraft.visibility === '组员可见' ? 'contributors' as const : isLeader && contentDraft.visibility === '全站公开' ? 'public' as const : 'members' as const
    try {
      if (contentDraft.module === '项目库') {
        await createProject({ name: title, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, description, stack: [], members: 0, stars: 0, status: contentDraft.status === '已归档' ? '已归档' : contentDraft.status === '已发布' ? '招募中' : '维护中', difficulty: 1, year: now, category: data.projectCategories.find((category) => category.enabled)?.key ?? 'AI', accent: 'blue', icon: 'rocket', featured: false, visibility })
      } else if (contentDraft.module === '资源库') {
        await createResource({ title, description, category: data.resourceCategories.find((category) => category.enabled)?.key ?? 'backend', type: '文档', tags: [], author: user.name, updated: new Date().toLocaleDateString('zh-CN'), views: 0, accent: 'blue', visibility })
      } else if (contentDraft.module === '面经墙') {
        await createInterview({ company: '待补充', role: title, author: user.name, cohort: user.cohort, date: new Date().toLocaleDateString('zh-CN'), difficulty: '中等', rounds: 1, tags: [], summary: description, category: data.interviewCategories.find((category) => category.enabled)?.key ?? 'intern', visibility })
      } else if (contentDraft.module === '比赛中心') {
        await createCompetition({ title, type: '其他', date: `${now}-01-01`, deadline: `${now}-12-31`, description, status: '即将开始', accent: 'blue', visibility })
      } else if (contentDraft.module === '学习路线') {
        await createLearningRoute({ title, direction: title, description, nodes: [], featuredProjectIds: [], visibility })
      } else {
        showToast(`${contentDraft.module}属于结构配置，请先在对应模块中保存具体字段`)
        return
      }
      setContentDraft(null)
      showToast(`${contentDraft.module}已保存，公开页面已同步`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : `${contentDraft.module}保存失败，请稍后重试`)
    }
  }
  const openCollectionManager = (module: AdminCollectionKind) => {
    if (!canEditAdminContent) { showToast('组员只能查看内容，不能打开编辑器'); return }
    if (!isLeader && module !== '面经墙' && module !== '资源库') { showToast('届次负责人只能维护本届面经和资源；项目由组长统一管理'); return }
    setCollectionManager(module)
  }
  const openWorkbenchManager = () => {
    if (!canEditGlobalContent) { showToast('首页展示规则属于全局配置，仅组长可以编辑'); return }
    setWorkbenchManagerOpen(true)
  }
  const saveWorkbench = async (settings: typeof data.workbench) => {
    if (!canEditGlobalContent) { showToast('当前账号没有工作台配置权限'); return }
    try {
      await updateWorkbench(settings)
      showToast('工作台展示设置已保存，工具页已同步')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '工作台设置保存失败，请确认后端接口已实现')
      throw error
    }
  }
  const openLearningRouteEditor = (id = 'pyagent') => { if (!canEditGlobalContent) { showToast('学习路线属于全局配置，仅组长可以编辑'); return }; setLearningRouteId(id); setLearningRouteOpen(true) }
  const openNewLearningRoute = () => { if (!canEditGlobalContent) { showToast('学习路线属于全局配置，仅组长可以新增'); return }; setLearningRouteId(`new-route-${Date.now()}`); setLearningRouteOpen(true) }
  const openPhotoManager = () => { if (!canEditAdminContent) { showToast('组员只能查看历届合影，不能管理照片'); return }; if (!isLeader && !adminCohorts[0]) { showToast('当前账号还没有分配届次'); return }; setPhotoManagerOpen(true) }
  const openPromptManager = () => { if (!isLeader) { showToast('Prompt 模板由组长统一维护'); return }; setPromptManagerOpen(true) }
  const openCompetitionManager = () => { if (!canEditGlobalContent) { showToast('比赛中心属于全局配置，仅组长可以编辑'); return }; setCompetitionManagerOpen(true) }
  const saveCollection = async (draft: CollectionDraft) => {
    if (!canEditAdminContent) { showToast('组员只能查看内容，不能保存修改'); return }
    if (!isLeader && draft.kind !== '面经墙' && draft.kind !== '资源库') { showToast('届次负责人只能维护本届面经和资源；项目由组长统一管理'); return }
    if (!draft.title.trim()) { showToast('请填写内容标题'); return }
    if (!draft.description.trim()) { showToast('请填写内容简介'); return }
    const visibility = draft.visibility === '组员可见' ? 'contributors' as const : isLeader && draft.visibility === '全站公开' ? 'public' as const : 'members' as const
    const asNumber = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
    let savedId: string | undefined
    try {
      if (draft.kind === '项目库') {
        const slug = draft.slug.trim() || `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}-${Date.now()}`
        const payload = { name: draft.title.trim(), slug, description: draft.description.trim(), intro: draft.intro.trim() || draft.description.trim(), githubUrl: draft.githubUrl.trim() || undefined, docsUrl: draft.docsUrl.trim() || undefined, demoUrl: draft.demoUrl.trim() || undefined, issueUrl: draft.issueUrl.trim() || undefined, downloadUrl: draft.downloadUrl.trim() || undefined, coverImage: draft.coverImage || undefined, galleryImages: draft.galleryImages.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), stack: draft.stack.split(/[,，]/).map((item) => item.trim()).filter(Boolean), members: asNumber(draft.members), stars: asNumber(draft.stars), status: draft.status as Project['status'], difficulty: Math.min(5, Math.max(1, asNumber(draft.difficulty, 1))), year: asNumber(draft.year, new Date().getFullYear()), category: draft.category.trim() || '科技小组', accent: draft.accent || 'blue', icon: draft.icon || 'rocket', featured: draft.featured, memberIds: draft.memberIds, joinEnabled: draft.joinEnabled, joinNote: draft.joinNote.trim() || undefined, milestones: draft.milestones.filter((item) => item.title.trim()).map((item) => ({ ...item, year: item.year.trim(), title: item.title.trim(), summary: item.summary.trim() })), logs: draft.logs.filter((item) => item.title.trim()).map((item) => ({ ...item, date: item.date.trim(), title: item.title.trim(), detail: item.detail.trim(), author: item.author?.trim() || undefined, authorInitials: item.authorInitials?.trim() || undefined })), visibility }
        if (draft.id) savedId = (await updateProject(draft.id, payload)).id
        else savedId = (await createProject(payload)).id
      } else if (draft.kind === '资源库') {
        const attachments = draft.attachments.map((attachment, index) => ({ ...attachment, sortOrder: index }))
        const payload = { title: draft.title.trim(), description: draft.description.trim(), category: draft.category.trim() || '小组资料', type: draft.type || 'article', tags: draft.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), author: draft.author.trim() || user.name, updated: draft.updated.trim() || new Date().toLocaleDateString('zh-CN'), views: asNumber(draft.views), accent: draft.accent || 'blue', visibility, accessMode: draft.accessMode, resourceUrl: draft.accessMode === 'external_link' ? draft.resourceUrl.trim() || undefined : undefined, attachments: draft.accessMode === 'attachment' ? attachments : undefined, content: draft.accessMode === 'article' ? draft.content.trim() || undefined : undefined, status: draft.resourceStatus, sourceName: draft.sourceName.trim() || undefined }
        if (draft.id) savedId = (await updateResource(draft.id, payload)).id
        else savedId = (await createResource(payload)).id
      } else {
        if (!isLeader && draft.cohort.replace(/\D/g, '') !== userCohortYear) { showToast('本届负责人只能维护自己届次的面经'); return }
        const payload = { company: draft.company.trim() || '待补充', role: draft.title.trim(), author: draft.author.trim() || user.name, cohort: draft.cohort.trim() || user.cohort, date: draft.date.trim() || new Date().toLocaleDateString('zh-CN'), difficulty: draft.difficulty as InterviewExperience['difficulty'], rounds: Math.max(1, asNumber(draft.rounds, 1)), tags: draft.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), summary: draft.description.trim(), category: draft.category.trim() || data.interviewCategories.find((category) => category.enabled)?.key || 'intern', visibility }
        if (draft.id) savedId = (await updateInterview(draft.id, payload)).id
        else savedId = (await createInterview(payload)).id
      }
      showToast(`${draft.kind}${draft.id ? '已更新' : '已创建'}，公开页面已同步`)
      return savedId ? { id: savedId } : undefined
    } catch (error) {
      showToast(error instanceof Error ? error.message : `${draft.kind}保存失败，请稍后重试`)
      throw error
    }
  }
  const removeCollection = async (kind: AdminCollectionKind, id: string): Promise<boolean> => {
    if (!canEditAdminContent) { showToast('组员只能查看内容，不能删除内容'); return false }
    if (!isLeader && kind !== '面经墙' && kind !== '资源库') { showToast('届次负责人只能维护本届面经和资源；项目由组长统一管理'); return false }
    if (!isLeader && kind === '面经墙') {
      const interview = data.interviews.find((item) => item.id === id)
      if (!interview || !belongsToUserCohort(interview.cohort)) { showToast('本届负责人不能删除其他届次的面经'); return false }
    }
    try {
      if (kind === '项目库') await deleteProject(id)
      else if (kind === '资源库') await deleteResource(id)
      else await deleteInterview(id)
     showToast(`${kind}内容已删除`)
      return true
   } catch (error) {
     showToast(error instanceof Error ? error.message : '内容删除失败，请稍后重试')
      return false
   }
 }
  const saveCategory = async (resource: CategoryResource, draft: ProjectCategoryDraft) => {
    if (!canEditGlobalContent) { showToast('内容分类属于全局配置，仅组长可以修改'); throw new Error('当前账号没有分类管理权限') }
    const payload = { key: draft.key.trim(), label: draft.label.trim(), description: draft.description.trim() || undefined, accent: draft.accent, icon: draft.icon, order: draft.order, enabled: draft.enabled, builtIn: draft.builtIn }
    try {
      if (resource === 'projects') {
        if (draft.id) await updateProjectCategory(draft.id, payload)
        else await createProjectCategory(payload)
      } else if (resource === 'resources') {
        if (draft.id) await updateResourceCategory(draft.id, payload)
        else await createResourceCategory(payload)
      } else {
        if (draft.id) await updateInterviewCategory(draft.id, payload)
        else await createInterviewCategory(payload)
      }
      showToast(`分类${draft.id ? '已更新' : '已创建'}，${resource === 'projects' ? '项目' : resource === 'resources' ? '资源' : '面经'}库筛选已同步`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '分类保存失败，请稍后重试')
      throw error
    }
  }
  const moveCategory = async (resource: CategoryResource, id: string, direction: 'up' | 'down') => {
    if (!canEditGlobalContent) { showToast('内容分类属于全局配置，仅组长可以调整顺序'); return }
    const categories = [...(resource === 'projects' ? data.projectCategories : resource === 'resources' ? data.resourceCategories : data.interviewCategories)].sort((a, b) => a.order - b.order)
    const index = categories.findIndex((category) => category.id === id)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return
    const current = categories[index]
    const target = categories[targetIndex]
    try {
      if (resource === 'projects') {
        await updateProjectCategory(current.id, { order: target.order })
        await updateProjectCategory(target.id, { order: current.order })
      } else if (resource === 'resources') {
        await updateResourceCategory(current.id, { order: target.order })
        await updateResourceCategory(target.id, { order: current.order })
      } else {
        await updateInterviewCategory(current.id, { order: target.order })
        await updateInterviewCategory(target.id, { order: current.order })
      }
      showToast('分类顺序已更新')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '分类排序失败，请稍后重试')
    }
  }
  const removeCategory = async (resource: CategoryResource, id: string) => {
    if (!canEditGlobalContent) { showToast('内容分类属于全局配置，仅组长可以删除'); throw new Error('当前账号没有分类删除权限') }
    try {
      if (resource === 'projects') await deleteProjectCategory(id)
      else if (resource === 'resources') await deleteResourceCategory(id)
      else await deleteInterviewCategory(id)
      showToast(`分类已删除，${resource === 'projects' ? '项目' : resource === 'resources' ? '资源' : '面经'}库筛选已同步`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '分类删除失败，请稍后重试')
      throw error
    }
  }
  const saveLearningRoute = async (draft: LearningRouteDraft) => {
    if (!canEditGlobalContent) { showToast('学习路线属于全局配置，仅组长可以保存修改'); return }
    if (!draft.title.trim()) { showToast('请填写学习路线名称'); return }
    try {
      const completedNodes = draft.nodes.filter((node) => node.title.trim())
      const payload = {
        title: draft.title.trim(),
        direction: draft.direction.trim() || draft.title.trim(),
        description: draft.description.trim(),
        nodes: completedNodes.map((node, index) => ({
          ...node,
          id: node.id || `node-${Date.now()}-${index}`,
          title: node.title.trim(),
          duration: node.duration.trim() || '待定',
          description: node.description?.trim(),
          projects: (node.projectIds ?? []).length,
          projectIds: [...(node.projectIds ?? [])],
        })),
        featuredProjectIds: [...draft.featuredProjectIds],
      }
      const saved = draft.id.startsWith('new-route-') ? await createLearningRoute(payload) : await updateLearningRoute(draft.id, payload)
      setLearningRouteId(saved.id)
      showToast('当前学习路线已保存，可继续编辑其他方向')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '学习路线保存失败，请稍后重试')
    }
  }
  const removeLearningRoute = async (id: string) => {
    if (!canEditGlobalContent) { showToast('学习路线属于全局配置，仅组长可以删除路线'); return }
    if (id.startsWith('new-route-')) {
      setLearningRouteOpen(false)
      showToast('未保存的学习路线已取消')
      return
    }
    if (id === 'pyagent') {
      showToast('默认 PyAgent 路线不可删除，可清空节点后重新编辑')
      return
    }
    const route = data.learningRoutes.find((item) => item.id === id)
    setDeleteRequest({
      title: '删除这条学习路线？',
      message: <>将删除“{route?.title ?? '当前路线'}”，公开学习路线页面也会同步移除。</>,
      cancelLabel: '保留路线',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteLearningRoute(id)
          setLearningRouteOpen(false)
          setDeleteRequest(null)
          showToast('学习路线已删除')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '学习路线删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const saveCompetition = async (id: string | undefined, value: CompetitionEditorValue, intent: 'draft' | 'publish' | 'save', onCreated: (event: CompetitionEvent) => void) => {
    if (!canEditGlobalContent) throw new Error('比赛中心属于全局配置，仅组长可以修改赛事')
    if (!value.title.trim() || !(value.eventStart.trim() || value.date.trim()) || !(value.registrationEnd.trim() || value.deadline.trim()) || !value.description.trim()) throw new Error('请填写比赛名称、比赛开始、报名截止和说明')
    try {
      const projects = value.projects.filter((project) => project.title.trim()).map((project, index) => ({ ...project, title: project.title.trim(), cohort: project.cohort.trim() || '未标注届次', description: project.description.trim(), projectUrl: project.projectUrl?.trim() || undefined, sortOrder: project.sortOrder ?? index }))
      const tracks = value.tracks.filter((track) => track.name.trim()).map((track) => ({ ...track, name: track.name.trim(), description: track.description?.trim() || undefined, audience: track.audience?.trim() || undefined, teamSize: track.teamSize?.trim() || undefined, requirements: track.requirements?.trim() || undefined, registrationStart: track.registrationStart?.trim() || undefined, registrationEnd: track.registrationEnd?.trim() || undefined, registrationUrl: track.registrationUrl?.trim() || undefined, rulesUrl: track.rulesUrl?.trim() || undefined, awards: track.awards?.trim() || undefined }))
      const eventStart = value.eventStart.trim() || value.date.trim()
      const registrationEnd = value.registrationEnd.trim() || value.deadline.trim()
      const payload: CreateInput<CompetitionEvent> = { title: value.title.trim(), seriesName: value.seriesName.trim() || undefined, type: value.type.trim() || '其他', organizer: value.organizer.trim() || undefined, officialUrl: value.officialUrl.trim() || undefined, registrationStart: value.registrationStart.trim() || undefined, registrationEnd, eventStart, eventEnd: value.eventEnd.trim() || undefined, resultDate: value.resultDate.trim() || undefined, lifecycle: value.lifecycle, date: eventStart, deadline: registrationEnd, description: value.description.trim(), status: value.lifecycle === 'draft' ? '草稿' : value.status === '草稿' ? '即将开始' : value.status, accent: value.accent, tracks }
      if (!isRemoteCompetitionProjectsEnabled) payload.projects = projects
      const saved = id ? await updateCompetition(id, payload) : await createCompetition(payload)
      if (!id) onCreated(saved)
      if (isRemoteCompetitionProjectsEnabled) {
        await syncCompetitionProjects(saved.id, projects)
        await refresh()
      }
      if (tracks.length && (saved.tracks?.length ?? 0) !== tracks.length) {
        throw new Error('赛事信息已保存，但后端还没有返回赛道数据；赛道暂未确认保存，请补充后端赛道字段后再保存。')
      }
      setCompetitionManagerOpen(false)
      showToast(intent === 'draft' ? '赛事草稿已保存' : intent === 'publish' ? '赛事已发布，比赛中心已同步' : '比赛信息已更新，比赛中心已同步')
    } catch (error) { throw new Error(error instanceof Error ? error.message : '比赛保存失败，请稍后重试', { cause: error }) }
  }
  const saveCompetitionBatch = async (values: CompetitionEditorValue[], onProgress: (completed: number) => void) => {
    if (!canEditGlobalContent) throw new Error('比赛中心属于全局配置，仅组长可以修改赛事')
    if (!values.length) throw new Error('没有可导入的赛事')
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index]
      if (!value.title.trim() || !(value.eventStart.trim() || value.date.trim()) || !(value.registrationEnd.trim() || value.deadline.trim()) || !value.description.trim()) {
        throw new Error(`第 ${index + 1} 场赛事「${value.title || '未命名'}」缺少比赛名称、比赛开始、报名截止或简介`)
      }
      try {
        const eventStart = value.eventStart.trim() || value.date.trim()
        const registrationEnd = value.registrationEnd.trim() || value.deadline.trim()
        await createCompetition({ title: value.title.trim(), seriesName: value.seriesName.trim() || undefined, type: value.type.trim() || '其他', organizer: value.organizer.trim() || undefined, officialUrl: value.officialUrl.trim() || undefined, registrationStart: value.registrationStart.trim() || undefined, registrationEnd, eventStart, eventEnd: value.eventEnd.trim() || undefined, resultDate: value.resultDate.trim() || undefined, lifecycle: value.lifecycle, date: eventStart, deadline: registrationEnd, description: value.description.trim(), status: value.lifecycle === 'draft' ? '草稿' : '即将开始', accent: value.accent, tracks: value.tracks.filter((track) => track.name.trim()) })
      } catch (error) {
        const message = error instanceof Error ? error.message : '请求失败'
        throw new Error(`第 ${index + 1} 场赛事「${value.title}」导入失败：${message}`, { cause: error })
      }
      onProgress(index + 1)
    }
    showToast(`已批量导入 ${values.length} 场比赛`)
  }
  const removeCompetition = async (id: string) => {
    if (!canEditGlobalContent) { showToast('比赛中心属于全局配置，仅组长可以删除赛事'); return }
    try {
      await deleteCompetition(id)
      showToast('比赛已删除，比赛中心已同步')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '比赛删除失败')
      throw error
    }
  }
  const exportLogs = async () => {
    const rows: string[][] = [['时间', '操作者', '动作', '对象', '结果']]
    try {
      if (isRemoteAuditEnabled) {
        let page = 1
        while (true) {
          const logs = await listAuditLogs({ page, pageSize: 100 })
          for (const log of logs) {
            const timestamp = Date.parse(log.createdAt)
            const time = Number.isNaN(timestamp) ? log.createdAt : new Date(timestamp).toLocaleString('zh-CN')
            const actor = log.actorName || (log.actorId === user.id ? user.name : '未知操作者')
            const target = log.target || [log.resourceType, log.resourceId].filter(Boolean).join(' / ') || '未标注对象'
            rows.push([time, actor, log.action, target, log.result === 'failure' ? '失败' : '成功'])
          }
          if (logs.length < 100) break
          page += 1
        }
      } else {
        for (const log of auditRows) {
          rows.push([log.time, log.actor, log.action, log.target, log.result === 'failure' ? '失败' : '成功'])
        }
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '日志导出失败，请稍后重试')
      return
    }

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `club-admin-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('日志 CSV 已下载')
  }
  const refreshAuditLogLists = async () => {
    const logs = await listAllAuditLogs()
    setAuditLogs(logs)
    setAuditError('')
  }
  const runAuditLogAction = async (action: () => Promise<{ affectedCount: number }>, successMessage: (count: number) => string) => {
    setAuditActionBusy(true)
    try {
      const result = await action()
      setAuditDeleteRequest(null)
      showToast(successMessage(result.affectedCount))
      try {
        await refreshAuditLogLists()
      } catch (error) {
        setAuditError(error instanceof Error ? error.message : '日志列表刷新失败')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '日志操作失败，请稍后重试')
    } finally {
      setAuditActionBusy(false)
    }
  }
  const askDeleteAuditLog = (log: AuditLog) => setAuditDeleteRequest({
    title: '删除这条操作日志？',
    message: <>“{log.action}”记录将从数据库中删除，无法恢复。</>,
    cancelLabel: '保留日志',
    confirmLabel: '删除日志',
    onConfirm: () => runAuditLogAction(() => deleteAuditLog(log.id), () => '操作日志已删除'),
  })
  const askDeleteAllAuditLogs = () => setAuditDeleteRequest({
    title: '清空操作日志？',
    message: <>当前全部操作日志将从数据库中删除，无法恢复。删除操作本身不会新增日志。</>,
    cancelLabel: '保留日志',
    confirmLabel: '清空日志',
    onConfirm: () => runAuditLogAction(deleteAllAuditLogs, (count) => `已删除 ${count} 条操作日志`),
  })
  const selectSection = (item: AdminNavItem) => {
    if (item.leaderOnly && !isLeader) {
      showToast(isContributor ? '组员暂时不能访问该模块' : '该模块仅组长可操作')
      return
    }
    setActiveSection(item.id)
  }

  const renderOverview = () => <>
    <div className="admin-stat-grid">
      {statCards.map(({ label, value, note, icon: StatIcon, tone }) => <article className={`admin-stat-card tone-${tone}`} key={label}><span className="admin-stat-icon"><StatIcon size={17} /></span><strong>{value}</strong><span>{label}</span><small>{note}</small></article>)}
    </div>
    <div className="admin-overview-grid">
      <section className="admin-card admin-activity-card"><div className="admin-card-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>最近操作</h2></div><button className="admin-link-button" onClick={() => setActiveSection('logs')}>查看完整日志 <ArrowUpRight size={14} /></button></div><div className="admin-activity-list">{auditRows.slice(0, 4).map((log) => <div className="admin-activity-row" key={log.id}><span className={`admin-activity-dot tone-${log.tone}`} /><div><strong>{log.action}</strong><small>{log.target}</small></div><time>{log.time}</time></div>)}</div></section>
      <section className="admin-card admin-scope-card"><div className="admin-card-head"><div><p className="eyebrow">PERMISSION MODEL</p><h2>你的管理边界</h2></div><ShieldCheck size={18} /></div><div className="admin-scope-hero"><span className="admin-scope-avatar"><UserCog size={19} /></span><div><strong>{roleLabels[user.role] ?? user.role}</strong><small>{user.name} · {scopeLabel}</small></div></div><div className="admin-permission-list"><span><Check size={13} /> {isLeader ? '管理全部届次与内容' : isContributor ? `只读查看 ${user.cohort} 届内容` : `管理 ${user.cohort} 届内容`}</span><span>{isContributor ? <><Check size={13} /> 查看成员、内容、公告和操作记录</> : <><Check size={13} /> 成员资料与头像维护</>}</span><span>{isContributor ? <><LockKeyhole size={13} /> 编辑与发布权限由届次负责人维护</> : <><Check size={13} /> 公告与展示内容编辑</>}</span>{!isLeader && <span className="is-muted"><LockKeyhole size={13} /> 全局安全策略由组长维护</span>}</div></section>
    </div>
    <section className="admin-card admin-quick-card"><div className="admin-card-head"><div><p className="eyebrow">QUICK ACTIONS</p><h2>常用操作</h2></div><span className="admin-card-hint">{contentLoading ? '同步内容中…' : '内容已持久化'}</span></div><div className="admin-quick-grid"><button onClick={() => setActiveSection('members')}><UserCog size={16} /><span><strong>管理成员</strong><small>资料、角色与账号状态</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('announcements')}><Megaphone size={16} /><span><strong>发布公告</strong><small>把重要信息发到首页</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('personalization')}><Palette size={16} /><span><strong>调整站点体验</strong><small>主题、背景与全局文案</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('security')} disabled={!isLeader}><ShieldAlert size={16} /><span><strong>检查安全策略</strong><small>{isLeader ? '访问限制与会话配置' : '仅组长可配置'}</small></span><ChevronRight size={15} /></button></div></section>
  </>


  const renderCohorts = () => <div className="admin-stack">
    <section className="admin-card">
      <div className="admin-card-head"><div><p className="eyebrow">COHORT DIRECTORY</p><h2>届次目录</h2></div>{canEditAdminContent && <button className="primary-button admin-small-button" onClick={() => openCohortManager()}>{isLeader ? <><Plus size={15} /> 管理届次</> : <><UserCog size={15} /> 编辑本届</>}</button>}</div>
      <div className="admin-cohort-grid">
        {adminCohorts.map((cohort) => <article
          className={'admin-cohort-card ' + (cohort.id === selectedCohort?.id ? 'active ' : '') + (cohort.status === 'active' ? 'current' : '')}
          key={cohort.id}
          role="button"
          tabIndex={0}
          aria-pressed={cohort.id === selectedCohort?.id}
          onClick={() => setSelectedCohortId(cohort.id)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedCohortId(cohort.id) } }}
        >
          <div><span className="admin-cohort-year">{cohort.year}</span><Tag tone={cohort.status === 'active' ? 'mint' : 'neutral'}>{cohort.status === 'active' ? '当前届' : cohort.status === 'draft' ? '草稿' : '已归档'}</Tag></div>
          <strong>{cohort.generationLabel}</strong>
          <div className="admin-team-tags">{cohort.teams.map((team) => <span key={team.id}>{team.name} · {team.memberCapacity == null ? '未设置上限' : `${team.memberCapacity} 人上限`}</span>)}</div>
           {(isLeader || cohort.year.replace(/\D/g, '') === userCohortYear) && <button className="admin-link-button" onClick={(event) => { event.stopPropagation(); openCohortManager(cohort.id) }}>编辑届次 <ArrowUpRight size={13} /></button>}
        </article>)}
      </div>
       <p className="admin-cohort-selection-hint">点击届次卡片切换下方小组资料；{isLeader ? '点击“编辑届次”修改配置。' : '届次负责人只能编辑自己负责的届次。'}</p>
    </section>
    <section className="admin-card">
      <div className="admin-card-head"><div><p className="eyebrow">{selectedCohort?.status === 'active' ? 'CURRENT TEAMS / ' : 'VIEWING TEAMS / '}{selectedCohort?.year ?? 'CURRENT'}</p><h2>{selectedCohort?.status === 'active' ? '本届小组' : (selectedCohort?.year ?? '') + '届小组'}</h2></div><span className="admin-card-hint">组长与负责人共同维护</span></div>
       <div className="admin-team-list">{(selectedCohort?.teams ?? []).map((team) => <div className="admin-team-row" key={team.id}><span className={'admin-team-icon tone-' + team.accent}><Users size={16} /></span><div><strong>{team.name}</strong><small>{team.memberCapacity == null ? '未设置成员人数' : `${team.memberCapacity} 人`} · {team.description}</small></div><b>{teamMemberCount(selectedCohort ?? { year: '' }, team)} 人</b><button className="icon-button small" onClick={() => openCohortManager(selectedCohort?.id)} aria-label={'管理' + team.name}><ArrowUpRight size={14} /></button></div>)}</div>
    </section>
  </div>


  const renderMembers = () => {
    const selectedMember = visibleMembers.find((member) => adminMemberSelectionKey(member) === selectedMemberId) ?? pagedMembers[0] ?? null
    const selectedAccount = selectedMember?.account ?? (selectedMember ? accountById.get(selectedMember.id) : undefined)
    const selectedBio = selectedAccount?.bio?.trim() ?? ''
    const selectedRoleDraft = selectedAccount && accountRoleDraft?.accountId === selectedAccount.id ? accountRoleDraft : null
    const selectedRoleCohort = selectedRoleDraft
      ? sortedCohorts.find((cohort) => cohort.year.replace(/\D/g, '') === selectedRoleDraft.cohort.replace(/\D/g, ''))
      : undefined
    const selectedStatus = selectedMember ? getMemberAccountStatus(selectedMember.id) : 'active'
    const selectedStatusLabel = selectedStatus === 'disabled' ? '已禁用' : selectedStatus === 'closed' ? '已注销' : '正常'
    const selectedCanEdit = Boolean(selectedMember && selectedMember.source === 'member' && canEditAdminContent && belongsToUserCohort(selectedMember.cohort))
    const selectedIsCurrentUser = selectedAccount?.id === user.id
    const selectedHasAccount = Boolean(selectedAccount)
    const toggleSelectedAccount = () => {
      if (!selectedMember || selectedIsCurrentUser) return
      if (selectedHasAccount) void handleToggleDemoAccount(selectedMember.id)
      else void handleToggleMemberAccount(selectedMember.id)
    }
    const closeSelectedAccount = () => {
      if (!selectedMember || selectedIsCurrentUser) return
      if (selectedHasAccount) void handleCloseDemoAccount(selectedMember.id)
      else void handleCloseMemberAccount(selectedMember.id)
    }
    const visibleCohorts = sortedCohorts.filter((cohort) => isLeader || cohort.year === user.cohort.replace(' 届', ''))
    return <div className="admin-stack">
      <section className="admin-card admin-member-workspace">
        <div className="admin-card-head">
          <div><p className="eyebrow">ACCOUNT DIRECTORY / {scopeLabel}</p><h2>成员账号管理</h2><p className="admin-member-workspace-intro">按届次整理成员资料、登录状态和权限范围，选中一位成员查看详情。</p></div>
          <div className="admin-head-actions">{isLeader && <button className="secondary-button admin-small-button" onClick={() => openMemberEditor()}><Plus size={15} /> 添加成员</button>}{isContributor && <span className="admin-card-hint">组员只读查看</span>}{!isDemoAuth && !isContributor && <span className="admin-card-hint">成员资料由后端维护</span>}</div>
        </div>
        <div className="admin-member-layout">
          <nav className="admin-member-rail" aria-label="按届次查看成员">
            <div className="admin-member-rail-head"><span>届次目录</span><small>{scopedMembers.length} 人</small></div>
            <div className="admin-member-rail-list">
              <button type="button" className={memberCohortFilter === '全部' ? 'active' : ''} onClick={() => { setMemberCohortFilter('全部'); setMemberTeamFilter('全部'); setMemberPage(1) }}><span><Users size={14} /><strong>全部成员</strong></span><small>{scopedMembers.length}</small></button>
              {visibleCohorts.map((cohort) => { const count = scopedMembers.filter((member) => member.cohort.replace(/\D/g, '') === cohort.year).length; return <button type="button" key={cohort.id} className={memberCohortFilter === cohort.year ? 'active' : ''} onClick={() => { setMemberCohortFilter(cohort.year); setMemberTeamFilter('全部'); setMemberPage(1) }}><span><CalendarDays size={14} /><strong>{cohort.year} 届</strong></span><small>{count}</small></button> })}
            </div>
            <div className="admin-member-rail-note"><ShieldCheck size={14} /><span>{isLeader ? '可查看全部届次' : `仅显示 ${user.cohort} 届`}</span></div>
          </nav>
          <section className="admin-member-directory" aria-label="成员列表">
            <div className="admin-member-directory-head"><div><p className="eyebrow">MEMBER LIST</p><h3>{memberCohortFilter === '全部' ? '全部成员' : `${memberCohortFilter} 届成员`}</h3></div><span>{visibleMembers.length} 个结果</span></div>
            <div className="admin-filter-row admin-member-filter-row">
              <div className="admin-search"><Search size={15} /><input value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setMemberPage(1) }} placeholder="搜索姓名、邮箱、方向或角色" /></div>
              <div className="admin-member-filters"><select className="admin-filter-select" value={memberTeamFilter} onChange={(event) => { setMemberTeamFilter(event.target.value); setMemberPage(1) }}><option value="全部">全部小组</option>{memberDirectionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select></div>
            </div>
            {visibleMembers.length ? <div className="admin-member-list">{pagedMembers.map((member) => { const accountStatus = getMemberAccountStatus(member.id); const statusLabel = accountStatus === 'disabled' ? '已禁用' : accountStatus === 'closed' ? '已注销' : '正常'; return <button type="button" className={`admin-member-row ${selectedMember && adminMemberSelectionKey(selectedMember) === adminMemberSelectionKey(member) ? 'selected' : ''}`} key={member.id} onClick={() => setSelectedMemberId(adminMemberSelectionKey(member))}><Avatar initials={member.initials} name={member.name} avatarUrl={member.avatarUrl} accent={member.accent} size="sm" /><span className="admin-member-main"><strong>{member.name}</strong><small>{member.direction} · {member.cohort}{member.account?.email ? ` · ${member.account.email}` : ''}</small></span><Tag tone={member.role.includes('组长') ? 'blue' : member.role.includes('负责人') ? 'mint' : 'neutral'}>{member.role}</Tag><span className={`admin-member-status ${accountStatus}`}><i /> {statusLabel}</span><ChevronRight size={15} className="admin-member-row-chevron" /></button> })}</div> : <div className="admin-empty"><UserCog size={22} /><strong>{memberSearch ? '没有匹配的成员' : memberCohortFilter !== '全部' || memberTeamFilter !== '全部' ? '这个筛选下还没有成员' : '成员资料还未同步'}</strong><span>{isDemoAuth ? '管理员登录后可在这里补充成员资料。' : '后端成员目录暂时没有可展示的账号。'}</span>{isLeader && <button className="secondary-button admin-small-button" onClick={() => openMemberEditor()}>开始整理</button>}</div>}
            {memberPageCount > 1 && <div className="admin-member-pagination"><span>第 {safeMemberPage} / {memberPageCount} 页 · 共 {visibleMembers.length} 人</span><div><button type="button" className="secondary-button admin-small-button" disabled={safeMemberPage === 1} onClick={() => setMemberPage((page) => Math.max(1, page - 1))}>上一页</button><button type="button" className="secondary-button admin-small-button" disabled={safeMemberPage === memberPageCount} onClick={() => setMemberPage((page) => Math.min(memberPageCount, page + 1))}>下一页</button></div></div>}
          </section>
          <aside className="admin-member-detail" aria-label="成员详情">
            {selectedMember ? <>
              <div className="admin-member-detail-head"><Avatar initials={selectedMember.initials} name={selectedMember.name} avatarUrl={selectedMember.avatarUrl} accent={selectedMember.accent} size="lg" /><div><p className="eyebrow">SELECTED MEMBER</p><h3>{selectedMember.name}</h3><span>{selectedMember.cohort} · {selectedMember.direction}</span></div></div>
              <div className={`admin-member-detail-status ${selectedStatus}`}><i /> <strong>{selectedStatusLabel}</strong><span>{selectedStatus === 'active' ? '可以正常登录' : selectedStatus === 'disabled' ? '暂时禁止登录' : '账号已失效'}</span></div>
              <dl className="admin-member-detail-facts"><div><dt><Mail size={13} />登录邮箱</dt><dd>{selectedAccount?.email ?? '尚未绑定登录邮箱'}</dd></div><div><dt><ShieldCheck size={13} />账号权限</dt><dd>{selectedAccount ? roleLabels[selectedAccount.role] ?? selectedAccount.role : '无登录账号'}</dd></div><div><dt><Users size={13} />小组职务</dt><dd>{selectedMember.role}</dd></div><div><dt><Folder size={13} />参与项目</dt><dd>{selectedMember.projects.length ? `${selectedMember.projects.length} 个项目` : '暂未关联项目'}</dd></div></dl>
              <div className="admin-member-detail-profile"><div className="admin-member-detail-profile-label"><FileText size={13} />个人简介</div><p>{selectedBio || '暂未填写个人简介'}</p></div>
              <div className="admin-member-detail-scope"><UserCog size={14} /><div><strong>{selectedMember.source === 'account' ? '登录账号' : '成员资料'}</strong><span>{selectedAccount ? '账号状态与成员资料已关联' : '当前只有成员资料，尚未关联登录账号'}</span></div></div>
              {selectedAccount && isLeader && !selectedIsCurrentUser && selectedStatus !== 'closed' && (accountRoleEditorId === selectedAccount.id && selectedRoleDraft ? <form className="admin-account-role-editor admin-editor-form" onSubmit={(event) => { event.preventDefault(); void saveAccountRole(selectedAccount, selectedRoleDraft) }}>
                <div className="admin-account-role-editor-head"><strong>调整账号权限</strong><span>权限由后端验证；小组职务独立维护。</span></div>
                <label><span>账号角色</span><select value={selectedRoleDraft.role} onChange={(event) => setAccountRoleDraft({ ...selectedRoleDraft, role: event.target.value as ManagedAccountRoleDraft['role'] })}>
                  <option value="Member">普通成员</option>
                  <option value="Contributor">组员</option>
                  <option value="CohortLeader">届次负责人</option>
                  <option value="Leader">组长</option>
                </select></label>
                <div className="admin-account-role-fields">
                  <label><span>所属届次{selectedRoleDraft.role === 'CohortLeader' || selectedRoleDraft.role === 'Contributor' ? '（必选）' : ''}</span><select required={selectedRoleDraft.role === 'CohortLeader' || selectedRoleDraft.role === 'Contributor'} value={selectedRoleDraft.cohort} onChange={(event) => setAccountRoleDraft({ ...selectedRoleDraft, cohort: event.target.value, direction: '' })}>
                    <option value="">未分配</option>
                    {sortedCohorts.map((cohort) => <option key={cohort.id} value={cohort.year}>{cohort.year} 届</option>)}
                  </select></label>
                  <label><span>所属小组{selectedRoleDraft.role === 'Contributor' ? '（组员必选）' : ''}</span><select required={selectedRoleDraft.role === 'Contributor'} value={selectedRoleDraft.direction} disabled={!selectedRoleCohort} onChange={(event) => setAccountRoleDraft({ ...selectedRoleDraft, direction: event.target.value })}>
                    <option value="">未分配</option>
                    {(selectedRoleCohort?.teams ?? []).map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
                  </select></label>
                </div>
                <p className="admin-account-role-note">组长权限覆盖全站；届次负责人需要指定届次；组员需要指定届次和小组。</p>
                <div className="admin-account-role-actions"><button type="button" className="secondary-button admin-small-button" disabled={accountRoleBusy} onClick={() => { setAccountRoleEditorId(null); setAccountRoleDraft(null) }}>取消</button><button type="submit" className="primary-button admin-small-button" disabled={accountRoleBusy}><Save size={13} />{accountRoleBusy ? '保存中…' : '保存权限'}</button></div>
              </form> : <button type="button" className="secondary-button admin-small-button admin-account-role-open" onClick={() => startAccountRoleEdit(selectedAccount)}><ShieldCheck size={14} />调整账号权限</button>)}
              {selectedCanEdit || (isLeader && selectedMember.source === 'member') ? <div className="admin-member-detail-actions">{selectedCanEdit && <button className="secondary-button admin-small-button" onClick={() => openMemberEditor(selectedMember)}><UserCog size={14} /> 编辑资料</button>}{isLeader && selectedStatus !== 'closed' && !selectedIsCurrentUser && <button className="secondary-button admin-small-button" onClick={toggleSelectedAccount}>{selectedStatus === 'disabled' ? <><Check size={14} /> 启用账号</> : <><ShieldAlert size={14} /> 禁用账号</>}</button>}{isLeader && selectedStatus !== 'closed' && !selectedIsCurrentUser && <button className="admin-link-button admin-danger-link" onClick={closeSelectedAccount}>注销账号</button>}{isLeader && selectedMember.source === 'member' && <button className="admin-link-button admin-danger-link" onClick={() => void removeMember(selectedMember.id)}><Trash2 size={13} /> 删除成员</button>}</div> : <div className="admin-member-detail-readonly"><LockKeyhole size={14} /><span>当前身份只能查看，修改请联系届次负责人或组长。</span></div>}
              {selectedIsCurrentUser && <p className="admin-member-detail-hint">当前是你正在使用的管理员账号，不能在这里修改权限、禁用或注销。</p>}
            </> : <div className="admin-empty admin-member-detail-empty"><UserCog size={22} /><strong>选择一位成员</strong><span>成员详情和可用操作会显示在这里。</span></div>}
          </aside>
        </div>
      </section>
      <section className="admin-note-card"><LockKeyhole size={16} /><div><strong>账号安全边界</strong><p>这里不显示成员原密码。账号权限和状态由后端接口校验；小组职务是独立的展示资料，不会随账号权限自动改变。</p></div></section>
    </div>
  }
  const renderProjectReviewQueue = () => {
    const canReviewProjects = user.role === 'Leader'
      || user.role === 'Admin'
      || user.role === 'CohortLeader'

    if (!canReviewProjects) return null

    return <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="eyebrow">PROJECTS / MODERATION</p>
          <h2>项目审核</h2>
        </div>
        <div className="admin-head-actions">
          <span className="admin-card-hint">{projectReviewQueue.length} 条待处理</span>
          <button
            type="button"
            className="icon-button small"
            onClick={() => void loadProjectReviewQueue()}
            disabled={projectReviewLoading}
            aria-label="刷新项目审核队列"
            title="刷新审核队列"
          >
            <RefreshCw size={14} className={projectReviewLoading ? 'spin' : undefined} />
          </button>
        </div>
      </div>
      {projectReviewError && <div className="admin-inline-error" role="alert">{projectReviewError}</div>}
      {projectReviewLoading ? <div className="admin-empty"><RefreshCw size={20} className="spin" /><strong>正在加载审核队列</strong><span>正在读取待审核项目。</span></div> : projectReviewQueue.length ? <div className="admin-contribution-list">{projectReviewQueue.map((project) => <article className="admin-contribution-row" key={project.id}><div className="admin-contribution-icon"><Rocket size={16} /></div><div className="admin-contribution-main"><div><strong>{project.name}</strong><Tag tone={project.reviewStatus === 'rejected' ? 'red' : 'orange'}>{project.reviewStatus === 'rejected' ? '已退回' : '待审核'}</Tag></div><p>{project.description}</p><small>{project.year} 届 · {project.category} · {project.slug}</small>{project.reviewNote && <em>{project.reviewNote}</em>}</div><div className="admin-row-actions"><button type="button" className="admin-link-button" disabled={projectReviewBusyId === project.id} onClick={() => void handleReviewProject(project, 'approved')}><Check size={13} /> 通过</button><button type="button" className="admin-link-button admin-danger-link" disabled={projectReviewBusyId === project.id} onClick={() => void handleReviewProject(project, 'rejected')}><ShieldAlert size={13} /> 退回</button></div></article>)}</div> : <div className="admin-empty"><CheckCircle2 size={22} /><strong>暂时没有待审核项目</strong><span>新项目提交后会出现在这里。</span></div>}
    </section>
  }

  const renderContent = () => {
    const modules = [{ label: '学习路线', count: data.learningRoutes.length, icon: Route, tone: 'blue', note: '路线标题与节点' }, { label: '项目库', count: data.projects.length, icon: Rocket, tone: 'violet', note: '项目、分类、图片与工具页展示' }, { label: '资源库', count: manageableResources.length, icon: Folder, tone: 'mint', note: '资料、分类与链接' }, { label: '面经墙', count: data.interviews.length, icon: MessageCircle, tone: 'orange', note: '经验、分类与标签' }, { label: '比赛中心', count: data.competitionEvents.length, icon: Trophy, tone: 'rose', note: '赛事与报名状态' }, { label: '历届合影', count: sortedCohorts.length, icon: Camera, tone: 'blue', note: '照片墙与管理员上传' }]
    return <>
      <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">CONTENT REGISTRY</p><h2>内容模块</h2></div><div className="admin-head-actions">{isLeader && <button className="primary-button admin-small-button" onClick={() => openCollectionManager('项目库')}><Plus size={15} /> 新建内容</button>}</div></div><div className="admin-content-grid">{modules.map(({ label, count, icon: ContentIcon, tone, note }) => <button className="admin-content-module" key={label} onClick={() => { if (label === '历届合影') openPhotoManager(); else if (label === '比赛中心') openCompetitionManager(); else if (label === '学习路线') openLearningRouteEditor(); else openCollectionManager(label as AdminCollectionKind) }}><span className={`admin-content-icon tone-${tone}`}><ContentIcon size={17} /></span><span><strong>{label}</strong><small>{`${count} 条`} · {note}</small></span><ArrowUpRight size={14} /></button>)}</div>{isContributor && <p className="admin-cohort-selection-hint">组员当前为只读模式；如需新增或修改内容，请联系届次负责人。</p>}{!isLeader && !isContributor && <p className="admin-cohort-selection-hint">届次负责人可维护本届成员、公告、面经和资源；项目、路线及赛事由组长统一管理。</p>}</section><section className="admin-card admin-api-card"><div className="admin-api-mark"><ServerCog size={19} /></div><div><p className="eyebrow">CONTENT STORAGE</p><h2>内容编辑器</h2><p>{isDemoAuth ? '内容保存在当前浏览器，可用于本地演示和编辑。' : '内容通过后端 CRUD 接口保存，管理员权限由后端校验。'}</p></div><Tag tone={isDemoAuth ? 'mint' : 'blue'}>{isDemoAuth ? '本地快照' : '后端接口'}</Tag></section></div>
    </>
  }
  const renderAnnouncements = () => {
    const normalizedQuery = announcementQuery.trim().toLowerCase()
    const filteredAnnouncementItems = announcementItems.filter((announcement) => !normalizedQuery || `${announcement.title} ${announcement.detail} ${announcement.category} ${announcement.scope}`.toLowerCase().includes(normalizedQuery))
    return <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">BROADCAST CENTER</p><h2>公告列表</h2></div>{canEditAdminContent && <button className="primary-button admin-small-button" onClick={() => openAnnouncementEditor()}><Plus size={15} /> 新建公告</button>}</div><label className="admin-search admin-admin-list-search"><Search size={14} /><input value={announcementQuery} onChange={(event) => setAnnouncementQuery(event.target.value)} placeholder="搜索标题、内容、分类或可见范围" aria-label="搜索公告" /></label><div className="admin-announcement-list">{filteredAnnouncementItems.map((announcement) => <div className="admin-announcement-row" key={announcement.id}><Tag tone={announcement.category === '重要' ? 'red' : announcement.category === '比赛' ? 'orange' : 'blue'}>{announcement.category}</Tag><div><strong>{announcement.title}</strong><small>{announcement.detail}</small></div><time>{announcement.date}</time><span className={`admin-announcement-status ${announcement.published ? 'published' : 'draft'}`}>{announcement.published ? '已发布' : '草稿'}</span>{canEditAnnouncement(announcement) ? <div className="admin-row-actions"><button className="admin-link-button" onClick={() => openAnnouncementEditor(announcement)}>编辑 <ArrowUpRight size={13} /></button><button className="admin-link-button admin-danger-link" onClick={() => { void removeAnnouncement(announcement.id) }}>删除</button></div> : <span className="admin-row-readonly"><LockKeyhole size={13} /> 只读</span>}</div>)}</div>{filteredAnnouncementItems.length === 0 && <div className="admin-empty admin-list-empty"><Megaphone size={20} /><strong>{announcementItems.length ? '没有匹配的公告' : '还没有公告'}</strong><span>{announcementItems.length ? '换个关键词再试试。' : '创建第一条公告后会显示在这里。'}</span></div>}</section><section className="admin-card admin-publish-card"><div><p className="eyebrow">PUBLISHING RULE</p><h2>发布前检查</h2><p>公告发布后会记录发布人、发布时间和可见范围。本届负责人只能发布到自己负责的届次空间。</p></div><div className="admin-check-list"><span><Check size={13} /> 需要明确公告分类</span><span><Check size={13} /> 支持保存草稿</span><span><Check size={13} /> 发布记录可追溯</span></div></section></div>
  }
  const renderPersonalization = () => <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">GLOBAL EXPERIENCE</p><h2>全局个性化</h2></div><Tag tone="blue">组长可发布</Tag></div><div className="admin-settings-list"><div className="admin-setting-row"><span className="admin-setting-icon tone-violet"><ImagePlus size={16} /></span><div><strong>校园背景图</strong><small>{globalBackground ? '已启用：白天校园晨曦，夜间静谧星空' : '已关闭：默认使用纸张留白，成员个人选择仍有效'}</small></div><button disabled={!isLeader} className={`admin-switch ${globalBackground ? 'on' : ''}`} onClick={() => void toggleGlobalBackground()} aria-pressed={globalBackground}><i /></button></div><div className="admin-setting-row"><span className="admin-setting-icon tone-mint"><FileText size={16} /></span><div><strong>首页文案</strong><small>“我们的目的”与公告标题由内容服务统一管理</small></div><button className="secondary-button admin-small-button" onClick={() => setCopyManagerOpen(true)}>编辑文案</button></div></div></section><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">MEMBER PREFERENCES</p><h2>成员个人设置范围</h2></div><span className="admin-card-hint">由成员自己控制</span></div><div className="admin-preference-grid"><button className="admin-preference-tile" onClick={() => setProfileOpen(true)}><UserCog size={16} /><strong>头像与简介</strong><span>每位成员可自行维护公开资料</span><ArrowUpRight size={14} /></button><button className="admin-preference-tile" onClick={() => setBackgroundOpen(true)}><Palette size={16} /><strong>背景与主题</strong><span>可覆盖全局默认，不影响他人</span><ArrowUpRight size={14} /></button><button className="admin-preference-tile" onClick={() => setPasswordOpen(true)}><KeyRound size={16} /><strong>密码与会话</strong><span>支持修改密码和退出所有设备</span><ArrowUpRight size={14} /></button></div></section></div>

  const renderSecurity = () => <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">ACCESS POLICY</p><h2>安全策略</h2></div><Tag tone="orange">组长专属</Tag></div><div className="admin-security-grid"><article><span className="admin-security-icon tone-blue"><LockKeyhole size={17} /></span><strong>后台 IP 白名单</strong><small>当前：{ipRestriction ? '已启用' : '未启用'} · 建议仅允许校园网或 VPN</small><button className={`admin-switch ${ipRestriction ? "on" : ""}`} onClick={() => { setIpRestriction((value) => !value); showToast(ipRestriction ? "IP 白名单已关闭" : "IP 白名单已启用") }} aria-pressed={ipRestriction}><i /></button></article><article><span className="admin-security-icon tone-mint"><ServerCog size={17} /></span><strong>Cloudflared / FRP</strong><small>当前：{tunnelStatus} · 仅展示状态，不在网页内启动或停止隧道进程</small><button className="secondary-button admin-small-button" onClick={() => { setTunnelStatus((value) => value === "未连接" ? "运行中" : "未连接"); showToast("隧道状态已刷新") }}>刷新状态</button></article><article><span className="admin-security-icon tone-violet"><ShieldCheck size={17} /></span><strong>会话与密码</strong><small>登录过期、强密码、重置链接和多设备退出</small><button className={`admin-switch ${sessionPolicy ? "on" : ""}`} onClick={() => { setSessionPolicy((value) => !value); showToast(sessionPolicy ? "会话强制退出已关闭" : "会话强制退出已启用") }} aria-pressed={sessionPolicy}><i /></button></article></div></section><section className="admin-note-card warning"><ShieldAlert size={16} /><div><strong>安全边界</strong><p>后台只管理访问策略和隧道状态，不直接控制服务器进程。实际暴露公网、证书和防火墙由运维脚本或云平台完成。</p></div></section></div>

  const renderInvites = () => {
    const normalizedQuery = inviteQuery.trim().toLowerCase()
    const visibleInviteCodes = inviteCodes.filter((inviteCode) => {
      const matchesFilter = inviteFilter === 'all' || inviteCode.status === 'active'
      const matchesSearch = !normalizedQuery || `${inviteCode.code} ${inviteCode.cohort ?? ''} ${inviteCode.direction ?? ''} ${inviteStatusLabels[inviteCode.status]}`.toLowerCase().includes(normalizedQuery)
      return matchesFilter && matchesSearch
    })
    const inviteCohortOptions = sortedCohorts.filter((cohort) => isLeader || cohort.year === userCohortYear)
    const inviteCohortRecord = inviteCohortOptions.find((cohort) => cohort.year === inviteCohort) ?? inviteCohortOptions[0]
    const inviteDirectionOptions = inviteCohortRecord?.teams.map((team) => team.name) ?? []
    return <div className="admin-invite-layout">
    <section className="admin-card admin-invite-create">
      <div className="admin-card-head"><div><p className="eyebrow">INVITE / CREATE</p><h2>生成邀请码</h2></div><KeyRound size={18} /></div>
      <p className="admin-card-description">邀请码只负责把已注册的普通成员升级为组员，不会绕过注册、登录或邮箱验证。</p>
      <div className="admin-editor-form">
        <label><span>加入届次</span><select value={inviteCohort} onChange={(event) => { setInviteCohort(event.target.value); const next = sortedCohorts.find((cohort) => cohort.year === event.target.value); setInviteDirection(next?.teams[0]?.name ?? '算法组') }}>{inviteCohortOptions.map((cohort) => <option key={cohort.id} value={cohort.year}>{cohort.year} 届</option>)}</select></label>
        <label><span>加入方向</span><select value={inviteDirection} onChange={(event) => setInviteDirection(event.target.value)}>{inviteDirectionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select></label>
        <label><span>有效期截止</span><input type="datetime-local" value={inviteExpiresAt} min={toDateTimeLocal(new Date())} onChange={(event) => setInviteExpiresAt(event.target.value)} /></label>
        <label><span>最大使用次数</span><input type="number" min="1" max="999" value={inviteMaxUses} onChange={(event) => setInviteMaxUses(event.target.value)} /></label>
        <label><span>兑换后角色</span><input value="组员（Contributor）" readOnly /></label>
      </div>
      <button className="primary-button admin-invite-create-button" onClick={handleCreateInviteCode}><Plus size={15} /> 生成邀请码</button>
      <div className="admin-note-card"><ShieldCheck size={15} /><div><strong>{isDemoAuth ? '本地演示模式' : '后端 API 模式'}</strong><p>{isDemoAuth ? '数据保存在当前浏览器。' : '邀请码由后端保存并通过数据库验证。'}</p></div></div>
    </section>
     <section className="admin-card admin-invite-list">
       <div className="admin-card-head"><div><p className="eyebrow">INVITE / DIRECTORY</p><h2>已创建的邀请码</h2></div><div className="admin-invite-list-head-actions"><span className="admin-card-hint">{inviteCodes.length} 个凭证</span><div className="admin-segmented-control" role="group" aria-label="邀请码筛选"><button type="button" className={inviteFilter === 'active' ? 'active' : ''} onClick={() => setInviteFilter('active')}>有效</button><button type="button" className={inviteFilter === 'all' ? 'active' : ''} onClick={() => setInviteFilter('all')}>全部</button></div></div></div>
       <label className="admin-search admin-admin-list-search"><Search size={14} /><input value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="搜索邀请码、届次、方向或状态" aria-label="搜索邀请码" /></label>
       {inviteCodes.length ? (visibleInviteCodes.length ? <div className="admin-invite-rows">{visibleInviteCodes.map((inviteCode) => <article className="admin-invite-row" key={inviteCode.id}><div className="admin-invite-main"><div className="admin-invite-row-head"><code>{inviteCode.code}</code></div><div className="admin-invite-meta"><span>{inviteCode.cohort ? `${inviteCode.cohort} 届 · ${inviteCode.direction ?? '待分配方向'}` : '兑换后待分配方向'}</span><span>{inviteCode.usedCount} / {inviteCode.maxUses} 次</span><span>{inviteCode.status === 'active' ? formatInviteExpiry(inviteCode.expiresAt) : `截止 ${new Date(inviteCode.expiresAt).toLocaleString('zh-CN')}`}</span><time>创建于 {new Date(inviteCode.createdAt).toLocaleString('zh-CN')}</time></div></div><div className="admin-row-actions"><span className={`admin-invite-status ${inviteCode.status}`}><i /> {inviteStatusLabels[inviteCode.status]}</span><button className="admin-link-button" onClick={() => void handleCopyInviteCode(inviteCode.code)}><Copy size={13} /> 复制</button>{inviteCode.status === 'active' ? <button className="admin-link-button admin-danger-link" onClick={() => handleRevokeInviteCode(inviteCode.id)}><ShieldAlert size={13} /> 撤销</button> : <button className="admin-link-button admin-danger-link" onClick={() => handleDeleteInviteCode(inviteCode)}><Trash2 size={13} /> 删除</button>}</div></article>)}</div> : <div className="admin-empty admin-invite-filter-empty"><KeyRound size={20} /><strong>{inviteCodes.length && visibleInviteCodes.length === 0 ? '没有匹配的邀请码' : '没有有效邀请码'}</strong><span>{inviteCodes.length && visibleInviteCodes.length === 0 ? '换个关键词或切换筛选范围再试试。' : '切换到“全部”可以查看并清理已过期或已撤销的记录。'}</span></div>) : <div className="admin-empty admin-invite-empty"><KeyRound size={22} /><strong>还没有邀请码</strong><span>设置有效期和使用次数后，生成第一张加入凭证。</span></div>}
     </section>
   </div>
  }

  const renderContributions = () => {
    const canReviewJoinRequests = user.role === 'Leader'
      || user.role === 'Admin'
      || user.role === 'CohortLeader'
    const getProjectSubmitter = (project: Project) => {
      const account = demoAccountDirectory.find((item) => String(item.id) === String(project.submittedBy))
      return {
        name: project.submittedByName || account?.name || '项目提交人',
        direction: project.submittedByDirection || (account ? accountDirectoryDirection(account) : '未分配方向'),
      }
    }
    const projectRows: AdminContributionRow[] = projectReviewQueue.map((project) => {
      const submitter = getProjectSubmitter(project)
      return {
      id: `project:${project.id}`,
      type: 'project' as const,
      title: project.name,
      description: project.description,
      category: project.category,
      submitterName: submitter.name,
      cohort: `${project.year} 届`,
      direction: submitter.direction,
      submittedAt: project.createdAt ?? '',
      status: project.reviewStatus === 'rejected' ? 'rejected' as const : 'pending' as const,
      reviewNote: project.reviewNote,
      project,
      }
    })
    const resourceRows: AdminContributionRow[] = contributionSubmissions.map((submission) => ({
      id: `resource:${submission.id}`,
      type: 'resource' as const,
      title: submission.title,
      description: submission.description,
      category: submission.category,
      submitterName: submission.submitterName,
      cohort: '未标注届次',
      direction: '未标注方向',
      submittedAt: submission.submittedAt,
      status: submission.status,
      reviewNote: submission.reviewNote,
      submission,
    }))
    const interviewRows: AdminContributionRow[] = interviewReviewQueue
      .filter((submission) => !['draft', 'withdrawn'].includes(submission.status))
      .map((submission) => ({
        id: `interview:${submission.id}`,
        type: 'interview' as const,
        title: `${submission.company || '未命名公司'} · ${submission.role || '未命名岗位'}`,
        description: submission.summary || '投稿人尚未填写总结。',
        category: submission.category || '未标注方向',
      submitterName: submission.submitterName || submission.submitterId,
        cohort: submission.cohort || '未标注届次',
        direction: submission.category || '未标注方向',
        submittedAt: submission.submittedAt,
        status: submission.status,
        reviewNote: submission.reviewNote,
        interview: submission,
      }))
    const feedbackRows: AdminContributionRow[] = feedbackMessages.map((feedback) => ({
      id: `feedback:${feedback.id}`,
      type: 'feedback' as const,
      title: feedback.category || '留言建议',
      description: feedback.content,
      category: '留言建议',
      submitterName: feedback.contact || '匿名访客',
      cohort: '未标注届次',
      direction: '全站建议',
      submittedAt: feedback.createdAt,
      status: feedback.status === 'resolved' ? 'approved' as const : feedback.status === 'read' ? 'changes_requested' as const : 'pending' as const,
      reviewNote: feedback.reviewNote,
      feedback,
    }))
    const promptRows: AdminContributionRow[] = promptReviewQueue.map((prompt) => ({
      id: `prompt:${prompt.id}`,
      type: 'prompt' as const,
      title: prompt.title,
      description: prompt.usage || '投稿人没有填写适用场景。',
      category: prompt.category,
      submitterName: prompt.submitterName || '未知投稿人',
      cohort: prompt.submitterCohort || '未标注届次',
      direction: prompt.submitterDirection || '未标注方向',
      submittedAt: prompt.submittedAt || prompt.createdAt || '',
      status: prompt.status,
      reviewNote: prompt.reviewNote,
      prompt,
    }))
    const allRows = [...projectRows, ...resourceRows, ...interviewRows, ...promptRows, ...feedbackRows]
    const rows = allRows
      .filter((row) => contributionTypeFilter === 'all' || row.type === contributionTypeFilter)
      .filter((row) => {
        if (contributionStatusFilter === 'all') return true
        if (row.type === 'feedback') {
          if (contributionTypeFilter === 'all' && contributionStatusFilter === 'pending') {
            return row.feedback?.status !== 'resolved'
          }
          return row.feedback?.status === contributionStatusFilter
        }
        return row.status === contributionStatusFilter
      })
      .filter((row) => contributionCohortFilter === 'all' || row.cohort === contributionCohortFilter)
      .filter((row) => contributionDirectionFilter === 'all' || row.direction === contributionDirectionFilter)
      .filter((row) => {
        const query = contributionQuery.trim().toLowerCase()
        return !query || `${row.title} ${row.description} ${row.category} ${row.submitterName} ${row.cohort} ${row.direction}`.toLowerCase().includes(query)
      })
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
    const pendingCount = allRows.filter((row) => row.type === 'interview'
      ? false
      : row.type === 'feedback'
        ? row.feedback?.status !== 'resolved'
        : row.status === 'pending').length + interviewPendingTotal
    const typeLabels = { all: '全部投稿', project: '项目投稿', resource: '资源投稿', feedback: '留言建议', interview: '面经投稿', prompt: 'Prompt 投稿' } as const
    const statusLabels: Record<typeof contributionStatusFilter, string> = {
      pending: contributionTypeFilter === 'feedback' ? '待查看' : contributionTypeFilter === 'all' ? '待处理' : '待审核',
      read: '已查看',
      resolved: '已处理',
      changes_requested: '要求修改',
      approved: '已通过',
      rejected: '已退回',
      all: '全部状态',
    }
    const statusOptions = contributionTypeFilter === 'feedback'
      ? [['pending', '待查看'], ['read', '已查看'], ['resolved', '已处理'], ['all', '全部状态']] as const
      : [[ 'pending', contributionTypeFilter === 'all' ? '待处理' : '待审核' ]] as const
    const cohortOptions = Array.from(new Set(allRows.map((row) => row.cohort).filter((value) => value !== '未标注届次')))
    const directionOptions = Array.from(new Set(allRows.map((row) => row.direction).filter((value) => value !== '未标注方向' && value !== '全站建议')))
    const visibleInterviewTotal = interviewReviewPage.total
    return <div className="admin-stack">
      <section className="admin-card admin-contribution-center">
        <div className="admin-card-head"><div><p className="eyebrow">REVIEW / WORKSPACE</p><h2>审核中心</h2><p className="admin-card-description">内容投稿与项目加入申请分开处理，待办集中在同一工作区。</p></div><div className="admin-contribution-summary"><strong>{contributionWorkspaceTab === 'contributions' ? pendingCount : projectJoinRequests.length}</strong><span>待处理</span></div></div>
        <div className="admin-contribution-tabs admin-review-workflow-tabs" role="tablist" aria-label="处理队列">
          <button type="button" role="tab" aria-selected={contributionWorkspaceTab === 'contributions'} className={contributionWorkspaceTab === 'contributions' ? 'active' : ''} onClick={() => setContributionWorkspaceTab('contributions')}>内容投稿 <small>{pendingCount}</small></button>
          {canReviewJoinRequests && <button type="button" role="tab" aria-selected={contributionWorkspaceTab === 'join-requests'} className={contributionWorkspaceTab === 'join-requests' ? 'active' : ''} onClick={() => setContributionWorkspaceTab('join-requests')}>项目加入申请 <small>{projectJoinRequests.length}</small></button>}
        </div>
        {contributionWorkspaceTab === 'contributions' || !canReviewJoinRequests ? <>
        <div className="admin-contribution-tabs" role="tablist" aria-label="投稿类型">
          <button type="button" className={contributionTypeFilter === 'all' ? 'active' : ''} onClick={() => { setContributionTypeFilter('all'); setContributionStatusFilter('pending') }}>全部投稿 <small>{pendingCount}</small></button>
          <button type="button" className={contributionTypeFilter === 'project' ? 'active' : ''} onClick={() => { setContributionTypeFilter('project'); setContributionStatusFilter('pending') }}><Rocket size={14} /> 项目 <small>{allRows.filter((row) => row.type === 'project').length}</small></button>
          <button type="button" className={contributionTypeFilter === 'resource' ? 'active' : ''} onClick={() => { setContributionTypeFilter('resource'); setContributionStatusFilter('pending') }}><Folder size={14} /> 资源 <small>{allRows.filter((row) => row.type === 'resource').length}</small></button>
          <button type="button" className={contributionTypeFilter === 'interview' ? 'active' : ''} onClick={() => { setContributionTypeFilter('interview'); setContributionStatusFilter('pending') }}><MessageCircle size={14} /> 面经 <small>{visibleInterviewTotal}</small></button>
          {isLeader && <button type="button" className={contributionTypeFilter === 'prompt' ? 'active' : ''} onClick={() => { setContributionTypeFilter('prompt'); setContributionStatusFilter('pending') }}><Sparkles size={14} /> Prompt <small>{allRows.filter((row) => row.type === 'prompt').length}</small></button>}
          <button type="button" className={contributionTypeFilter === 'feedback' ? 'active' : ''} onClick={() => { setContributionTypeFilter('feedback'); setContributionStatusFilter('all') }}><Quote size={14} /> 建议 <small>{allRows.filter((row) => row.type === 'feedback' && row.feedback?.status !== 'resolved').length}</small></button>
        </div>
        <div className="admin-filter-row admin-contribution-filters"><div className="admin-search"><Search size={15} /><input value={contributionQuery} onChange={(event) => setContributionQuery(event.target.value)} placeholder="搜索标题、投稿人、届次或方向" aria-label="搜索投稿" /></div><select className="admin-filter-select" value={contributionStatusFilter} onChange={(event) => setContributionStatusFilter(event.target.value as typeof contributionStatusFilter)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="admin-filter-select" value={contributionCohortFilter} onChange={(event) => setContributionCohortFilter(event.target.value)}><option value="all">全部届次</option>{cohortOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select><select className="admin-filter-select" value={contributionDirectionFilter} onChange={(event) => setContributionDirectionFilter(event.target.value)}><option value="all">全部方向</option>{directionOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="admin-contribution-context"><span>{typeLabels[contributionTypeFilter]} · {statusLabels[contributionStatusFilter]}</span><span>{rows.length} 条结果</span></div>
        <div className="admin-contribution-results">
        {projectReviewError && contributionTypeFilter !== 'resource' && contributionTypeFilter !== 'feedback' && contributionTypeFilter !== 'interview' && <div className="admin-inline-error" role="alert">项目投稿暂时无法加载：{projectReviewError}</div>}
        {promptReviewError && contributionTypeFilter === 'prompt' && <div className="admin-inline-error" role="alert">Prompt 投稿暂时无法加载：{promptReviewError}</div>}
        {interviewReviewError && contributionTypeFilter !== 'resource' && contributionTypeFilter !== 'feedback' && contributionTypeFilter !== 'project' && contributionTypeFilter !== 'prompt' && <div className="admin-inline-error" role="alert">面经投稿暂时无法加载：{interviewReviewError}</div>}
        {(projectReviewLoading && contributionTypeFilter !== 'resource' && contributionTypeFilter !== 'feedback' && contributionTypeFilter !== 'interview') || (interviewReviewLoading && !interviewReviewQueue.length && (contributionTypeFilter === 'interview' || contributionTypeFilter === 'all')) ? <div className="admin-empty"><RefreshCw size={20} className="spin" /><strong>正在加载投稿</strong><span>正在读取对应的审核队列。</span></div> : rows.length ? <div className="admin-contribution-list">{rows.map((row) => {
          const feedback = row.type === 'feedback' ? row.feedback : undefined
          const nextFeedbackStatus = feedback?.status === 'read' ? 'resolved' : 'read'
          return <article className="admin-contribution-row" key={row.id}>
            <div className={`admin-contribution-icon admin-contribution-icon-${row.type}`}>{row.type === 'project' ? <Rocket size={16} /> : row.type === 'feedback' ? <Quote size={16} /> : row.type === 'interview' ? <MessageCircle size={16} /> : row.type === 'prompt' ? <Sparkles size={16} /> : <FileText size={16} />}</div>
            <div className="admin-contribution-main">
              <div><strong>{row.title}</strong><Tag tone={getContributionStatusTone(row)}>{getContributionStatusLabel(row)}</Tag><span className="admin-contribution-type">{row.type === 'project' ? '项目投稿' : row.type === 'feedback' ? '留言建议' : row.type === 'interview' ? '面经投稿' : row.type === 'prompt' ? 'Prompt 投稿' : '资源投稿'}</span></div>
              <p>{row.description}</p>
              <small>{row.category} · {row.submitterName} · {row.cohort} · {row.direction} · {row.submittedAt ? new Date(row.submittedAt).toLocaleString('zh-CN') : '时间待同步'}</small>
              {row.reviewNote && <em>{row.reviewNote}</em>}
            </div>
            <div className="admin-row-actions">
              <button type="button" className="admin-link-button" onClick={() => setSelectedContribution(row)}><ArrowUpRight size={13} /> 查看详情</button>
              {row.type === 'feedback' && feedback && <>
                {feedback.status !== 'resolved' && <button type="button" className="admin-link-button" disabled={feedbackBusyId === feedback.id} onClick={() => void handleUpdateFeedback(feedback, nextFeedbackStatus)}><Check size={13} /> {feedback.status === 'read' ? '标记已处理' : '标记已查看'}</button>}
                {feedback.status === 'resolved' && <button type="button" className="admin-link-button admin-danger-link" disabled={deleteBusy} onClick={() => requestDeleteResolvedFeedback(row)}><Trash2 size={13} /> 删除留言记录</button>}
              </>}
              {row.status === 'pending' && row.type !== 'feedback' && row.type !== 'interview' && (row.type === 'project' ? <><button type="button" className="admin-link-button" disabled={projectReviewBusyId === row.project?.id} onClick={() => row.project && void handleReviewProject(row.project, 'approved')}><Check size={13} /> 通过</button><button type="button" className="admin-link-button admin-danger-link" disabled={projectReviewBusyId === row.project?.id} onClick={() => row.project && void handleReviewProject(row.project, 'rejected')}><ShieldAlert size={13} /> 退回</button></> : row.type === 'prompt' ? <><button type="button" className="admin-link-button" disabled={promptReviewBusyId === row.prompt?.id} onClick={() => row.prompt && void handleReviewPrompt(row.prompt, 'approved')}><Check size={13} /> 通过</button><button type="button" className="admin-link-button admin-danger-link" disabled={promptReviewBusyId === row.prompt?.id} onClick={() => row.prompt && void handleReviewPrompt(row.prompt, 'rejected')}><ShieldAlert size={13} /> 退回</button></> : <><button type="button" className="admin-link-button" onClick={() => row.submission && void handleReviewSubmission(row.submission, 'approved')}><Check size={13} /> 通过</button><button type="button" className="admin-link-button admin-danger-link" onClick={() => row.submission && void handleReviewSubmission(row.submission, 'rejected')}><ShieldAlert size={13} /> 退回</button></>)}
            </div>
          </article>
        })}</div> : <div className="admin-empty"><Send size={22} /><strong>{contributionTypeFilter === 'interview' ? contributionStatusFilter === 'pending' ? '暂时没有待审核面经' : '没有符合条件的面经投稿' : contributionTypeFilter === 'prompt' ? contributionStatusFilter === 'pending' ? '暂时没有待审核 Prompt' : '没有符合条件的 Prompt 投稿' : contributionTypeFilter === 'feedback' ? `没有${statusLabels[contributionStatusFilter]}的留言建议` : contributionStatusFilter === 'pending' ? contributionTypeFilter === 'all' ? '暂时没有待处理投稿' : '暂时没有待审核投稿' : '没有符合条件的投稿'}</strong><span>{contributionTypeFilter === 'interview' ? '成员提交的面经会按权限进入审核队列，审核结果会通知投稿人。' : contributionTypeFilter === 'prompt' ? '成员提交的模板会显示在这里，审核结果会通过站内通知送达。' : contributionTypeFilter === 'feedback' ? '访客和成员提交的留言建议会显示在这里。' : '新投稿进入后会出现在这个分类中。'}</span></div>}
        {interviewReviewPage.page * interviewReviewPage.pageSize < interviewReviewPage.total && (contributionTypeFilter === 'all' || contributionTypeFilter === 'interview') && <div className="admin-load-more"><span>已加载 {interviewReviewQueue.length} / {interviewReviewPage.total} 条面经投稿</span><button type="button" className="secondary-button admin-small-button" disabled={interviewReviewLoading} onClick={() => void loadInterviewReviewQueue(interviewReviewPage.page + 1, true)}><ChevronDown size={14} />{interviewReviewLoading ? '加载中…' : '加载更多面经投稿'}</button></div>}
        </div>
        </> : <>
          <div className="admin-contribution-context admin-join-request-context"><span>项目加入申请 · 待处理</span><div className="admin-head-actions"><span>{projectJoinRequests.length} 条待处理</span><button type="button" className="icon-button small" onClick={() => void loadProjectJoinRequests()} disabled={projectJoinRequestsLoading} aria-label="刷新项目加入申请" title="刷新项目加入申请"><RefreshCw size={14} className={projectJoinRequestsLoading ? 'spin' : undefined} /></button></div></div>
          <div className="admin-contribution-results">
            {projectJoinRequestsError && <div className="admin-inline-error" role="alert">{projectJoinRequestsError}</div>}
            {projectJoinRequestsLoading ? <div className="admin-empty"><RefreshCw size={20} className="spin" /><strong>正在加载加入申请</strong><span>正在读取项目负责人待处理的申请。</span></div> : projectJoinRequests.length ? <div className="admin-contribution-list">{projectJoinRequests.map((request) => <article className="admin-contribution-row" key={request.id}><div className="admin-contribution-icon"><Users size={16} /></div><div className="admin-contribution-main"><div><strong>{request.userName ?? '未命名用户'}</strong><Tag tone="orange">待审核</Tag></div><p>{request.message || '申请人没有填写补充说明。'}</p><small>{request.projectName ?? '未命名项目'} · {request.createdAt ? new Date(request.createdAt).toLocaleString('zh-CN') : '时间待同步'}</small></div><div className="admin-row-actions"><button type="button" className="admin-link-button" disabled={projectJoinRequestBusyId === request.id} onClick={() => void handleReviewProjectJoinRequest(request, 'approved')}><Check size={13} /> 通过</button><button type="button" className="admin-link-button admin-danger-link" disabled={projectJoinRequestBusyId === request.id} onClick={() => void handleReviewProjectJoinRequest(request, 'rejected')}><ShieldAlert size={13} /> 退回</button></div></article>)}</div> : <div className="admin-empty"><CheckCircle2 size={22} /><strong>暂时没有待处理的加入申请</strong><span>用户从项目详情页提交申请后会出现在这里。</span></div>}
          </div>
        </>}
      </section>
      {selectedContribution && selectedContribution.type !== 'interview' && <div className="admin-modal-scrim" role="presentation" onClick={() => setSelectedContribution(null)}>
        <aside className="admin-contribution-drawer" role="dialog" aria-modal="true" aria-labelledby="contribution-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
            <div><p className="eyebrow">CONTRIBUTION DETAIL</p><h2 id="contribution-detail-title">{selectedContribution.title}</h2><p>{selectedContribution.type === 'project' ? '项目投稿' : selectedContribution.type === 'feedback' ? '留言建议' : selectedContribution.type === 'prompt' ? 'Prompt 投稿' : '资源投稿'} · {selectedContribution.category}</p></div>
            <button className="icon-button small" onClick={() => setSelectedContribution(null)} aria-label="关闭投稿详情"><X size={16} /></button>
          </div>
          <div className="admin-contribution-detail">
            <div className="admin-contribution-detail-meta"><Tag tone={getContributionStatusTone(selectedContribution)}>{getContributionStatusLabel(selectedContribution)}</Tag><span>{selectedContribution.submitterName}</span><span>{selectedContribution.cohort} · {selectedContribution.direction}</span><time>{selectedContribution.submittedAt ? new Date(selectedContribution.submittedAt).toLocaleString('zh-CN') : '时间待同步'}</time></div>
            <div className="admin-contribution-detail-copy"><h3>内容</h3><p>{selectedContribution.description}</p></div>
            {selectedContribution.prompt && <div className="admin-prompt-review-body"><h3>Prompt 正文</h3><pre>{selectedContribution.prompt.preview}</pre><p>适用模型：{selectedContribution.prompt.model}</p></div>}
            {selectedContribution.project && <div className="admin-project-review-detail">
              <div className="admin-project-review-cover">{safeImageSource(selectedContribution.project.coverImage) ? <img src={safeImageSource(selectedContribution.project.coverImage)} alt="项目封面" /> : <Rocket size={22} />}</div>
              <div className="admin-project-review-fields">
                <div><strong>项目入口</strong><div className="admin-project-review-links">{safeLink(selectedContribution.project.githubUrl) && <a href={safeLink(selectedContribution.project.githubUrl)} target="_blank" rel="noreferrer"><Github size={14} /> GitHub</a>}{safeLink(selectedContribution.project.docsUrl) && <a href={safeLink(selectedContribution.project.docsUrl)} target="_blank" rel="noreferrer"><FileText size={14} /> 文档</a>}{safeLink(selectedContribution.project.demoUrl) && <a href={safeLink(selectedContribution.project.demoUrl)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> 演示</a>}{safeLink(selectedContribution.project.downloadUrl) && <a href={safeLink(selectedContribution.project.downloadUrl)} target="_blank" rel="noreferrer"><Download size={14} /> 下载</a>}</div></div>
                <div><strong>技术栈</strong><div className="detail-tags">{selectedContribution.project.stack.length ? selectedContribution.project.stack.map((item) => <Tag tone="blue" key={item}>{item}</Tag>) : <span>未填写</span>}</div></div>
                <div><strong>项目说明</strong><p>{selectedContribution.project.intro || selectedContribution.project.description}</p></div>
                {selectedContribution.project.galleryImages?.length ? <div><strong>展示图片</strong><div className="admin-project-review-gallery">{selectedContribution.project.galleryImages.map((image, index) => { const source = safeImageSource(image); return source ? <img key={index} src={source} alt="项目展示图" /> : null })}</div></div> : null}
              </div>
            </div>}
            {selectedContribution.submission?.resourceUrl && <a className="admin-contribution-detail-link" href={selectedContribution.submission.resourceUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> 打开投稿链接</a>}
            {selectedContribution.submission?.attachments?.map((attachment) => <div className="admin-contribution-detail-file" key={attachment.assetId ?? attachment.id ?? attachment.url}><FileText size={15} /><span>附件：{attachment.name}{attachment.size ? ' · ' + (attachment.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>{safeLink(attachment.url) && <a href={safeLink(attachment.url)} target="_blank" rel="noreferrer"><Download size={13} /> 下载</a>}</div>)}
            {!selectedContribution.submission?.attachments?.length && selectedContribution.submission?.fileName && <div className="admin-contribution-detail-file"><FileText size={15} /><span>附件：{selectedContribution.submission.fileName}</span></div>}
            {selectedContribution.feedback?.contact && <div className="admin-contribution-detail-file"><Mail size={15} /><span>联系方式：{selectedContribution.feedback.contact}</span></div>}
            {selectedContribution.reviewNote && <div className="admin-note-card"><ShieldAlert size={15} /><div><strong>审核备注</strong><p>{selectedContribution.reviewNote}</p></div></div>}
          </div>
          <div className="admin-modal-foot"><span>{selectedContribution.type === 'feedback' ? `留言建议 · ${getContributionStatusLabel(selectedContribution)}` : `投稿中心 · ${selectedContribution.status === 'pending' ? '等待处理' : '已完成处理'}`}</span><div>
            {selectedContribution.type === 'feedback' && selectedContribution.feedback && <>
              {selectedContribution.feedback.status !== 'resolved' && <button type="button" className="secondary-button admin-small-button" disabled={feedbackBusyId === selectedContribution.feedback.id} onClick={() => void handleUpdateFeedback(selectedContribution.feedback!, selectedContribution.feedback?.status === 'read' ? 'resolved' : 'read')}><Check size={13} /> {selectedContribution.feedback.status === 'read' ? '标记已处理' : '标记已查看'}</button>}
              {selectedContribution.feedback.status === 'resolved' && <button type="button" className="admin-link-button admin-danger-link" disabled={deleteBusy} onClick={() => requestDeleteResolvedFeedback(selectedContribution)}><Trash2 size={13} /> 删除留言记录</button>}
            </>}
            {selectedContribution.type === 'resource' && selectedContribution.status === 'pending' && <button type="button" className="secondary-button admin-small-button" onClick={() => selectedContribution.submission && void handleRequestContributionChanges(selectedContribution.submission)}>要求修改</button>}
            <button type="button" className="secondary-button admin-small-button" onClick={() => setSelectedContribution(null)}>关闭</button>
          </div></div>
        </aside>
      </div>}
      {selectedInterviewReview && <InterviewReviewDrawer submission={selectedInterviewReview} onClose={() => setSelectedInterviewReview(null)} onReviewed={() => void handleInterviewReviewComplete()} />}
      <section className="admin-note-card"><ShieldCheck size={16} /><div><strong>处理规则</strong><p>全部投稿显示未处理完的内容；建议标记为已查看后仍保留在待办中，标记已处理后移出。建议分类保留全部留言记录。</p></div></section>
    </div>
  }

  const renderLogs = () => {
    const filteredLogs = auditRows.filter((log) => `${log.actor} ${log.action} ${log.target}`.toLowerCase().includes(logQuery.trim().toLowerCase()))
    const logsPerPage = 8
    const pageCount = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
    const safePage = Math.min(logPage, pageCount)
    const pagedLogs = filteredLogs.slice((safePage - 1) * logsPerPage, safePage * logsPerPage)
    return (
      <section className="admin-card admin-log-card">
        <div className="admin-card-head">
          <div>
            <p className="eyebrow">AUDIT TRAIL</p>
            <h2>操作日志</h2>
          </div>
          <div className="admin-head-actions">
            <>
              <button type="button" className="secondary-button admin-small-button" onClick={() => void exportLogs()}>
                <ArrowUpRight size={15} /> 导出日志
              </button>
              {isRemoteAuditEnabled && <button type="button" className="admin-danger-button admin-small-button" disabled={auditActionBusy || auditLoading || auditLogs.length === 0} onClick={askDeleteAllAuditLogs}>
                <Trash2 size={14} /> 清空操作日志
              </button>}
            </>
          </div>
        </div>
        <div className="admin-log-toolbar">
          <div className="admin-search">
            <Search size={14} />
            <input
              value={logQuery}
              onChange={(event) => { setLogQuery(event.target.value); setLogPage(1) }}
              placeholder="搜索操作者、动作或对象"
              aria-label="搜索操作日志"
            />
          </div>
          <span>{auditLoading ? '加载中…' : `${filteredLogs.length} 条记录`}</span>
        </div>
        {auditError && <div className="admin-inline-error" role="alert">{auditError}</div>}
        {auditLoading ? (
          <div className="admin-empty admin-log-empty">
            <RefreshCw size={20} />
            <strong>正在加载操作日志</strong>
            <span>正在从后端读取日志记录。</span>
          </div>
        ) : pagedLogs.length ? (
          <>
            <div className="admin-log-table has-actions">
              <div className="admin-log-head">
                <span>时间</span><span>操作者</span><span>动作</span><span>对象</span><span>结果</span><span>操作</span>
              </div>
              {pagedLogs.map((log) => (
                <div className="admin-log-row" key={log.id}>
                  <span className="admin-log-time"><time>{log.time}</time></span>
                  <span className="admin-log-user"><Avatar initials={log.actorInitials} size="sm" />{log.actor}</span>
                  <strong>{log.action}</strong>
                  <span>{log.target}</span>
                  <Tag tone={log.result === 'failure' ? 'red' : 'mint'}>{log.result === 'failure' ? '失败' : '成功'}</Tag>
                  <span className="admin-log-actions">
                    <button type="button" className="icon-button small" title="删除操作日志" aria-label="删除操作日志" disabled={auditActionBusy} onClick={() => { const record = auditLogs.find((item) => item.id === log.id); if (record) askDeleteAuditLog(record) }}><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
            {pageCount > 1 && (
              <div className="admin-log-pagination">
                <span>第 {safePage} / {pageCount} 页</span>
                <div>
                  <button type="button" className="secondary-button admin-small-button" disabled={safePage === 1} onClick={() => setLogPage((page) => Math.max(1, page - 1))}>上一页</button>
                  <button type="button" className="secondary-button admin-small-button" disabled={safePage === pageCount} onClick={() => setLogPage((page) => Math.min(pageCount, page + 1))}>下一页</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="admin-empty admin-log-empty">
            <ScrollText size={20} />
            <strong>{auditError ? '日志读取失败' : logQuery.trim() ? '没有匹配的日志' : '还没有操作日志'}</strong>
            <span>{auditError ? '请刷新页面后重试。' : logQuery.trim() ? '换个操作者、动作或对象关键词再试一次。' : '后台关键管理操作会显示在这里。'}</span>
          </div>
        )}
        <div className="admin-log-note">
          <ShieldCheck size={14} />
          <span>{isRemoteAuditEnabled ? '删除后无法恢复；删除操作本身不会新增日志。' : '当前为本地演示模式，日志仅展示浏览器内置的最近活动摘要。'}</span>
        </div>
      </section>
    )
  }

  const renderAdminOverlays = () => <>
     {collectionManager && <AdminContentManagerModal members={data.members} kind={collectionManager} items={collectionManager === '项目库' ? data.projects : collectionManager === '资源库' ? manageableResources : !isLeader ? data.interviews.filter((item) => belongsToUserCohort(item.cohort)) : data.interviews} categories={collectionManager === '项目库' ? data.projectCategories : collectionManager === '资源库' ? data.resourceCategories : data.interviewCategories} onOpenWorkbench={collectionManager === '项目库' && isLeader ? () => { setCollectionManager(null); openWorkbenchManager() } : undefined} onManagePrompts={collectionManager === '资源库' && isLeader ? openPromptManager : undefined} defaults={{ author: user.name, cohort: user.cohort }} onClose={() => setCollectionManager(null)} onManageCategories={isLeader ? () => { setCategoryManagerResource(collectionManager === '项目库' ? 'projects' : collectionManager === '资源库' ? 'resources' : 'interviews'); setCollectionManager(null) } : undefined} onSave={saveCollection} onDelete={(id) => removeCollection(collectionManager, id)} />}
    {workbenchManagerOpen && <AdminWorkbenchSettingsModal initialSettings={data.workbench} announcements={data.announcements} projects={data.projects} resources={data.resources} onClose={() => setWorkbenchManagerOpen(false)} onSave={saveWorkbench} />}
    {categoryManagerResource && <AdminCategoryManagerModal resource={categoryManagerResource} categories={categoryManagerResource === 'projects' ? data.projectCategories : categoryManagerResource === 'resources' ? data.resourceCategories : data.interviewCategories} items={categoryManagerResource === 'projects' ? data.projects : categoryManagerResource === 'resources' ? data.resources : data.interviews} onClose={() => setCategoryManagerResource(null)} onSave={(draft) => saveCategory(categoryManagerResource, draft)} onDelete={(id) => removeCategory(categoryManagerResource, id)} onMove={(id, direction) => moveCategory(categoryManagerResource, id, direction)} />}
    {passwordOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setPasswordOpen(false)}><section className="admin-form-modal admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">SECURITY / PASSWORD</p><h2 id="admin-password-title">修改密码</h2><p>新密码至少 8 位，保存后建议退出其他设备。</p></div><button className="icon-button small" onClick={() => setPasswordOpen(false)} aria-label="关闭密码设置"><X size={16} /></button></div><div className="admin-password-fields"><label><span>当前密码</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="输入当前密码" /></label><label><span>新密码</span><input type={passwordVisible ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少 8 位字符" /></label><label><span>确认新密码</span><input type={passwordVisible ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" /></label></div><div className="admin-modal-foot"><span>会话安全 · 可撤销其他设备</span><div><button className="secondary-button admin-small-button" onClick={() => setPasswordOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={savePassword}>保存密码</button></div></div></section></div>}
    {backgroundOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setBackgroundOpen(false)}><section className="admin-background-modal" role="dialog" aria-modal="true" aria-labelledby="admin-background-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">PERSONAL BACKGROUND</p><h2 id="admin-background-title">设置个人背景</h2><p>只影响当前成员，不会改变其他人的背景。</p></div><button className="icon-button small" onClick={() => setBackgroundOpen(false)} aria-label="关闭背景设置"><X size={16} /></button></div><div className="admin-background-mode"><div><strong>跟随日夜主题</strong><small>{followTheme ? (theme === 'dark' ? '夜间模式 · 静谧星空' : '白天模式 · 校园晨曦') : '已固定个人背景'}</small></div><button className={`admin-switch ${followTheme ? 'on' : ''}`} onClick={() => onBackgroundPreferenceChange(followTheme ? (theme === 'dark' ? 'mist' : 'campus') : 'follow')} aria-pressed={followTheme}><i /></button></div><div className="admin-background-options">{[{ id: 'campus', label: '校园晨曦' }, { id: 'mist', label: '雾蓝留白' }, { id: 'paper', label: '纸张留白' }].map((option) => <button type="button" className={`admin-background-option ${effectiveBackground === option.id ? 'active' : ''} ${option.id}`} key={option.id} onClick={() => { setGlobalBackground(false); onBackgroundPreferenceChange(option.id as BackgroundPreference); onBackgroundImageChange(null) }}><span className="admin-background-preview" /><span><strong>{option.label}</strong></span>{effectiveBackground === option.id && <CheckCircle2 size={16} />}</button>)}</div><div className="admin-upload-box"><span><ImagePlus size={18} /></span><div><strong>{backgroundFileName || '上传个人背景图片'}</strong><small>支持 JPG、PNG 或 WebP，建议使用 16:9 图片</small></div><input id="admin-background-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBackgroundUpload} /><label className="secondary-button admin-small-button" htmlFor="admin-background-upload">选择图片</label></div>{backgroundImage && <div className="admin-upload-preview"><img src={backgroundImage} alt="个人背景预览" /><span>本地预览</span></div>}<div className="admin-modal-foot"><span>当前选择：{followTheme ? '跟随日夜主题' : backgroundPreference === 'custom' ? '自定义图片' : selectedBackground === 'campus' ? '校园晨曦' : selectedBackground === 'mist' ? '雾蓝留白' : '纸张留白'}</span><div><button className="secondary-button admin-small-button" onClick={() => setBackgroundOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={() => void saveBackgroundPreferences()}>保存设置</button></div></div></section></div>}
    {announcementDraft && <AdminAnnouncementModal draft={announcementDraft} scopeOptions={announcementScopeOptions} onChange={setAnnouncementDraft} onClose={() => setAnnouncementDraft(null)} onSave={saveAnnouncement} />}
    {memberDraft && <AdminMemberModal draft={memberDraft} cohortOptions={sortedCohorts.filter((cohort) => isLeader || cohort.year === user.cohort.replace(' 届', '')).map((cohort) => cohort.year)} directionOptions={memberDirectionOptions} onChange={setMemberDraft} onClose={() => setMemberDraft(null)} onSave={saveMember} />}
    {learningRouteOpen && <AdminLearningRouteModal draft={learningRouteId.startsWith('new-route-') ? createLearningRouteDraft([], { id: learningRouteId, direction: '新方向', title: '新方向学习路线', description: '', nodes: [], featuredProjectIds: [] }) : createLearningRouteDraft(data.learningRoutes.find((route) => route.id === learningRouteId)?.nodes ?? data.learningNodes, data.learningRoutes.find((route) => route.id === learningRouteId) ?? data.learningRoute)} routes={data.learningRoutes} projects={data.projects} onClose={() => setLearningRouteOpen(false)} onSave={saveLearningRoute} onDelete={removeLearningRoute} onSelectRoute={openLearningRouteEditor} onNewRoute={openNewLearningRoute} />}
    {contentDraft && <AdminContentModal draft={contentDraft} onChange={setContentDraft} onClose={() => setContentDraft(null)} onSave={saveContent} />}
     {cohortManagerOpen && <AdminCohortManager initialCohortId={cohortManagerInitialId} allowedCohortId={isLeader ? undefined : adminCohorts[0]?.id} onClose={() => { setCohortManagerOpen(false); setCohortManagerInitialId(undefined) }} />}
     {photoManagerOpen && <AdminPhotoManager allowedCohortId={isLeader ? undefined : adminCohorts[0]?.id} onClose={() => setPhotoManagerOpen(false)} />}
    {copyManagerOpen && <AdminCopyManager onClose={() => setCopyManagerOpen(false)} />}
    {promptManagerOpen && <AdminPromptManagerModal items={data.prompts.filter((item) => item.status !== 'archived')} onClose={() => setPromptManagerOpen(false)} onSave={async (id, input) => id ? updatePrompt(id, input) : createPrompt(input)} onDelete={deletePrompt} />}
    {competitionManagerOpen && <AdminCompetitionManager events={data.competitionEvents} onClose={() => setCompetitionManagerOpen(false)} onSave={saveCompetition} onBatchSave={saveCompetitionBatch} onDelete={removeCompetition} />}
    {deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}
    {auditDeleteRequest && <AdminDeleteConfirm request={auditDeleteRequest} busy={auditActionBusy} onCancel={() => { if (!auditActionBusy) setAuditDeleteRequest(null) }} />}
    {toast && <div className="admin-toast"><CheckCircle2 size={15} /> {toast}</div>}
  </>

  const renderSection = () => {
    const section = activeSection === 'overview' ? renderOverview() : activeSection === 'cohorts' ? renderCohorts() : activeSection === 'members' ? renderMembers() : activeSection === 'content' ? renderContent() : activeSection === 'announcements' ? renderAnnouncements() : activeSection === 'contributions' ? renderContributions() : activeSection === 'invites' ? renderInvites() : activeSection === 'personalization' ? renderPersonalization() : activeSection === 'security' ? renderSecurity() : renderLogs()
    return <><div className="admin-section-viewport">{section}</div>{renderAdminOverlays()}</>
  }

  return <div className={`page admin-page admin-bg-${effectiveBackground} ${isContributor ? 'admin-readonly' : ''}`}>
    <div className="admin-layout">
      <aside className="admin-sidebar panel">
        <div className="admin-sidebar-title"><span className="admin-console-mark"><Settings2 size={18} /></span><div><p className="eyebrow">CONTROL ROOM</p><strong>管理后台</strong></div></div>
        <div className="admin-sidebar-scope"><span><ShieldCheck size={13} /> 当前权限</span><strong>{roleLabels[user.role] ?? user.role}</strong><small>{user.name} · {scopeLabel}</small></div>
        <nav className="admin-nav" aria-label="管理后台模块">{adminNavItems.map((item) => { const NavIcon = item.icon; const locked = Boolean(item.leaderOnly && !isLeader); return <button className={activeSection === item.id ? 'active' : ''} key={item.id} onClick={() => selectSection(item)} aria-current={activeSection === item.id ? 'page' : undefined}><span className="admin-nav-icon"><NavIcon size={16} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{locked ? <LockKeyhole size={13} /> : <ChevronRight size={14} />}</button> })}</nav>
        <button className="admin-back-button" onClick={() => onNavigate('#/tools')}><ChevronLeft size={15} /> 返回工作台</button>
      </aside>
      <section className="admin-main">
        <header className="admin-content-head"><div><p className="eyebrow">{meta.eyebrow}</p><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="admin-head-right"><span className={`admin-live-status ${contentLoading || configLoading ? 'syncing' : contentError || configError ? 'offline' : ''}`} title={serviceStatusDetails || serviceStatusLabel} aria-label={`服务状态：${serviceStatusLabel}${serviceStatusDetails ? `。${serviceStatusDetails}` : ''}`}><i /> {serviceStatusLabel}</span><button className="icon-button small" onClick={() => { void Promise.all([refresh(), refreshClubConfig()]); showToast('正在刷新内容快照') }} aria-label="刷新内容"><RefreshCw size={15} /></button><Avatar initials={user.initials} name={user.name} avatarUrl={user.avatarUrl} size="sm" /></div></header>
        <div className="admin-breadcrumb"><span>管理后台</span><ChevronRight size={13} /><strong>{currentNav.label}</strong><span className="admin-breadcrumb-scope">{scopeLabel}</span></div>
        {renderSection()}
      </section>
    </div>
    {profileOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setProfileOpen(false)}><section className="admin-form-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">PROFILE / PUBLIC CARD</p><h2 id="admin-profile-title">编辑头像与简介</h2><p>这些信息会展示在成员卡片、项目协作和操作日志中。</p></div><button className="icon-button small" onClick={() => setProfileOpen(false)} aria-label="关闭资料设置"><X size={16} /></button></div><div className="admin-profile-editor"><div className="admin-avatar-editor"><label className="admin-avatar-upload" htmlFor="admin-avatar-upload">{profileAvatar ? <img src={profileAvatar} alt="头像预览" /> : <Avatar initials={user.initials} name={user.name} avatarUrl={user.avatarUrl} accent="blue" size="lg" />}<span><Camera size={13} /> 更换头像</span></label><input id="admin-avatar-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} /><small>建议使用 1:1 方形图片</small></div><div className="admin-form-fields"><label><span>显示姓名</span><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="输入成员姓名" /></label><label><span>个人简介</span><textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} rows={4} placeholder="介绍你在小组中的方向和职责" /></label></div></div><div className="admin-modal-foot"><span>当前账号：{user.name}</span><div><button className="secondary-button admin-small-button" onClick={() => setProfileOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={() => { void saveProfileChanges() }}>保存资料</button></div></div></section></div>}
  </div>
}
