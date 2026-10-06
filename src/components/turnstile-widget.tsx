import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; theme?: 'light' | 'dark' | 'auto'; callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void }) => string
      reset: (widgetId?: string) => void
    }
  }
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script'

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID)
  if (existing) return new Promise<void>((resolve) => existing.addEventListener('load', () => resolve(), { once: true }))
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile 脚本加载失败'))
    document.head.appendChild(script)
  })
}

export function TurnstileWidget({ value, onChange, allowFallback = true }: { value: string; onChange: (token: string) => void; allowFallback?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  const [scriptError, setScriptError] = useState(false)
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false
    void loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      containerRef.current.replaceChildren()
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
        callback: onChange,
        'expired-callback': () => onChange(''),
        'error-callback': () => onChange(''),
      })
    }).catch(() => setScriptError(true))
    return () => { cancelled = true }
  }, [onChange, siteKey])

  if (!siteKey && allowFallback) return <button type="button" className={`turnstile-fallback ${value ? 'verified' : ''}`} onClick={() => onChange(value ? '' : 'demo-turnstile-token')}><span className="turnstile-check" aria-hidden="true">{value ? '✓' : ''}</span><span>{value ? '验证码已通过（本地测试）' : '点击完成验证码校验'}</span><small>配置 VITE_TURNSTILE_SITE_KEY 后启用 Cloudflare Turnstile</small></button>
  if (!siteKey) return <div className="turnstile-fallback turnstile-unconfigured" role="status"><span className="turnstile-check" aria-hidden="true">!</span><span>暂未配置 Cloudflare Turnstile</span><small>API 模式需要配置 VITE_TURNSTILE_SITE_KEY 后才能登录或注册</small></div>
  return <div className="turnstile-wrap"><div ref={containerRef} />{scriptError && <small className="turnstile-error">验证码加载失败，请刷新后重试。</small>}</div>
}
