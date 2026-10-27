import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { registerDraftGuard } from './draft-navigation'
import { requestAppConfirmation } from '../components/AppConfirmation'

const MAX_AGE = 30 * 24 * 60 * 60 * 1000

// Only restore data matching the form's structure, including nested rounds/questions.
function compatible(value: unknown, sample: unknown): boolean {
  if (sample === null) return value === null
  if (Array.isArray(sample))
    return Array.isArray(value) && value.every((item) => (sample.length ? compatible(item, sample[0]) : typeof item === 'string'))
  if (typeof sample === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    return Object.entries(sample).every(([key, field]) => compatible((value as Record<string, unknown>)[key], field))
  }
  return typeof value === typeof sample
}

type Candidate<T> = { value: T; savedAt: number }
type Session<T> = { key: string; baseline: string; candidate: Candidate<T> | null }

export function useLocalDraft<T>({
  ownerId,
  scope,
  value,
  onRestore,
  ready = true,
  sample = value,
}: {
  ownerId?: string
  scope: string
  value: T
  onRestore: (value: T) => void
  ready?: boolean
  sample?: T
}) {
  const key = ownerId && ready ? `club-draft:v1:${encodeURIComponent(ownerId)}:${scope}` : ''
  const serialized = JSON.stringify(value)
  const [session, setSession] = useState<Session<T> | null>(null)
  const [status, setStatus] = useState('')
  const baseline = useRef('')
  const latest = useRef({ key: '', serialized: '', dirty: false, pending: false })

  useLayoutEffect(() => {
    flush()
    if (!key) {
      setSession(null)
      return
    }
    let candidate: Candidate<T> | null = null
    let message = ''
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const stored = JSON.parse(raw) as Candidate<unknown>
        if (
          typeof stored.savedAt === 'number' &&
          stored.savedAt <= Date.now() &&
          Date.now() - stored.savedAt < MAX_AGE &&
          compatible(stored.value, sample)
        ) {
          candidate = stored as Candidate<T>
        } else localStorage.removeItem(key)
      }
    } catch {
      message = '无法读取本地草稿，请勿直接关闭页面。'
    }
    baseline.current = serialized
    setSession({ key, baseline: serialized, candidate })
    setStatus(message)
    // Capture the loaded form once per account/record, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const active = Boolean(key && session?.key === key)
  const pending = active && Boolean(session?.candidate)
  const dirty = active && serialized !== session?.baseline

  const flush = () => {
    const current = latest.current
    if (!current.key || !current.dirty || current.pending || current.serialized === baseline.current) return true
    try {
      localStorage.setItem(current.key, JSON.stringify({ value: JSON.parse(current.serialized), savedAt: Date.now() }))
      return true
    } catch {
      return false
    }
  }

  useLayoutEffect(() => {
    latest.current = { key: active ? key : '', serialized, dirty, pending }
  }, [active, key, serialized, dirty, pending])

  useEffect(() => {
    if (!active || pending) return
    if (!dirty) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* reported when saving is attempted */
      }
      return
    }
    setStatus('正在保存本地草稿…')
    const timer = window.setTimeout(
      () =>
        setStatus(
          flush()
            ? '已保存到此浏览器，仅当前账号可恢复（保留 30 天）。'
            : '本地草稿保存失败，浏览器存储可能已满或被禁用，请勿直接关闭页面。',
        ),
      400,
    )
    return () => window.clearTimeout(timer)
    // flush reads the latest committed form via its ref.
  }, [active, key, serialized, dirty, pending])

  useEffect(() => {
    const confirmLeave = async () => {
      if (!latest.current.dirty || latest.current.serialized === baseline.current) return true
      const saved = flush()
      const canRestore = saved && !latest.current.pending
      return requestAppConfirmation({
        title: '离开当前页面？',
        message: canRestore
          ? '内容尚未提交，但本地草稿已保存。离开后仍可从当前账号恢复。'
          : '内容尚未提交，最新修改未能保存到本地。仍要离开吗？',
        confirmLabel: '离开页面',
        cancelLabel: '继续编辑',
        tone: 'warning',
      })
    }
    const unregister = registerDraftGuard(confirmLeave)
    const beforeUnload = () => {
      if (!latest.current.dirty || latest.current.serialized === baseline.current) return
      flush()
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      flush()
      unregister()
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [])

  const clear = () => {
    baseline.current = serialized
    latest.current.dirty = latest.current.serialized !== serialized
    latest.current.pending = false
    try {
      if (key) localStorage.removeItem(key)
    } catch {
      /* storage unavailable */
    }
    setSession((current) => (current ? { ...current, baseline: baseline.current, candidate: null } : current))
    setStatus('')
  }

  return {
    status,
    candidate: active ? session?.candidate : null,
    restore: () => {
      if (!session?.candidate) return
      onRestore(session.candidate.value)
      setSession({ ...session, candidate: null })
    },
    discard: () => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* storage unavailable */
      }
      setSession((current) => (current ? { ...current, candidate: null } : current))
      setStatus('')
    },
    clear,
    confirmLeave: async (reason: 'navigate' | 'close' = 'navigate') => {
      if (!dirty || latest.current.serialized === baseline.current) return true
      const saved = flush()
      const canRestore = saved && !pending
      return requestAppConfirmation({
        title: reason === 'close' ? '关闭当前表单？' : '离开当前页面？',
        message: canRestore
          ? '内容尚未提交，但本地草稿已保存。关闭后仍可从当前账号恢复。'
          : '内容尚未提交，最新修改未能保存到本地。仍要关闭吗？',
        confirmLabel: reason === 'close' ? '关闭表单' : '离开页面',
        cancelLabel: reason === 'close' ? '继续编辑' : '留在此页',
        tone: 'warning',
      })
    },
  }
}
