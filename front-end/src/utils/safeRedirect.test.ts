import { describe, it, expect } from 'vitest'
import { validateRedirect } from './safeRedirect'

describe('validateRedirect', () => {
  // ── Safe paths ────────────────────────────────────────────────────────────

  it('returns a simple internal path unchanged', () => {
    expect(validateRedirect('/app/budget')).toBe('/app/budget')
  })

  it('returns a nested internal path unchanged', () => {
    expect(validateRedirect('/app/settings')).toBe('/app/settings')
  })

  it('returns a path with a query string unchanged', () => {
    expect(validateRedirect('/login?foo=bar')).toBe('/login?foo=bar')
  })

  it('returns a path with a hash unchanged', () => {
    expect(validateRedirect('/app/budget#section')).toBe('/app/budget#section')
  })

  // ── Custom fallback ───────────────────────────────────────────────────────

  it('uses the custom fallback when the target is unsafe', () => {
    expect(validateRedirect('//evil.com', '/home')).toBe('/home')
  })

  it('defaults fallback to "/" when not provided', () => {
    expect(validateRedirect('//evil.com')).toBe('/')
  })

  // ── Open-redirect: protocol-relative URLs ────────────────────────────────

  it('rejects protocol-relative URL starting with //', () => {
    expect(validateRedirect('//evil.com')).toBe('/')
  })

  it('rejects protocol-relative URL with a path', () => {
    expect(validateRedirect('//evil.com/path')).toBe('/')
  })

  // ── Open-redirect: absolute URLs with schemes ────────────────────────────

  it('rejects https:// absolute URL', () => {
    expect(validateRedirect('https://evil.com')).toBe('/')
  })

  it('rejects http:// absolute URL', () => {
    expect(validateRedirect('http://evil.com/page')).toBe('/')
  })

  it('rejects javascript: URI scheme', () => {
    expect(validateRedirect('javascript:alert(1)')).toBe('/')
  })

  it('rejects data: URI scheme', () => {
    expect(validateRedirect('data:text/html,<script>alert(1)</script>')).toBe('/')
  })

  it('rejects mailto: scheme', () => {
    expect(validateRedirect('mailto:attacker@evil.com')).toBe('/')
  })

  // ── Header injection: CRLF ───────────────────────────────────────────────

  it('rejects target containing a newline character', () => {
    expect(validateRedirect('/safe\nLocation: http://evil.com')).toBe('/')
  })

  it('rejects target containing a carriage return', () => {
    expect(validateRedirect('/safe\rX-Injected: true')).toBe('/')
  })

  it('rejects target containing CRLF pair', () => {
    expect(validateRedirect('/safe\r\nContent-Length: 0')).toBe('/')
  })

  // ── Path traversal ────────────────────────────────────────────────────────

  it('rejects /../ path traversal', () => {
    expect(validateRedirect('/../etc/passwd')).toBe('/')
  })

  it('rejects /foo/../../../etc traversal', () => {
    expect(validateRedirect('/foo/../../etc')).toBe('/')
  })

  it('rejects traversal at end of path', () => {
    expect(validateRedirect('/foo/..')).toBe('/')
  })

  // ── Non-rooted paths ─────────────────────────────────────────────────────

  it('rejects a relative path without leading slash', () => {
    expect(validateRedirect('app/budget')).toBe('/')
  })

  it('rejects an empty string', () => {
    expect(validateRedirect('')).toBe('/')
  })

  // ── Type safety ───────────────────────────────────────────────────────────

  it('rejects non-string input (number)', () => {
    expect(validateRedirect(42)).toBe('/')
  })

  it('rejects non-string input (null)', () => {
    expect(validateRedirect(null)).toBe('/')
  })

  it('rejects non-string input (undefined)', () => {
    expect(validateRedirect(undefined)).toBe('/')
  })

  it('rejects non-string input (object)', () => {
    expect(validateRedirect({ toString: () => '/app/budget' })).toBe('/')
  })
})
