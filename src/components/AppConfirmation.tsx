import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import './app-confirmation.css'

export type AppConfirmationOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'warning' | 'danger'
}

type ConfirmationRequest = AppConfirmationOptions & {
  id: number
  resolve: (confirmed: boolean) => void
}

let nextId = 0
let activeRequest: ConfirmationRequest | null = null
const queuedRequests: ConfirmationRequest[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return activeRequest
}

export function requestAppConfirmation(options: AppConfirmationOptions) {
  return new Promise<boolean>((resolve) => {
    const request = { ...options, id: ++nextId, resolve }
    if (activeRequest) queuedRequests.push(request)
    else activeRequest = request
    notify()
  })
}

function resolveRequest(id: number, confirmed: boolean) {
  if (!activeRequest || activeRequest.id !== id) return
  const completed = activeRequest
  activeRequest = queuedRequests.shift() ?? null
  completed.resolve(confirmed)
  notify()
}

export function AppConfirmationHost() {
  const request = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const acceptRef = useRef<HTMLButtonElement>(null)
  const focusOriginRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (request) {
      if (!focusOriginRef.current && document.activeElement instanceof HTMLElement) {
        focusOriginRef.current = document.activeElement
      }
      cancelRef.current?.focus()
    } else {
      focusOriginRef.current?.focus()
      focusOriginRef.current = null
    }
  }, [request?.id])

  useEffect(() => {
    if (!request) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        resolveRequest(request.id, false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request?.id])

  if (!request) return null

  return createPortal(
    <div className="app-confirm-scrim" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) resolveRequest(request.id, false)
    }}>
      <section
        className={`app-confirm-dialog is-${request.tone ?? 'warning'}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`app-confirm-title-${request.id}`}
        aria-describedby={`app-confirm-message-${request.id}`}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          if (event.shiftKey && document.activeElement === cancelRef.current) {
            event.preventDefault()
            acceptRef.current?.focus()
          } else if (!event.shiftKey && document.activeElement === acceptRef.current) {
            event.preventDefault()
            cancelRef.current?.focus()
          }
        }}
      >
        <div className="app-confirm-heading">
          <span className="app-confirm-mark" aria-hidden="true">!</span>
          <div>
            <p className="app-confirm-eyebrow">{request.tone === 'danger' ? 'PLEASE CONFIRM' : 'UNSAVED CHANGES'}</p>
            <h2 id={`app-confirm-title-${request.id}`}>{request.title}</h2>
          </div>
        </div>
        <p className="app-confirm-message" id={`app-confirm-message-${request.id}`}>{request.message}</p>
        <div className="app-confirm-actions">
          <button ref={cancelRef} type="button" className="app-confirm-cancel" onClick={() => resolveRequest(request.id, false)}>
            {request.cancelLabel ?? '取消'}
          </button>
          <button ref={acceptRef} type="button" className="app-confirm-accept" onClick={() => resolveRequest(request.id, true)}>
            {request.confirmLabel ?? '确认'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
