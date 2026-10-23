import { useLocalDraft } from '../lib/useLocalDraft'
import { LocalDraftNotice } from './LocalDraftNotice'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, FileText, Filter, Heart, MessageCircle, Plus, RefreshCw, Search, Send, ShieldAlert, ShieldCheck, Star, ThumbsUp, Trash2, X } from 'lucide-react'
import { useAuth } from '../services/auth.context'
import { useContent } from '../services/content.context'
import { canViewContent } from '../services/auth.service'
import { favoriteTargetMatches, listFavorites, toggleFavorite } from '../services/favorite.service'
import { createInterviewDraft, deleteMyInterviewSubmission, getInterview, getMyInterviewSubmission, listInterviewPage, listMyInterviewSubmissions, recordInterviewDetailView, reviewInterviewSubmission, submitInterviewDraft, toggleInterviewHelpful, updateInterviewDraft, withdrawMyInterviewSubmission, type InterviewSubmissionInput } from '../services/interview.service'
import type { InterviewExperience, InterviewReviewRecord, InterviewRound, InterviewSubmission, Paginated } from '../types'

type PageView = 'list' | 'detail' | 'submit' | 'mine'

const recruitmentTypes = ['实习', '校招', '社招', '日常招聘']
const pageSize = 12

function dateLabel(value?: string) {
  if (!value) return '时间待补充'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}

function statusLabel(status: InterviewSubmission['status']) {
  if (status === 'draft') return '草稿'
  if (status === 'pending') return '待审核'
  if (status === 'approved') return '已通过'
  if (status === 'changes_requested') return '需要修改'
  if (status === 'withdrawn') return '已撤回'
  return '未通过'
}

function statusTone(status: InterviewSubmission['status']) {
  if (status === 'approved') return 'mint'
  if (status === 'rejected' || status === 'withdrawn') return 'red'
  return 'orange'
}

function reviewActionLabel(record: InterviewReviewRecord) {
  if (record.action === 'approve') return '审核通过'
  if (record.action === 'request_changes') return '要求修改'
  return '退回投稿'
}

