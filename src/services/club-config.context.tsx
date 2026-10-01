import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isRemoteClubConfigEnabled, fetchClubConfig, createCohort as apiCreateCohort, updateCohort as apiUpdateCohort, deleteCohort as apiDeleteCohort, createTeam as apiCreateTeam, updateTeam as apiUpdateTeam, deleteTeam as apiDeleteTeam, createPhoto as apiCreatePhoto, updatePhoto as apiUpdatePhoto, setPhotoCover as apiSetPhotoCover, deletePhoto as apiDeletePhoto, updateSiteCopy as apiUpdateSiteCopy } from './club-config.service'

export type CohortStatus = 'active' | 'archived' | 'draft'
export type CohortMemberRole = '组长' | '负责人' | '组员'

export interface CohortMemberRecord {
  id: string
  name: string
  role: CohortMemberRole
  direction: string
  initials: string
  accent: string
}

export interface CohortTeamRecord {
  id: string
  name: string
  description: string
  accent: string
  members: CohortMemberRecord[]
  memberCapacity?: number | null
}

export interface CohortRecord {
  id: string
  year: string
  generationLabel: string
  status: CohortStatus
  description: string
  teams: CohortTeamRecord[]
  createdAt: string
  updatedAt: string
}

export interface CohortPhoto {
  id: string
  cohortId: string
  dataUrl: string
  name: string
  caption: string
  createdAt: string
  isCover: boolean
}

export interface SiteCopyRecord {
  id: string
  label: string
  title: string
  body: string
  author?: string | null
  updatedAt: string
}

export interface ClubConfigState {
  cohorts: CohortRecord[]
  photos: CohortPhoto[]
  siteCopy: SiteCopyRecord[]
}

interface ClubConfigContextValue extends ClubConfigState {
  sortedCohorts: CohortRecord[]
  currentCohort: CohortRecord | undefined
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  saveCohort: (input: Partial<CohortRecord> & Pick<CohortRecord, 'year'>) => Promise<CohortRecord>
  removeCohort: (id: string) => Promise<void>
  saveTeam: (cohortId: string, input: Partial<CohortTeamRecord> & Pick<CohortTeamRecord, 'name'>) => Promise<CohortTeamRecord | undefined>
  removeTeam: (cohortId: string, teamId: string) => Promise<void>
  savePhoto: (photo: CohortPhoto) => Promise<void>
  setPhotoCover: (id: string) => Promise<void>
  removePhoto: (id: string) => Promise<void>
  updateSiteCopy: (id: string, patch: Partial<SiteCopyRecord>) => Promise<void>
  resetConfig: () => void
}

