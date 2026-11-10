import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { AuthUser, AuthSession } from '../types'
import { AuthProvider, useAuth } from './auth.context'
import { getCurrentUser, login, logout, redeemInviteCode as redeemInviteCodeService } from './auth.service'

vi.mock('./auth.service', async (original) => ({
  ...await original<typeof import('./auth.service')>(),
  getCurrentUser: vi.fn(), login: vi.fn(), logout: vi.fn(), redeemInviteCode: vi.fn(),
}))

const user = { id: 'old-user', name: 'Old' } as AuthUser
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>
beforeEach(() => vi.resetAllMocks())

describe('auth refresh races', () => {
  it('does not restore the user when a refresh resolves after logout', async () => {
    let resolve!: (value: AuthUser) => void
    vi.mocked(getCurrentUser).mockReturnValue(new Promise((done) => { resolve = done }))
    vi.mocked(logout).mockResolvedValue(undefined)
    const { result } = renderHook(useAuth, { wrapper })
    await act(() => result.current.signOut())
    await act(async () => { resolve(user) })
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('does not overwrite a new login with the previous session refresh', async () => {
    let resolve!: (value: AuthUser | null) => void
    vi.mocked(getCurrentUser).mockReturnValue(new Promise((done) => { resolve = done }))
    const newUser = { ...user, id: 'new-user' }
    vi.mocked(login).mockResolvedValue({ user: newUser, accessToken: 'new' } as AuthSession)
    const { result } = renderHook(useAuth, { wrapper })
    await act(() => result.current.signIn({ email: 'a@example.com', password: 'test', turnstileToken: '', rememberMe: false }))
    await act(async () => { resolve(null) })
    expect(result.current.user?.id).toBe('new-user')
    expect(result.current.loading).toBe(false)
  })

  it('lets only the newest overlapping refresh update the user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const { result } = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let resolve!: (value: AuthUser) => void
    vi.mocked(getCurrentUser).mockReturnValueOnce(new Promise((done) => { resolve = done })).mockResolvedValueOnce(null)
    let first!: Promise<void>
    act(() => { first = result.current.refresh() })
    await act(() => result.current.refresh())
    await act(async () => { resolve(user); await first })
    expect(result.current.user).toBeNull()
  })
})

describe('invite redemption', () => {
  it('passes the submitted real name to the redemption service', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const redeemedUser = { ...user, role: 'Contributor' } as AuthUser
    vi.mocked(redeemInviteCodeService).mockResolvedValue(redeemedUser)
    const { result } = renderHook(useAuth, { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.redeemInviteCode('OS-7K4M-9Q2P', '张三')
    })

    expect(redeemInviteCodeService).toHaveBeenCalledWith('OS-7K4M-9Q2P', '张三')
    expect(result.current.user).toEqual(redeemedUser)
  })
})
