import { describe, it, expect, vi } from 'vitest'
import { sanitiseRedirectParam } from './middleware'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

function makeRoute(path: string, query: Record<string, any> = {}): RouteLocationNormalized {
  return {
    path,
    query,
    fullPath: path,
    hash: '',
    matched: [],
    meta: {},
    name: undefined,
    params: {},
    redirectedFrom: undefined,
  } as unknown as RouteLocationNormalized
}

describe('sanitiseRedirectParam', () => {
  // ── Non-login routes ──────────────────────────────────────────────────────

  it('calls next() unchanged for non-login routes', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/app/budget')
    const from = makeRoute('/')
    sanitiseRedirectParam(to, from, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('calls next() unchanged for /app/settings (auth-protected route)', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    sanitiseRedirectParam(makeRoute('/app/settings'), makeRoute('/'), next)
    expect(next).toHaveBeenCalledWith()
  })

  // ── Login route with no redirect param ───────────────────────────────────

  it('calls next() unchanged when /login has no redirect param', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    sanitiseRedirectParam(makeRoute('/login'), makeRoute('/'), next)
    expect(next).toHaveBeenCalledWith()
  })

  it('calls next() unchanged when /signup has no redirect param', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    sanitiseRedirectParam(makeRoute('/signup'), makeRoute('/'), next)
    expect(next).toHaveBeenCalledWith()
  })

  // ── Login route with a safe redirect param ───────────────────────────────

  it('calls next() unchanged when redirect is a valid internal path', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/login', { redirect: '/app/budget' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    expect(next).toHaveBeenCalledWith()
  })

  it('allows nested safe paths on /signup', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/signup', { redirect: '/app/settings' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    expect(next).toHaveBeenCalledWith()
  })

  // ── Login route with an unsafe redirect param ─────────────────────────────

  it('strips an external https:// redirect from /login', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/login', { redirect: 'https://evil.com', other: 'keep' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    const arg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.query.redirect).toBeUndefined()
    expect(arg.query.other).toBe('keep')
  })

  it('strips a protocol-relative redirect from /login', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/login', { redirect: '//evil.com' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    const arg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.query.redirect).toBeUndefined()
  })

  it('strips a javascript: redirect from /signup', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/signup', { redirect: 'javascript:alert(1)' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    const arg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.query.redirect).toBeUndefined()
  })

  it('strips a CRLF-injection redirect from /login', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/login', { redirect: '/safe\r\nLocation: evil' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    const arg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.query.redirect).toBeUndefined()
  })

  it('preserves other query params when stripping an unsafe redirect', () => {
    const next = vi.fn() as unknown as NavigationGuardNext
    const to = makeRoute('/login', { redirect: '//evil.com', ref: 'email', promo: '10off' })
    sanitiseRedirectParam(to, makeRoute('/'), next)
    const arg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.query.redirect).toBeUndefined()
    expect(arg.query.ref).toBe('email')
    expect(arg.query.promo).toBe('10off')
  })
})