function InterviewPageIntro({ title, description, eyebrow, action }: { title: string; description: string; eyebrow: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-intro-action">{action}</div>}</div>
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export function InterviewFavorite({ interview, onChange }: { interview: InterviewExperience; onChange?: (isFavorited: boolean, count?: number) => void }) {
  const { user } = useAuth()
  const userId = user?.id
  const [favorited, setFavorited] = useState(Boolean(interview.isFavorited))
  const [count, setCount] = useState(interview.favoriteCount ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const interactionVersion = useRef(0)

  useEffect(() => {
    setFavorited(Boolean(interview.isFavorited))
    setCount(interview.favoriteCount ?? 0)
  }, [interview.id, interview.isFavorited, interview.favoriteCount])

  useEffect(() => {
    interactionVersion.current = 0
  }, [interview.id, user?.id])

  useEffect(() => {
    if (!userId) { setFavorited(false); return }
    let active = true
    const requestVersion = interactionVersion.current
    void listFavorites(userId).then((favorites) => {
      if (active && requestVersion === interactionVersion.current && interactionVersion.current === 0) {
        setFavorited(favorites.some((item) => favoriteTargetMatches(item, 'interview', interview.id)))
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [interview.id, userId])

  const toggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!user || busy) return
    interactionVersion.current += 1
    const next = !favorited
    setBusy(true)
    setError('')
    try {
      const result = await toggleFavorite('interview', interview.id, next, user.id)
      setFavorited(result.isFavorited)
      const nextCount = typeof result.favoriteCount === 'number' ? result.favoriteCount : Math.max(0, count + (result.isFavorited ? 1 : -1))
      setCount(nextCount)
      onChange?.(result.isFavorited, nextCount)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '收藏操作失败，请稍后重试')
    } finally { setBusy(false) }
  }

  return <button type="button" className={`favorite-control favorite-button ${favorited ? 'active' : ''}`} aria-label={favorited ? '取消收藏面经' : '收藏面经'} aria-pressed={favorited} disabled={busy || !user} title={error || (!user ? '登录后收藏' : favorited ? '取消收藏' : '收藏')} onClick={(event) => void toggle(event)}><Star size={14} fill={favorited ? 'currentColor' : 'none'} /><span>{count}</span></button>
}

function InterviewHelpful({ interview, onChange }: { interview: InterviewExperience; onChange: (count: number, isHelpful: boolean) => void }) {
  const { user } = useAuth()
  const [helpful, setHelpful] = useState(Boolean(interview.isHelpful))
  const [count, setCount] = useState(interview.helpfulCount ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canVote = Boolean(user && user.role !== 'Visitor' && user.status !== 'disabled' && user.status !== 'closed')

  useEffect(() => { setHelpful(Boolean(interview.isHelpful)); setCount(interview.helpfulCount ?? 0) }, [interview.id, interview.isHelpful, interview.helpfulCount])
  const vote = async () => {
    if (!canVote || !user || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await toggleInterviewHelpful(interview.id, user.id)
      setHelpful(result.isHelpful)
      setCount(result.helpfulCount)
      onChange(result.helpfulCount, result.isHelpful)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败，请稍后重试')
    } finally { setBusy(false) }
  }
  return <span className="interview-helpful-control"><button type="button" className={`secondary-button interview-helpful-button ${helpful ? 'active' : ''}`} disabled={!canVote || busy} title={!user ? '登录后可以标记这篇面经有帮助' : !canVote ? '访客账号不能投票' : error || undefined} onClick={() => void vote()}><ThumbsUp size={15} />{helpful ? '有帮助' : '有帮助？'}<span>{count}</span></button>{error && <small role="status">{error}</small>}</span>
}

function InterviewListPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const canContribute = Boolean(user && user.role !== 'Visitor' && user.status !== 'disabled' && user.status !== 'closed')
  const { data: { interviewCategories } } = useContent()
  const [keyword, setKeyword] = useState('')
  const [recruitmentType, setRecruitmentType] = useState('')
  const [category, setCategory] = useState('')
  const [cohort, setCohort] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [sort, setSort] = useState<'latest' | 'helpful' | 'popular'>('latest')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Paginated<InterviewExperience>>({ items: [], page: { page: 1, pageSize, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const techCategories = useMemo(() => interviewCategories.filter((item) => item.enabled && !/实习|校招|社招|日常招聘/.test(`${item.key} ${item.label}`)), [interviewCategories])
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(keyword.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [keyword])
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])
  useEffect(() => setPage(1), [query, recruitmentType, category, cohort, difficulty, sort])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void listInterviewPage({ search: query, recruitmentType, category, cohort: cohort.trim(), difficulty, sort, page, pageSize, ownerId: user?.id, signal: controller.signal })
      .then(setResult)
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '面经列表加载失败') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query, recruitmentType, category, cohort, difficulty, sort, page, user?.id, refreshKey])

  const pageCount = Math.max(1, Math.ceil(result.page.total / pageSize))
  const filtersActive = Boolean(query || recruitmentType || category || cohort || difficulty)
  const secondaryFilterCount = Number(Boolean(recruitmentType)) + Number(Boolean(cohort.trim())) + Number(Boolean(difficulty))
  const visibleItems = useMemo(() => result.items.filter((item) => canViewContent(user, item.visibility)), [result.items, user])
  const clearFilters = () => { setKeyword(''); setRecruitmentType(''); setCategory(''); setCohort(''); setDifficulty('') }

  return <div className="page listing-page interview-page interview-index-page">
    <InterviewPageIntro eyebrow="INTERVIEW WALL / EXPERIENCE INDEX" title="面经墙" description="按招聘类型、技术方向和关键词查找真实面试记录；一轮一轮复盘，让经验可以被接着用。" action={canContribute ? <div className="page-intro-actions"><button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews/my-submissions')}><FileText size={15} /> 我的投稿</button><button type="button" className="primary-button" onClick={() => onNavigate('#/interviews/submit')}><Plus size={15} /> 分享面经</button></div> : user ? <span className="interview-member-only">成员账号可保存草稿并投稿</span> : <button type="button" className="primary-button" onClick={() => onNavigate('#/login')}><Plus size={15} /> 登录后分享面经</button>} />
    <div className="interview-toolbar">
      <div className="interview-toolbar-main">
        <label className="filter-search interview-search"><Search size={16} /><input ref={searchRef} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索公司、岗位、题目或标签" aria-label="搜索面经" /></label>
        <div className="interview-category-groups">
          <div className="interview-category-group" role="group" aria-label="按技术方向筛选">
            <span className="interview-category-label">技术方向</span>
            <div className="filter-pills interview-category-tabs">
              <button type="button" className={'filter-pill ' + (!category ? 'active' : '')} aria-pressed={!category} onClick={() => setCategory('')}>全部</button>
              {techCategories.map((item) => <button type="button" className={'filter-pill ' + (category === item.key ? 'active' : '')} aria-pressed={category === item.key} key={item.id} onClick={() => setCategory(item.key)}>{item.label}</button>)}
            </div>
          </div>
          <div className="interview-category-group" role="group" aria-label="按招聘类型筛选">
            <span className="interview-category-label">招聘类型</span>
            <div className="filter-pills interview-recruitment-tabs">
              <button type="button" className={'filter-pill ' + (!recruitmentType ? 'active' : '')} aria-pressed={!recruitmentType} onClick={() => setRecruitmentType('')}>全部</button>
              {recruitmentTypes.map((type) => <button type="button" className={'filter-pill ' + (recruitmentType === type ? 'active' : '')} aria-pressed={recruitmentType === type} key={type} onClick={() => setRecruitmentType(type)}>{type}</button>)}
            </div>
          </div>
        </div>
        <div className="interview-toolbar-controls">
          <details className={'interview-filter-menu ' + (secondaryFilterCount ? 'has-filters' : '')}>
            <summary aria-label="打开筛选和排序"><Filter size={14} /><span>筛选</span><ChevronDown size={13} />{secondaryFilterCount > 0 && <b>{secondaryFilterCount}</b>}</summary>
            <div className="interview-filter-popover">
              <label className="interview-filter-popover-sort"><span>排序方式</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="latest">最新发布</option><option value="helpful">最有帮助</option><option value="popular">浏览最多</option></select></label>
              <label><span>招聘类型</span><select value={recruitmentType} onChange={(event) => setRecruitmentType(event.target.value)}><option value="">全部类型</option>{recruitmentTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>届次</span><input value={cohort} onChange={(event) => setCohort(event.target.value)} placeholder="例如 2029 届" /></label>
              <label><span>难度</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">全部难度</option><option>简单</option><option>中等</option><option>困难</option></select></label>
              {secondaryFilterCount > 0 && <button type="button" className="text-button" onClick={() => { setRecruitmentType(''); setCohort(''); setDifficulty('') }}>清空筛选</button>}
            </div>
          </details>
        </div>
      </div>
      <div className="interview-list-toolbar"><span>{loading ? '正在检索…' : `找到 ${result.page.total} 条面经`}</span>{filtersActive && <button type="button" className="text-button" onClick={clearFilters}>清空条件</button>}</div>
    </div>
    {error && <div className="interview-state error" role="alert"><ShieldAlert size={18} /><div><strong>面经暂时无法加载</strong><span>{error}</span></div><button type="button" className="secondary-button admin-small-button" onClick={() => setRefreshKey((value) => value + 1)}>重试</button></div>}
    {loading && !result.items.length ? <div className="interview-state"><RefreshCw size={19} className="spin" /><div><strong>正在整理面试记录</strong><span>筛选结果会在这里显示。</span></div></div> : error && !result.items.length ? null : !visibleItems.length ? <div className="empty-state interview-empty"><MessageCircle size={26} /><strong>{filtersActive ? '没有找到符合条件的面经' : '暂时还没有公开面经'}</strong><span>{filtersActive ? '调整关键词或筛选条件，看看其他记录。' : '成员可以提交自己的面试经历，审核通过后会展示在这里。'}</span>{filtersActive && <button type="button" className="secondary-button admin-small-button" onClick={clearFilters}>清空筛选</button>}</div> : <div className="interview-list" aria-live="polite">{visibleItems.map((item) => <article className="interview-card interview-card-expanded" key={item.id}><span className="company-logo" aria-hidden="true">{item.company.trim().slice(0, 1) || '?'}</span><div className="interview-main"><div className="interview-title"><button type="button" className="interview-title-link" onClick={() => onNavigate(`#/interviews/${encodeURIComponent(item.id)}`)}><h3>{item.company} · {item.role}</h3><ArrowUpRight size={14} /></button><Chip tone={item.difficulty === '困难' ? 'red' : item.difficulty === '中等' ? 'orange' : 'mint'}>{item.difficulty}</Chip>{item.recruitmentType && <Chip tone="blue">{item.recruitmentType}</Chip>}</div><p>{item.summary || '作者暂未填写摘要。'}</p><div className="interview-meta"><span><b>{item.anonymous ? '匿名成员' : item.author || '成员投稿'}</b></span><span>{item.cohort}</span><span>{dateLabel(item.date)}</span><span>{item.rounds} 轮</span>{item.category && <Chip>{techCategories.find((value) => value.key === item.category)?.label ?? item.category}</Chip>}{item.tags.slice(0, 4).map((tag) => <Chip key={tag}>{tag}</Chip>)}</div><div className="interview-card-stats"><span><Eye size={13} /> {(item.views ?? 0).toLocaleString()} 浏览</span><span><ThumbsUp size={13} /> {(item.helpfulCount ?? 0).toLocaleString()} 有帮助</span></div></div><InterviewFavorite interview={item} /></article>)}</div>}
    {pageCount > 1 && <div className="library-pagination"><span>第 {page} / {pageCount} 页 · 共 {result.page.total} 条</span><div><button type="button" className="secondary-button admin-small-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={14} /> 上一页</button><button type="button" className="secondary-button admin-small-button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页 <ChevronRight size={14} /></button></div></div>}
  </div>
}

function InterviewDetailPage({ id, onNavigate }: { id: string; onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const [interview, setInterview] = useState<InterviewExperience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void getInterview(id).then(async (item) => {
      if (!active) return
      setInterview(item)
      if (!canViewContent(user, item.visibility)) return
      try {
        const views = await recordInterviewDetailView(id)
        if (active) setInterview((current) => current?.id === id ? { ...current, views } : current)
      } catch { /* The content remains readable if view analytics are unavailable. */ }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '面经暂时无法打开') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, user])

  if (loading) return <div className="page interview-page"><div className="interview-state"><RefreshCw size={19} className="spin" /><div><strong>正在打开面经</strong><span>请稍候。</span></div></div></div>
  if (error || !interview) return <div className="page interview-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / RECORD" title="面经暂不可用" description={error || '这条面经不存在或暂未公开。'} action={<button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews')}><ArrowLeft size={15} /> 返回面经墙</button>} /></div>
  if (!canViewContent(user, interview.visibility)) return <div className="page interview-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / ACCESS" title="当前账号无法查看" description="这条面经仅面向符合可见范围的成员。登录或联系管理员确认权限。" action={<button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews')}><ArrowLeft size={15} /> 返回面经墙</button>} /></div>

  const rounds = interview.roundDetails ?? []
  return <div className="page interview-page interview-detail-page">
    <InterviewPageIntro eyebrow="INTERVIEW WALL / RECORD" title={`${interview.company} · ${interview.role}`} description="从实际流程、问题和复盘中了解这次面试。" action={<div className="page-intro-actions"><button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews')}><ArrowLeft size={15} /> 返回面经墙</button><button type="button" className="secondary-button" onClick={() => void navigator.clipboard?.writeText(window.location.href).catch(() => undefined)}><ArrowUpRight size={15} /> 复制链接</button></div>} />
    <div className="interview-detail-layout"><main className="interview-detail-main">
      <section className="interview-record-summary"><div className="interview-record-summary-head"><div><p className="eyebrow">面试记录</p><div className="interview-record-tags"><Chip tone="blue">{interview.recruitmentType || '招聘类型未标注'}</Chip><Chip>{interview.category || '方向未标注'}</Chip><Chip tone={interview.difficulty === '困难' ? 'red' : interview.difficulty === '中等' ? 'orange' : 'mint'}>{interview.difficulty}</Chip></div><p>{interview.summary}</p></div><InterviewFavorite interview={interview} onChange={(isFavorited, favoriteCount) => setInterview((current) => current ? { ...current, isFavorited, favoriteCount } : current)} /></div><div className="interview-record-metrics"><span>{interview.anonymous ? '匿名成员' : interview.author || '成员投稿'}</span><span>{interview.cohort}</span><span>{dateLabel(interview.date)}</span><span>{interview.rounds} 轮面试</span><span><Eye size={13} /> {(interview.views ?? 0).toLocaleString()}</span></div></section>
      {interview.preparation && <section className="interview-record-section"><div className="interview-section-heading"><span><FileText size={16} /></span><div><h2>面试前准备</h2><small>作者的准备方向与资料</small></div></div><p>{interview.preparation}</p></section>}
      <section className="interview-record-section"><div className="interview-section-heading"><span><MessageCircle size={16} /></span><div><h2>面试流程与问题</h2><small>{rounds.length ? `记录了 ${rounds.length} 轮流程` : `${interview.rounds} 轮面试`}</small></div></div>{rounds.length ? <div className="interview-round-list">{rounds.map((round, roundIndex) => <article className="interview-round" key={`${round.title}-${roundIndex}`}><div className="interview-round-heading"><span>{roundIndex + 1}</span><strong>{round.title || `第 ${roundIndex + 1} 轮`}</strong></div><div className="interview-question-list">{round.questions.map((entry, questionIndex) => <article className="interview-question" key={`${entry.question}-${questionIndex}`}><h3><span>{String(questionIndex + 1).padStart(2, '0')}</span>{entry.question}</h3>{entry.answer && <p>{entry.answer}</p>}</article>)}</div></article>)}</div> : <div className="interview-record-empty"><span>详细问题待作者补充。</span></div>}</section>
      {interview.reflection && <section className="interview-record-section"><div className="interview-section-heading"><span><ShieldCheck size={16} /></span><div><h2>复盘与建议</h2><small>经验总结</small></div></div><p>{interview.reflection}</p></section>}
      <div className="interview-detail-actions"><InterviewHelpful interview={interview} onChange={(helpfulCount, isHelpful) => setInterview((current) => current ? { ...current, helpfulCount, isHelpful } : current)} /><span>觉得这条记录有帮助吗？你的反馈会帮助大家找到更有参考价值的面经。</span></div>
    </main><aside className="interview-detail-aside"><p className="eyebrow">记录信息</p><dl><div><dt>公司与岗位</dt><dd>{interview.company} · {interview.role}</dd></div><div><dt>招聘类型</dt><dd>{interview.recruitmentType || '未标注'}</dd></div><div><dt>技术方向</dt><dd>{interview.category || '未标注'}</dd></div><div><dt>届次</dt><dd>{interview.cohort || '未标注'}</dd></div><div><dt>难度</dt><dd>{interview.difficulty}</dd></div><div><dt>更新时间</dt><dd>{dateLabel(interview.updatedAt || interview.date)}</dd></div></dl><div className="interview-detail-aside-footer"><span><Eye size={14} /> {(interview.views ?? 0).toLocaleString()} 次浏览</span><span><Heart size={14} /> {(interview.favoriteCount ?? 0).toLocaleString()} 次收藏</span></div></aside></div>
  </div>
}

const blankRound = (): InterviewRound => ({ title: '一面', questions: [{ question: '', answer: '' }] })

function emptySubmission(user: NonNullable<ReturnType<typeof useAuth>['user']>): InterviewSubmissionInput {
  return {
    company: '', role: '', cohort: user.cohort, date: new Date().toISOString().slice(0, 10), difficulty: '中等', rounds: 1, tags: [], summary: '', category: '', recruitmentType: '实习', preparation: '', reflection: '', anonymous: false, roundDetails: [blankRound()],
  }
}

function InterviewSubmissionPage({ submissionId, onNavigate }: { submissionId?: string; onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const { data: { interviewCategories } } = useContent()
  const [draft, setDraft] = useState<InterviewSubmissionInput | null>(null)
  const [record, setRecord] = useState<InterviewSubmission | null>(null)
  const [step, setStep] = useState(0)
  const [tagsText, setTagsText] = useState('')
  const [loading, setLoading] = useState(Boolean(submissionId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const enabledCategories = interviewCategories.filter((item) => item.enabled && !/实习|校招|社招|日常招聘/.test(`${item.key} ${item.label}`))

  useEffect(() => {
    let active = true
    if (!user || user.role === 'Visitor' || user.status === 'disabled' || user.status === 'closed') { setDraft(null); setLoading(false); return }
    if (!submissionId) { setDraft(emptySubmission(user)); setRecord(null); setLoading(false); return }
    setLoading(true)
    void getMyInterviewSubmission(submissionId, user.id).then((item) => {
      if (!active) return
      setRecord(item)
      setDraft({
        company: item.company, role: item.role, cohort: item.cohort, date: item.date, difficulty: item.difficulty, rounds: item.rounds, tags: item.tags ?? [], summary: item.summary, category: item.category ?? '', recruitmentType: item.recruitmentType ?? '实习', city: item.city ?? '', preparation: item.preparation ?? '', reflection: item.reflection ?? '', anonymous: item.anonymous ?? false, roundDetails: item.roundDetails?.length ? item.roundDetails : [blankRound()],
      })
      setTagsText((item.tags ?? []).join(', '))
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '投稿内容加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [submissionId, user])

  const patchDraft = (patch: Partial<InterviewSubmissionInput>) => setDraft((current) => current ? { ...current, ...patch } : current)
  const editable = !record || ['draft', 'changes_requested', 'rejected'].includes(record.status)
  const rounds = draft?.roundDetails ?? []
  const localDraft = useLocalDraft({ ownerId: user?.id, scope: `interview:${submissionId ?? 'new'}`, value: { draft, tagsText }, sample: { draft: draft ? { ...draft, roundDetails: [{ title: '', questions: [{ question: '' }] }] } : null, tagsText }, ready: Boolean(draft) && !loading && editable, onRestore: (saved) => { setDraft(saved.draft); setTagsText(saved.tagsText) } })
  const saveDraft = async () => {
    if (!user || !draft) return null
    setSaving(true); setError(''); setNotice('')
    try {
      const input = { ...draft, cohort: draft.cohort || user.cohort, roundDetails: rounds.map((round) => ({ ...round, questions: round.questions.filter((item) => item.question.trim()) })), rounds: Math.max(1, rounds.length), tags: tagsText.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12) }
      const saved = record ? await updateInterviewDraft(record.id, input, user.id, user.name) : await createInterviewDraft(input, user.id, user.name)
      setRecord(saved)
      localDraft.clear()
      setNotice('草稿已保存')
      if (!submissionId) onNavigate(`#/interviews/submit/${encodeURIComponent(saved.id)}`)
      return saved
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '草稿保存失败')
      return null
    } finally { setSaving(false) }
  }
  const next = () => {
    if (!draft) return
    if (step === 0 && (!draft.company.trim() || !draft.role.trim() || !draft.recruitmentType)) { setError('请先填写公司、岗位和招聘类型'); return }
    if (step === 1 && (!rounds.length || rounds.some((round) => !round.questions.some((item) => item.question.trim())))) { setError('请为每一轮至少记录一个面试问题'); return }
    if (step === 2 && !draft.summary.trim()) { setError('请填写面试总结'); return }
    setError(''); setStep((value) => Math.min(3, value + 1))
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step < 3) { next(); return }
    if (!draft || !user) return
    if (!draft.company.trim() || !draft.role.trim() || !draft.summary.trim() || !rounds.length || rounds.some((round) => !round.questions.some((item) => item.question.trim()))) { setStep(!draft.company.trim() || !draft.role.trim() ? 0 : !rounds.length ? 1 : 2); setError('请补全必填内容后提交'); return }
    setSaving(true); setError('')
    try {
      const input = { ...draft, cohort: draft.cohort || user.cohort, roundDetails: rounds.map((round) => ({ ...round, questions: round.questions.filter((item) => item.question.trim()) })), rounds: rounds.length, tags: tagsText.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12) }
      const saved = record ? await updateInterviewDraft(record.id, input, user.id, user.name) : await createInterviewDraft(input, user.id, user.name)
      setRecord(saved)
      await submitInterviewDraft(saved.id, user.id)
      localDraft.clear()
      onNavigate('#/interviews/my-submissions')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试') }
    finally { setSaving(false) }
  }

  if (!user || user.role === 'Visitor' || user.status === 'disabled' || user.status === 'closed') return <div className="page interview-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / SUBMIT" title={user ? '成员账号可分享面经' : '登录后分享面经'} description={user ? '访客暂不能投稿。成员、组员、届次负责人和组长可以保存草稿、查看审核状态并按意见修改。' : '面经由真实成员投稿并经审核后公开，登录后可保存草稿、查看审核状态和按意见修改。'} action={!user ? <button type="button" className="primary-button" onClick={() => onNavigate('#/login')}><Send size={15} /> 登录</button> : <button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews')}><ArrowLeft size={15} /> 返回面经墙</button>} /></div>
  if (loading) return <div className="page interview-page"><div className="interview-state"><RefreshCw size={19} className="spin" /><div><strong>正在加载你的投稿</strong><span>请稍候。</span></div></div></div>
  if (!draft) return <div className="page interview-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / SUBMIT" title="投稿无法编辑" description={error || '请从“我的投稿”进入可编辑的草稿或退回记录。'} action={<button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews/my-submissions')}><ArrowLeft size={15} /> 返回我的投稿</button>} /></div>
  if (!editable) return <div className="page interview-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / SUBMIT" title="投稿正在审核" description="审核中的内容暂时不能修改。管理员处理后，你会在消息中心和我的投稿中收到结果。" action={<button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews/my-submissions')}><ArrowLeft size={15} /> 返回我的投稿</button>} /></div>

  const updateRound = (index: number, nextRound: InterviewRound) => patchDraft({ roundDetails: rounds.map((item, roundIndex) => roundIndex === index ? nextRound : item) })
  const setQuestion = (roundIndex: number, questionIndex: number, patch: Partial<InterviewRound['questions'][number]>) => {
    const round = rounds[roundIndex]
    if (!round) return
    updateRound(roundIndex, { ...round, questions: round.questions.map((item, index) => index === questionIndex ? { ...item, ...patch } : item) })
  }
  const currentStatus = record ? statusLabel(record.status) : '新投稿'

  return <div className="page interview-page interview-submission-page">
    <LocalDraftNotice draft={localDraft} />
    <InterviewPageIntro eyebrow="INTERVIEW WALL / SUBMISSION" title={submissionId ? '修改面经投稿' : '分享一份面经'} description={record ? `当前状态：${currentStatus}。修改后重新提交会再次进入审核。` : '按招聘流程整理记录。草稿可以随时保存，正式提交后会进入审核。'} action={<button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews/my-submissions')}><ArrowLeft size={15} /> 我的投稿</button>} />
    {record?.reviewNote && <div className="interview-review-note"><ShieldAlert size={17} /><div><strong>管理员要求修改</strong><p>{record.reviewNote}</p></div></div>}
    <div className="interview-wizard">
      <nav className="interview-wizard-steps" aria-label="面经投稿步骤">{['基本信息', '面试轮次', '准备与复盘', '预览并提交'].map((label, index) => <button type="button" key={label} className={step === index ? 'active' : step > index ? 'done' : ''} onClick={() => index < step && setStep(index)}><span>{step > index ? <Check size={14} /> : index + 1}</span>{label}</button>)}</nav>
      <form className="interview-wizard-form" onSubmit={(event) => void submit(event)}>
        {step === 0 && <section className="interview-wizard-section"><div className="interview-wizard-heading"><div><p className="eyebrow">RECORD BASICS</p><h2>这次面试的基本信息</h2><p>招聘类型与技术方向分开记录，方便其他人按自己的目标检索。</p></div></div><div className="interview-form-grid"><label><span>公司 <em>必填</em></span><input maxLength={100} value={draft.company} onChange={(event) => patchDraft({ company: event.target.value })} placeholder="例如：某互联网公司" autoFocus /></label><label><span>岗位 <em>必填</em></span><input maxLength={100} value={draft.role} onChange={(event) => patchDraft({ role: event.target.value })} placeholder="例如：后端开发实习生" /></label><label><span>招聘类型 <em>必填</em></span><select value={draft.recruitmentType ?? ''} onChange={(event) => patchDraft({ recruitmentType: event.target.value })}><option value="">请选择</option>{recruitmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>技术方向</span><select value={draft.category ?? ''} onChange={(event) => patchDraft({ category: event.target.value })}><option value="">暂不选择</option>{enabledCategories.map((item) => <option key={item.id} value={item.key}>{item.label}</option>)}</select></label><label><span>届次</span><input maxLength={20} value={draft.cohort} onChange={(event) => patchDraft({ cohort: event.target.value })} placeholder={user.cohort || '例如：2029 届'} /></label><label><span>城市</span><input maxLength={60} value={draft.city ?? ''} onChange={(event) => patchDraft({ city: event.target.value })} placeholder="例如：杭州" /></label><label><span>面试日期</span><input type="date" value={draft.date} onChange={(event) => patchDraft({ date: event.target.value })} /></label><label><span>整体难度</span><select value={draft.difficulty} onChange={(event) => patchDraft({ difficulty: event.target.value as InterviewExperience['difficulty'] })}><option>简单</option><option>中等</option><option>困难</option></select></label></div><label className="interview-anonymous"><input type="checkbox" checked={Boolean(draft.anonymous)} onChange={(event) => patchDraft({ anonymous: event.target.checked })} /><span><strong>匿名展示</strong><small>审核端仍能确认投稿账号，公开页面不会显示你的姓名。</small></span></label></section>}
        {step === 1 && <section className="interview-wizard-section"><div className="interview-wizard-heading interview-wizard-heading-row"><div><p className="eyebrow">INTERVIEW ROUNDS</p><h2>按轮次记录问题</h2><p>每轮可以记录多个问题和回答思路，回答无需逐字复现。</p></div><button type="button" className="secondary-button admin-small-button" onClick={() => patchDraft({ roundDetails: [...rounds, { title: `第 ${rounds.length + 1} 轮`, questions: [{ question: '', answer: '' }] }] })}><Plus size={14} /> 添加一轮</button></div><div className="interview-round-editor">{rounds.map((round, roundIndex) => <article className="interview-round-edit-card" key={`round-${roundIndex}`}><div className="interview-round-edit-head"><span className="interview-round-number">{String(roundIndex + 1).padStart(2, '0')}</span><input aria-label={`第 ${roundIndex + 1} 轮名称`} maxLength={50} value={round.title} onChange={(event) => updateRound(roundIndex, { ...round, title: event.target.value })} />{rounds.length > 1 && <button type="button" className="icon-button small" aria-label={`删除第 ${roundIndex + 1} 轮`} onClick={() => patchDraft({ roundDetails: rounds.filter((_, index) => index !== roundIndex) })}><Trash2 size={14} /></button>}</div><div className="interview-question-editor">{round.questions.map((entry, questionIndex) => <div className="interview-question-edit-row" key={`question-${questionIndex}`}><label><span>问题 {questionIndex + 1}</span><textarea maxLength={2000} rows={2} value={entry.question} onChange={(event) => setQuestion(roundIndex, questionIndex, { question: event.target.value })} placeholder="尽量还原问题重点，不要包含个人敏感信息" /></label><label><span>回答思路 <small>可选</small></span><textarea maxLength={4000} rows={3} value={entry.answer ?? ''} onChange={(event) => setQuestion(roundIndex, questionIndex, { answer: event.target.value })} placeholder="记录思路、关键知识点或自己的复盘" /></label>{round.questions.length > 1 && <button type="button" className="interview-remove-question" onClick={() => updateRound(roundIndex, { ...round, questions: round.questions.filter((_, index) => index !== questionIndex) })}><X size={13} /> 移除此问题</button>}</div>)}<button type="button" className="interview-add-question" onClick={() => updateRound(roundIndex, { ...round, questions: [...round.questions, { question: '', answer: '' }] })}><Plus size={14} /> 添加问题</button></div></article>)}</div></section>}
        {step === 2 && <section className="interview-wizard-section"><div className="interview-wizard-heading"><div><p className="eyebrow">PREPARATION / REFLECTION</p><h2>补充准备和复盘</h2><p>给后来者一些可以行动的建议，不必把面试过程写成逐字稿。</p></div></div><label><span>面试前准备 <small>可选</small></span><textarea maxLength={5000} rows={4} value={draft.preparation ?? ''} onChange={(event) => patchDraft({ preparation: event.target.value })} placeholder="准备过哪些知识点、项目或资料？哪些最有用？" /></label><label><span>整体总结 <em>必填</em></span><textarea maxLength={5000} rows={5} value={draft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} placeholder="概括整体流程、面试侧重点和你最想提醒后来者的内容" /></label><label><span>复盘建议 <small>可选</small></span><textarea maxLength={5000} rows={4} value={draft.reflection ?? ''} onChange={(event) => patchDraft({ reflection: event.target.value })} placeholder="哪些地方可以做得更好？如果重来一次会怎么准备？" /></label><label><span>关键词标签 <small>最多 12 个，以逗号分隔</small></span><input maxLength={300} value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="项目深挖，操作系统，SQL" /></label><p className="interview-privacy-note"><ShieldCheck size={14} />请勿填写面试官个人信息、未公开题库、联系方式或其他隐私内容。</p></section>}
        {step === 3 && <section className="interview-wizard-section interview-preview-section"><div className="interview-wizard-heading"><div><p className="eyebrow">REVIEW BEFORE SUBMIT</p><h2>预览面经</h2><p>提交后会进入审核；只有审核通过的内容才会公开。</p></div></div><article className="interview-preview-card"><div className="interview-preview-title"><div><span>{draft.recruitmentType} · {draft.category || '方向未选择'}</span><h3>{draft.company} · {draft.role}</h3><p>{draft.cohort} · {draft.city || '城市未填写'} · {draft.difficulty} · {rounds.length} 轮</p></div><Chip tone="orange">待审核</Chip></div><p className="interview-preview-summary">{draft.summary || '尚未填写总结'}</p>{rounds.map((round, index) => <section className="interview-preview-round" key={index}><strong>{round.title || `第 ${index + 1} 轮`}</strong>{round.questions.filter((question) => question.question.trim()).map((question, questionIndex) => <div key={questionIndex}><b>{question.question}</b>{question.answer && <p>{question.answer}</p>}</div>)}</section>)}{draft.preparation && <p><strong>面试前准备：</strong>{draft.preparation}</p>}{draft.reflection && <p><strong>复盘建议：</strong>{draft.reflection}</p>}{tagsText && <div className="interview-preview-tags">{tagsText.split(/[,，\n]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => <Chip key={tag}>{tag}</Chip>)}</div>}</article></section>}
        {(error || notice) && <div className={`interview-form-feedback ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}
        <div className="interview-wizard-footer"><div><button type="button" className="text-button" onClick={() => onNavigate('#/interviews')}>取消</button><button type="button" className="secondary-button admin-small-button" disabled={saving} onClick={() => void saveDraft()}><FileText size={14} />{saving ? '保存中…' : '保存草稿'}</button></div><div>{step > 0 && <button type="button" className="secondary-button admin-small-button" disabled={saving} onClick={() => { setError(''); setStep((value) => Math.max(0, value - 1)) }}><ChevronLeft size={14} /> 上一步</button>}{step < 3 ? <button type="button" className="primary-button admin-small-button" onClick={next}>下一步 <ChevronRight size={14} /></button> : <button type="submit" className="primary-button admin-small-button" disabled={saving}>{saving ? '提交中…' : record?.status === 'changes_requested' || record?.status === 'rejected' ? '重新提交审核' : '提交审核'} <Send size={14} /></button>}</div></div>
      </form>
    </div>
  </div>
}

function MyInterviewSubmissionsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<InterviewSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    if (!user || user.role === 'Visitor' || user.status === 'disabled' || user.status === 'closed') { setItems([]); setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    void listMyInterviewSubmissions(user.id).then((value) => { if (active) setItems(value.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '面经投稿暂时无法加载') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, refreshKey])
  const removeDraft = async (item: InterviewSubmission) => {
    setBusyId(item.id)
    try { await deleteMyInterviewSubmission(item.id, user!.id); setItems((value) => value.filter((current) => current.id !== item.id)); setDeleteId(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '草稿删除失败') }
    finally { setBusyId(null) }
  }
  const withdrawSubmission = async (item: InterviewSubmission) => {
    setBusyId(item.id)
    try {
      const updated = await withdrawMyInterviewSubmission(item.id, user!.id)
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setWithdrawId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤回失败，请稍后重试')
    } finally { setBusyId(null) }
  }

  if (!user || user.role === 'Visitor' || user.status === 'disabled' || user.status === 'closed') return <div className="page interview-page"><InterviewPageIntro eyebrow="MY INTERVIEW SUBMISSIONS" title={user ? '成员账号可查看投稿' : '登录后查看投稿'} description={user ? '访客账号没有面经投稿记录权限，请使用成员账号登录。' : '面经投稿、审核状态和修改意见都绑定在你的账号下。'} action={!user ? <button type="button" className="primary-button" onClick={() => onNavigate('#/login')}>登录</button> : <button type="button" className="secondary-button" onClick={() => onNavigate('#/interviews')}>返回面经墙</button>} /></div>
  return <div className="page interview-page interview-my-page"><InterviewPageIntro eyebrow="INTERVIEW WALL / MY SUBMISSIONS" title="我的面经投稿" description="草稿可继续编辑；被要求修改或退回的记录可以查看意见并重新提交。" action={<div className="page-intro-actions"><button type="button" className="secondary-button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : undefined} /> 刷新</button><button type="button" className="primary-button" onClick={() => onNavigate('#/interviews/submit')}><Plus size={14} /> 分享面经</button></div>} />
    {error && <div className="interview-form-feedback error" role="alert">{error}</div>}
    {loading ? <div className="interview-state"><RefreshCw size={19} className="spin" /><div><strong>正在同步投稿</strong><span>正在读取你的面经记录。</span></div></div> : items.length ? <div className="interview-submission-list">{items.map((item) => <article className="interview-submission-row" key={item.id}><div className="interview-submission-body"><div className="interview-submission-title"><strong>{item.company || '未命名公司'} · {item.role || '未命名岗位'}</strong><Chip tone={statusTone(item.status)}>{statusLabel(item.status)}</Chip></div><p>{item.summary || '草稿尚未填写总结。'}</p><small>{item.recruitmentType || '招聘类型未填写'} · {item.category || '方向未选择'} · 更新于 {dateLabel(item.updatedAt || item.submittedAt)}</small>{item.reviewNote && <div className="interview-submission-review-note"><ShieldAlert size={14} /><span>{item.reviewNote}</span></div>}{item.reviewHistory?.length ? <div className="interview-submission-history"><strong>审核记录</strong>{item.reviewHistory.slice(-3).map((entry) => <small key={entry.id}>{reviewActionLabel(entry)} · {entry.reviewerName} · {dateLabel(entry.createdAt)}{entry.note ? ` · ${entry.note}` : ''}</small>)}</div> : null}</div><div className="interview-submission-actions">{['draft', 'changes_requested', 'rejected'].includes(item.status) && <button type="button" className="secondary-button admin-small-button" onClick={() => onNavigate(`#/interviews/submit/${encodeURIComponent(item.id)}`)}>{item.status === 'draft' ? '继续编辑' : '修改并重提'}</button>}{item.status === 'pending' && (withdrawId === item.id ? <span className="interview-delete-confirm"><small>撤回待审核投稿？</small><button type="button" className="text-button" disabled={busyId === item.id} onClick={() => setWithdrawId(null)}>取消</button><button type="button" className="text-button danger" disabled={busyId === item.id} onClick={() => void withdrawSubmission(item)}>{busyId === item.id ? '撤回中…' : '确认'}</button></span> : <button type="button" className="text-button danger" onClick={() => setWithdrawId(item.id)}>撤回投稿</button>)}{item.status === 'draft' && (deleteId === item.id ? <span className="interview-delete-confirm"><small>删除草稿？</small><button type="button" className="text-button" disabled={busyId === item.id} onClick={() => setDeleteId(null)}>取消</button><button type="button" className="text-button danger" disabled={busyId === item.id} onClick={() => void removeDraft(item)}>{busyId === item.id ? '删除中…' : '确认'}</button></span> : <button type="button" className="icon-button small" aria-label="删除草稿" onClick={() => setDeleteId(item.id)}><Trash2 size={14} /></button>)}</div></article>)}</div> : <div className="empty-state interview-empty"><FileText size={24} /><strong>还没有面经投稿</strong><span>保存草稿或提交审核后，记录会出现在这里。</span><button type="button" className="primary-button admin-small-button" onClick={() => onNavigate('#/interviews/submit')}><Plus size={14} /> 分享第一份面经</button></div>}
  </div>
}

export function InterviewPage({ view, id, onNavigate }: { view: PageView; id?: string; onNavigate: (path: string) => void }) {
  if (view === 'detail') return <InterviewDetailPage id={id ?? ''} onNavigate={onNavigate} />
  if (view === 'submit') return <InterviewSubmissionPage key={id ?? 'new'} submissionId={id} onNavigate={onNavigate} />
  if (view === 'mine') return <MyInterviewSubmissionsPage onNavigate={onNavigate} />
  return <InterviewListPage onNavigate={onNavigate} />
}

export function InterviewSubmissionRows({ onEdit }: { onEdit: (id: string) => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<InterviewSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!user || user.role === 'Visitor' || user.status === 'disabled' || user.status === 'closed') { setItems([]); setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    void listMyInterviewSubmissions(user.id).then((value) => { if (active) setItems(value) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '面经投稿暂时无法加载') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])
  if (loading) return <div className="interview-account-state"><RefreshCw size={15} className="spin" /> 正在加载面经投稿</div>
  if (error) return <div className="interview-account-state error">{error}</div>
  if (!items.length) return <div className="interview-account-state">{user?.role === 'Visitor' ? '访客账号暂不能投稿。' : '还没有面经投稿。'}</div>
  return <div className="interview-account-submissions">{items.map((item) => <article className="interview-account-submission" key={item.id}><div><div className="interview-submission-title"><strong>{item.company || '未命名公司'} · {item.role || '未命名岗位'}</strong><Chip tone={statusTone(item.status)}>{statusLabel(item.status)}</Chip></div><small>{item.recruitmentType || '招聘类型未填写'} · {item.category || '方向未选择'} · {dateLabel(item.submittedAt)}</small>{item.reviewNote && <p>{item.reviewNote}</p>}</div>{['draft', 'changes_requested', 'rejected'].includes(item.status) && <button type="button" className="admin-link-button" onClick={() => onEdit(item.id)}>继续处理 <ArrowRight size={13} /></button>}</article>)}</div>
}

export function InterviewReviewDrawer({ submission, onClose, onReviewed }: { submission: InterviewSubmission; onClose: () => void; onReviewed: () => void }) {
  const [note, setNote] = useState(submission.reviewNote ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const review = async (action: 'approve' | 'reject' | 'request_changes') => {
    if (action !== 'approve' && !note.trim()) { setError('请填写退回或要求修改的原因'); return }
    setBusy(true); setError('')
    try {
      await reviewInterviewSubmission(submission.id, action, note)
      onReviewed()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '面经审核操作失败') }
    finally { setBusy(false) }
  }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><aside className="admin-contribution-drawer interview-review-drawer" role="dialog" aria-modal="true" aria-labelledby="interview-review-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">INTERVIEW REVIEW</p><h2 id="interview-review-title">{submission.company} · {submission.role}</h2><p>{submission.recruitmentType || '招聘类型未标注'} · {submission.category || '方向未标注'} · {submission.cohort}</p></div><button type="button" className="icon-button small" onClick={onClose} aria-label="关闭面经审核详情"><X size={16} /></button></div><div className="interview-review-content"><div className="interview-review-meta"><Chip tone={statusTone(submission.status)}>{statusLabel(submission.status)}</Chip><span>{submission.anonymous ? '匿名展示' : submission.author}</span><span>{submission.city || '城市未标注'}</span><span>{submission.difficulty}</span><span>{submission.rounds} 轮</span><span>{dateLabel(submission.date)}</span></div><section><h3>面试总结</h3><p>{submission.summary || '投稿人尚未填写总结。'}</p></section>{submission.preparation && <section><h3>面试前准备</h3><p>{submission.preparation}</p></section>}{submission.roundDetails?.map((round, index) => <section className="interview-review-round" key={index}><h3>{round.title || `第 ${index + 1} 轮`}</h3>{round.questions.map((item, questionIndex) => <div key={questionIndex}><strong>{questionIndex + 1}. {item.question}</strong><p>{item.answer || '未填写回答思路'}</p></div>)}</section>)}{submission.reflection && <section><h3>复盘建议</h3><p>{submission.reflection}</p></section>}{submission.tags.length > 0 && <section><h3>关键词</h3><div className="interview-preview-tags">{submission.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div></section>}{submission.reviewHistory?.length ? <section><h3>审核记录</h3>{submission.reviewHistory.slice(-5).reverse().map((entry) => <div className="interview-review-history-row" key={entry.id}><strong>{reviewActionLabel(entry)} · {entry.reviewerName}</strong><small>{dateLabel(entry.createdAt)}{entry.note ? ` · ${entry.note}` : ''}</small></div>)}</section> : null}<section><h3>本次审核意见</h3><textarea maxLength={1000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="通过时可选填写；退回或要求修改时请说明原因" /></section>{error && <div className="admin-inline-error" role="alert">{error}</div>}</div><div className="admin-modal-foot"><span>{submission.submitterName || submission.submitterId} · {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('zh-CN') : '提交时间未知'}</span><div>{submission.status === 'pending' && <><button type="button" className="secondary-button admin-small-button" disabled={busy} onClick={() => void review('request_changes')}>要求修改</button><button type="button" className="admin-link-button admin-danger-link" disabled={busy} onClick={() => void review('reject')}><ShieldAlert size={13} /> 退回</button><button type="button" className="primary-button admin-small-button" disabled={busy} onClick={() => void review('approve')}><Check size={13} /> 通过</button></>}{submission.status !== 'pending' && <button type="button" className="secondary-button admin-small-button" onClick={onClose}>关闭</button>}</div></div></aside></div>
}
