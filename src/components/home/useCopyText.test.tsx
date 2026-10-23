import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCopyText } from './useCopyText'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCopyText', () => {
  it('copies the requested text and resets feedback after the latest click', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('isSecureContext', true)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { result } = renderHook(() => useCopyText())
    await act(() => result.current.copy('first'))
    act(() => { vi.advanceTimersByTime(1500) })
    await act(() => result.current.copy('second'))
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.status).toBe('copied')
    expect(writeText).toHaveBeenLastCalledWith('second')
    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current.status).toBe('idle')
  })

  it('reports clipboard rejection as failure', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const { result } = renderHook(() => useCopyText())
    await act(() => result.current.copy('123'))
    expect(result.current.status).toBe('failed')
  })

  it.each([true, false])('cleans up fallback copying and restores focus (success: %s)', async (success) => {
    vi.stubGlobal('isSecureContext', false)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => success) })
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()
    const { result } = renderHook(() => useCopyText())
    await act(() => result.current.copy('123'))
    expect(result.current.status).toBe(success ? 'copied' : 'failed')
    expect(document.querySelector('textarea')).toBeNull()
    expect(document.activeElement).toBe(button)
    button.remove()
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('ignores stale clipboard results and clears feedback timers on unmount', async () => {
    vi.useFakeTimers()
    let finishFirst!: () => void
    const writeText = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve }))
      .mockRejectedValueOnce(new Error('denied'))
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { result, unmount } = renderHook(() => useCopyText())
    let first!: Promise<void>
    act(() => { first = result.current.copy('first') })
    await act(() => result.current.copy('second'))
    await act(async () => { finishFirst(); await first })
    expect(result.current.status).toBe('failed')
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
