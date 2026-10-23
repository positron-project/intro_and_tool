import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalDraft } from './useLocalDraft'
import { confirmDraftNavigation } from './draft-navigation'

const storageKey = (owner = 'alice', scope = 'prompt:new') => `club-draft:v1:${owner}:${scope}`
const seed = (value: unknown, savedAt = Date.now()) => localStorage.setItem(storageKey(), JSON.stringify({ value, savedAt }))

function useForm(ownerId = 'alice', scope = 'prompt:new', ready = true) {
  const [value, setValue] = useState({ text: '' })
  const draft = useLocalDraft({ ownerId, scope, ready, value, onRestore: setValue })
  return { value, setValue, draft }
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('local drafts', () => {
  it('does not save an untouched form; autosaves and flushes the final keystroke on unmount', () => {
    const { result, unmount } = renderHook(() => useForm())
    expect(localStorage.getItem(storageKey())).toBeNull()
    act(() => result.current.setValue({ text: 'first' }))
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('first')
    act(() => result.current.setValue({ text: 'last keystroke' }))
    unmount()
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('last keystroke')
  })

  it('preserves a previous draft until the user explicitly restores or discards it', () => {
    seed({ text: 'previous' })
    const { result } = renderHook(() => useForm())
    expect(result.current.value.text).toBe('')
    expect(result.current.draft.candidate?.value.text).toBe('previous')
    act(() => result.current.setValue({ text: 'new' }))
    act(() => vi.advanceTimersByTime(500))
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('previous')
    act(() => result.current.draft.restore())
    expect(result.current.value.text).toBe('previous')
    expect(result.current.draft.candidate).toBeNull()
  })

  it('discards the old draft and starts saving current edits', () => {
    seed({ text: 'old' })
    const { result } = renderHook(() => useForm())
    act(() => result.current.draft.discard())
    expect(localStorage.getItem(storageKey())).toBeNull()
    act(() => result.current.setValue({ text: 'replacement' }))
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('replacement')
  })

  it('isolates accounts and records and flushes before an account switch', () => {
    const { result, rerender } = renderHook(({ owner, scope }) => useForm(owner, scope), {
      initialProps: { owner: 'alice', scope: 'prompt:new' },
    })
    act(() => result.current.setValue({ text: 'alice only' }))
    rerender({ owner: 'bob', scope: 'prompt:new' })
    expect(result.current.draft.candidate).toBeNull()
    expect(localStorage.getItem(storageKey('bob'))).toBeNull()
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('alice only')
    rerender({ owner: 'alice', scope: 'project:123' })
    expect(result.current.draft.candidate).toBeNull()
  })

  it('clears after successful submission without resurrecting a pending timer or showing a leave warning', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result, unmount } = renderHook(() => useForm())
    act(() => result.current.setValue({ text: 'submitted' }))
    act(() => result.current.draft.clear())
    act(() => vi.advanceTimersByTime(500))
    expect(confirmDraftNavigation()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    unmount()
    expect(localStorage.getItem(storageKey())).toBeNull()
  })

  it('preserves edits made while a server save was in flight', () => {
    const { result } = renderHook(() => useForm())
    act(() => result.current.setValue({ text: 'sent' }))
    const finishSave = result.current.draft.clear
    act(() => result.current.setValue({ text: 'typed during save' }))
    act(() => finishSave())
    act(() => vi.advanceTimersByTime(500))
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('typed during save')
  })

  it('guards navigation and refresh, flushing immediately, and lets a cancelled navigation keep editing', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useForm())
    act(() => result.current.setValue({ text: 'unsent' }))
    expect(confirmDraftNavigation()).toBe(false)
    expect(confirm).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(storageKey())!).value.text).toBe('unsent')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    confirm.mockReturnValue(true)
    expect(result.current.draft.confirmLeave()).toBe(true)
  })

  it('reports quota errors and still warns before leaving', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useForm())
    act(() => result.current.setValue({ text: 'not saved' }))
    act(() => vi.advanceTimersByTime(400))
    expect(result.current.draft.status).toContain('保存失败')
    expect(result.current.draft.confirmLeave()).toBe(false)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('可能未保存'))
  })

  it.each([
    { value: { text: 42 }, savedAt: Date.now() },
    { value: { text: 'expired' }, savedAt: Date.now() - 31 * 86400000 },
  ])('ignores incompatible or expired drafts', (stored) => {
    localStorage.setItem(storageKey(), JSON.stringify(stored))
    const { result } = renderHook(() => useForm())
    expect(result.current.draft.candidate).toBeNull()
    expect(localStorage.getItem(storageKey())).toBeNull()
  })

  it('waits for asynchronous form data before capturing the baseline', () => {
    const { result, rerender } = renderHook(({ ready }) => useForm('alice', 'prompt:new', ready), { initialProps: { ready: false } })
    act(() => result.current.setValue({ text: 'from server' }))
    rerender({ ready: true })
    act(() => vi.advanceTimersByTime(500))
    expect(localStorage.getItem(storageKey())).toBeNull()
  })
})