const STORAGE_KEY = 'club-club-config-v1'
const now = () => new Date().toISOString()
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const defaultTeams2029: CohortTeamRecord[] = [
  { id: 'algorithm', name: '算法组', memberCapacity: 6, description: '用算法、模型与实验，把问题拆成可验证的答案。', accent: 'violet', members: [
    { id: 'algorithm-lead', name: '算法组长', role: '组长', direction: '方向规划 · 代码评审', initials: '组长', accent: 'violet' },
    { id: 'algorithm-owner', name: '算法负责人', role: '负责人', direction: '模型实验 · 资料沉淀', initials: '负责', accent: 'blue' },
    { id: 'algorithm-member-1', name: '算法组员 01', role: '组员', direction: 'Python · 机器学习', initials: '01', accent: 'mint' },
    { id: 'algorithm-member-2', name: '算法组员 02', role: '组员', direction: '数据分析 · 评测', initials: '02', accent: 'orange' },
    { id: 'algorithm-member-3', name: '算法组员 03', role: '组员', direction: '深度学习 · 复现', initials: '03', accent: 'rose' },
    { id: 'algorithm-member-4', name: '算法组员 04', role: '组员', direction: 'Agent · Prompt', initials: '04', accent: 'blue' },
  ] },
  { id: 'project', name: '项目组', memberCapacity: 7, description: '把想法推到真实场景，负责协作、交付和持续迭代。', accent: 'blue', members: [
    { id: 'project-lead', name: '项目组长', role: '组长', direction: '项目规划 · 协作推进', initials: '组长', accent: 'blue' },
    { id: 'project-owner', name: '项目负责人', role: '负责人', direction: '需求拆解 · 发布管理', initials: '负责', accent: 'mint' },
    { id: 'project-member-1', name: '项目组员 01', role: '组员', direction: '前端工程 · 交互', initials: '01', accent: 'violet' },
    { id: 'project-member-2', name: '项目组员 02', role: '组员', direction: '后端服务 · API', initials: '02', accent: 'orange' },
    { id: 'project-member-3', name: '项目组员 03', role: '组员', direction: '测试 · 文档', initials: '03', accent: 'rose' },
    { id: 'project-member-4', name: '项目组员 04', role: '组员', direction: '部署 · 运维', initials: '04', accent: 'blue' },
    { id: 'project-member-5', name: '项目组员 05', role: '组员', direction: '视觉 · 内容', initials: '05', accent: 'mint' },
  ] },
  { id: 'cybersecurity', name: '网安组', memberCapacity: 2, description: '关注安全研究、攻防实践与系统风险防护。', accent: 'rose', members: [
    { id: 'cybersecurity-lead', name: '网安组长', role: '组长', direction: '安全研究 · 方向规划', initials: '组长', accent: 'rose' },
    { id: 'cybersecurity-owner', name: '网安负责人', role: '负责人', direction: '攻防实践 · 风险防护', initials: '负责', accent: 'orange' },
  ] },
]

/* Every cohort always has the three core directions. Only 2029 carries
   sample members; other cohorts start with real-member slots empty. */
// New cohorts start with the three required directions but no pre-filled
// capacity. Capacity is an administrator-owned setting entered in the team
// editor, not sample data copied from the current cohort.
const defaultTeamTemplates: CohortTeamRecord[] = defaultTeams2029.map(({ members: _members, memberCapacity: _memberCapacity, ...team }) => ({ ...team, members: [] }))
const requiredTeamIds = new Set(defaultTeamTemplates.map((team) => team.id))

const normalizeTeamName = (name: string) => name.replace(/[\s·_-]/g, '').toLowerCase()
const coreTeamIdByName = new Map(defaultTeamTemplates.map((team) => [normalizeTeamName(team.name), team.id]))

/** Core teams may arrive from the backend with database IDs instead of the
 * frontend template IDs. Treat their canonical names as the same team so a
 * newly-created cohort is not rendered twice. */
export function isCoreTeam(team: Pick<CohortTeamRecord, 'id' | 'name'>) {
  return requiredTeamIds.has(team.id) || coreTeamIdByName.has(normalizeTeamName(team.name))
}

function teamIdentity(team: Pick<CohortTeamRecord, 'id' | 'name'>) {
  return coreTeamIdByName.get(normalizeTeamName(team.name)) ?? team.id
}

