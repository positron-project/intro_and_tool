import { useCallback, useEffect, useRef, useState } from 'react'

type CopyStatus = 'idle' | 'copied' | 'failed'

async function writeClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const previousFocus = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  try {
    textarea.focus()
    textarea.select()
    if (!document.execCommand('copy')) throw new Error('Copy failed')
  } finally {
    textarea.remove()
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
  }
}

export function useCopyText(successDuration = 2000) {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const request = useRef(0)

  useEffect(() => () => {
    request.current += 1
    clearTimeout(timer.current)
  }, [])

  const copy = useCallback(async (text: string) => {
    const currentRequest = ++request.current
    clearTimeout(timer.current)
    setStatus('idle')
    let nextStatus: CopyStatus = 'copied'
    try {
      await writeClipboard(text)
    } catch {
      nextStatus = 'failed'
    }
    // Ignore an older request or a clipboard result arriving after unmount.
    if (currentRequest !== request.current) return
    setStatus(nextStatus)
    timer.current = setTimeout(() => setStatus('idle'), nextStatus === 'copied' ? successDuration : 3000)
  }, [successDuration])

  return { status, copy }
}