function dedupeTeams(teams: CohortTeamRecord[]) {
  const seen = new Set<string>()
  return teams.filter((team) => {
    const identity = teamIdentity(team)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

const withDefaultTeams = (cohort: CohortRecord): CohortRecord => {
  const existingTeams = dedupeTeams(Array.isArray(cohort.teams) ? cohort.teams : [])
  const missingTeams = defaultTeamTemplates.filter((template) => !existingTeams.some((team) => teamIdentity(team) === teamIdentity(template))).map(clone)
  return { ...cohort, teams: [...existingTeams, ...missingTeams] }
}

function emptyConfig(): ClubConfigState {
  return { cohorts: [], photos: [], siteCopy: [] }
}

const createDefaults = (): ClubConfigState => {
  const timestamp = now()
  return {
    cohorts: ['2026', '2027', '2028', '2029'].map((year) => ({
      id: `cohort-${year}`, year, generationLabel: year === '2029' ? '第四代 · 共学进行中' : `${Number(year) - 2025} 代 · 已归档`, status: year === '2029' ? 'active' : 'archived', description: year === '2029' ? '这一届的成员资料和合影正在由管理员整理。' : '历届成员留下的项目与经验记录。', teams: year === '2029' ? clone(defaultTeams2029) : clone(defaultTeamTemplates), createdAt: timestamp, updatedAt: timestamp,
    })),
    photos: [],
    siteCopy: [
      { id: 'purpose', label: '首页 · 我们的目的', title: '我们的目的，只为', body: '让想法传承，让成果延续。', updatedAt: timestamp },
      { id: 'quote', label: '工具页 · 名言警句', title: '代码是写给人看的，附带能在机器上运行。', body: '', author: 'Harold Abelson', updatedAt: timestamp },
      { id: 'letter', label: '小组风采 · 传承寄语', title: '把这一届的经验，留给下一届。', body: '你不需要在大一就知道自己最终会去哪里，先和身边的人一起把一个项目做完。', author: '传承寄语 · 计算机科技小组', updatedAt: timestamp },
      { id: 'direction', label: '工具页 · 小组方向', title: '小组方向', body: '算法、项目与网安，围绕真实问题协作。', updatedAt: timestamp },
    ],
  }
}

function readConfig(): ClubConfigState {
  const defaults = createDefaults()
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<ClubConfigState>
    const cohorts = Array.isArray(parsed.cohorts) && parsed.cohorts.length ? parsed.cohorts : defaults.cohorts
    const storedCopy = Array.isArray(parsed.siteCopy) ? parsed.siteCopy : []
    const hasBrokenCopy = storedCopy.some((item) => typeof item?.title === 'string' && item.title.includes('?'))
    const stored2029 = cohorts.find((item) => item.year === '2029')
    const hasBrokenTeams = stored2029?.teams?.some((team) => team.name.includes('?'))
    const normalizedCohorts = cohorts.map((item) => withDefaultTeams(item))
    return { cohorts: hasBrokenTeams ? normalizedCohorts.map((item) => item.year === '2029' ? { ...item, teams: clone(defaultTeams2029) } : item) : normalizedCohorts, photos: Array.isArray(parsed.photos) ? parsed.photos : [], siteCopy: !hasBrokenCopy && storedCopy.length ? storedCopy : defaults.siteCopy }
  } catch { return defaults }
}

const ClubConfigContext = createContext<ClubConfigContextValue | null>(null)

export function ClubConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClubConfigState>(() => isRemoteClubConfigEnabled ? emptyConfig() : readConfig())
  const [loading, setLoading] = useState(isRemoteClubConfigEnabled)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (isRemoteClubConfigEnabled) return
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* file:// and private modes may disable storage */ }
  }, [state])
  const refresh = useCallback(async () => {
    if (!isRemoteClubConfigEnabled) return
    setLoading(true)
    setError(null)
    try {
      const remoteState = await fetchClubConfig()
      setState({ ...remoteState, cohorts: remoteState.cohorts.map(withDefaultTeams) })
    } catch (reason) {
      setState(emptyConfig())
      setError(`组织配置暂时无法加载：${reason instanceof Error ? reason.message : '请检查后端接口'}。当前不会显示演示数据。`)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const sortedCohorts = useMemo(() => [...state.cohorts].sort((a, b) => Number(b.year) - Number(a.year)), [state.cohorts])
  const currentCohort = sortedCohorts.find((cohort) => cohort.status === 'active') ?? sortedCohorts[0]

  const saveCohort = useCallback(async (input: Partial<CohortRecord> & Pick<CohortRecord, 'year'>) => {
    if (isRemoteClubConfigEnabled) {
      const previous = state.cohorts.find((cohort) => cohort.id === input.id)
      const isNew = !input.id
      const result = input.id ? await apiUpdateCohort(input.id, input) : await apiCreateCohort(input)
      const returnedTeams = Array.isArray(result.teams) ? result.teams : []
      const existingTeams = dedupeTeams(returnedTeams.length ? returnedTeams : previous?.teams ?? [])
      // Some backend deployments create the three core teams during cohort
      // creation and apply their own sample capacities. A new cohort must
      // start with member counts unset, so clear those server defaults once.
      const newCohortTeams = isNew && existingTeams.some((team) => team.memberCapacity != null)
        ? await Promise.all(existingTeams.map((team) => team.memberCapacity == null ? Promise.resolve(team) : apiUpdateTeam(result.id, team.id, { memberCapacity: null })))
        : existingTeams
      const missingDefaultTeams = isNew
        ? defaultTeamTemplates.filter((team) => !newCohortTeams.some((currentTeam) => teamIdentity(currentTeam) === teamIdentity(team)))
        : []
      const createdDefaultTeams = missingDefaultTeams.length
        ? await Promise.all(missingDefaultTeams.map((team) => apiCreateTeam(result.id, team)))
        : []
      const normalized = withDefaultTeams({ ...result, teams: [...newCohortTeams, ...createdDefaultTeams] })
      setState((current) => ({ ...current, cohorts: current.cohorts.some((cohort) => cohort.id === normalized.id) ? current.cohorts.map((cohort) => cohort.id === normalized.id ? normalized : cohort) : [...current.cohorts, normalized] }))
      return normalized
    }
    const timestamp = now(); let result!: CohortRecord
    setState((current) => {
      const existing = current.cohorts.find((cohort) => cohort.id === input.id || cohort.year === input.year)
      result = withDefaultTeams({ id: existing?.id ?? input.id ?? `cohort-${input.year}`, year: input.year, generationLabel: input.generationLabel ?? existing?.generationLabel ?? `${input.year} 届`, status: input.status ?? existing?.status ?? 'draft', description: input.description ?? existing?.description ?? '', teams: input.teams ?? existing?.teams ?? [], createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp })
      return { ...current, cohorts: existing ? current.cohorts.map((cohort) => cohort.id === existing.id ? result : cohort) : [...current.cohorts, result] }
    }); return result
  }, [state.cohorts])
  const removeCohort = useCallback(async (id: string) => {
    if (isRemoteClubConfigEnabled) await apiDeleteCohort(id)
    setState((current) => ({ ...current, cohorts: current.cohorts.filter((cohort) => cohort.id !== id), photos: current.photos.filter((photo) => photo.cohortId !== id) }))
  }, [])
  const saveTeam = useCallback(async (cohortId: string, input: Partial<CohortTeamRecord> & Pick<CohortTeamRecord, 'name'>) => {
    const cohort = state.cohorts.find((item) => item.id === cohortId)
    const existing = cohort?.teams.find((team) => team.id === input.id)
    if (isRemoteClubConfigEnabled) {
      const result = input.id ? await apiUpdateTeam(cohortId, input.id, input) : await apiCreateTeam(cohortId, input)
      setState((current) => ({ ...current, cohorts: current.cohorts.map((item) => item.id === cohortId ? { ...item, teams: item.teams.some((team) => team.id === result.id) ? item.teams.map((team) => team.id === result.id ? result : team) : [...item.teams, result], updatedAt: now() } : item) }))
      return result
    }
    let result: CohortTeamRecord | undefined
    setState((current) => { const currentCohort = current.cohorts.find((item) => item.id === cohortId); if (!currentCohort) return current; const hasCapacityPatch = Object.prototype.hasOwnProperty.call(input, 'memberCapacity'); result = { id: existing?.id ?? input.id ?? `${cohortId}-team-${Date.now()}`, name: input.name, description: input.description ?? existing?.description ?? '', accent: input.accent ?? existing?.accent ?? 'blue', members: input.members ?? existing?.members ?? [], memberCapacity: hasCapacityPatch ? input.memberCapacity : existing?.memberCapacity }; return { ...current, cohorts: current.cohorts.map((item) => item.id === cohortId ? { ...item, teams: existing ? item.teams.map((team) => team.id === existing.id ? result! : team) : [...item.teams, result!], updatedAt: now() } : item) } }); return result
  }, [state.cohorts])
  const removeTeam = useCallback(async (cohortId: string, teamId: string) => {
    const target = state.cohorts.find((cohort) => cohort.id === cohortId)?.teams.find((team) => team.id === teamId)
    if (target ? isCoreTeam(target) : requiredTeamIds.has(teamId)) return
    if (isRemoteClubConfigEnabled) await apiDeleteTeam(cohortId, teamId)
    setState((current) => ({ ...current, cohorts: current.cohorts.map((cohort) => cohort.id === cohortId ? { ...cohort, teams: cohort.teams.filter((team) => team.id !== teamId), updatedAt: now() } : cohort) }))
  }, [state.cohorts])
  const savePhoto = useCallback(async (photo: CohortPhoto) => {
    if (isRemoteClubConfigEnabled) {
      const exists = state.photos.some((item) => item.id === photo.id)
      const result = exists ? await apiUpdatePhoto(photo.id, photo) : await apiCreatePhoto(photo)
      setState((current) => ({ ...current, photos: [...current.photos.filter((item) => item.id !== result.id), result].map((item) => item.cohortId === result.cohortId && result.isCover ? { ...item, isCover: item.id === result.id } : item) }))
      return
    }
    setState((current) => ({ ...current, photos: [...current.photos.filter((item) => item.id !== photo.id), photo].map((item) => item.cohortId === photo.cohortId && photo.isCover ? { ...item, isCover: item.id === photo.id } : item) }))
  }, [state.photos])
  const setPhotoCover = useCallback(async (id: string) => {
    const target = state.photos.find((photo) => photo.id === id)
    if (!target) throw new Error('照片不存在或已被删除')
    if (isRemoteClubConfigEnabled) await apiSetPhotoCover(id)
    setState((current) => ({ ...current, photos: current.photos.map((photo) => photo.cohortId === target.cohortId ? { ...photo, isCover: photo.id === id } : photo) }))
  }, [state.photos])
  const removePhoto = useCallback(async (id: string) => {
    if (isRemoteClubConfigEnabled) await apiDeletePhoto(id)
    setState((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== id) }))
  }, [])
  const updateSiteCopy = useCallback(async (id: string, patch: Partial<SiteCopyRecord>) => {
    if (isRemoteClubConfigEnabled) {
      const result = await apiUpdateSiteCopy(id, patch)
      setState((current) => ({ ...current, siteCopy: current.siteCopy.map((item) => item.id === id ? result : item) }))
      return
    }
    setState((current) => ({ ...current, siteCopy: current.siteCopy.map((item) => item.id === id ? { ...item, ...patch, updatedAt: now() } : item) }))
  }, [])
  const resetConfig = useCallback(() => setState(createDefaults()), [])
  const value = useMemo(() => ({ ...state, sortedCohorts, currentCohort, loading, error, refresh, saveCohort, removeCohort, saveTeam, removeTeam, savePhoto, setPhotoCover, removePhoto, updateSiteCopy, resetConfig }), [state, sortedCohorts, currentCohort, loading, error, refresh, saveCohort, removeCohort, saveTeam, removeTeam, savePhoto, setPhotoCover, removePhoto, updateSiteCopy, resetConfig])
  return <ClubConfigContext.Provider value={value}>{children}</ClubConfigContext.Provider>
}

export function useClubConfig() {
  const value = useContext(ClubConfigContext)
  if (!value) throw new Error('useClubConfig 必须在 ClubConfigProvider 内使用')
  return value
}
