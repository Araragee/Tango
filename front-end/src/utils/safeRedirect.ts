/**
 * safeRedirect.ts
 *
 * Validates that a redirect target is a safe, internal path before use.
 * Prevents open-redirect attacks where an attacker crafts a URL like:
 *   /login?redirect=//evil.com  or  /login?redirect=https://phishing.site
 *
 * Rules:
 *  - Must start with a single "/" (absolute path on this origin)
 *  - Must NOT start with "//" (protocol-relative external URL)
 *  - Must NOT contain a protocol (http:, https:, javascript:, etc.)
 *  - Must NOT contain newlines or carriage returns (header-injection guard)
 *
 * Usage:
 *   import { validateRedirect } from '@/utils/safeRedirect'
 *   router.push(validateRedirect(route.query.redirect, '/app/budget'))
 */

const SAFE_PATH_RE    = /^\/[^/].*$/              // starts with exactly one "/"
const PROTO_RE        = /[a-zA-Z][a-zA-Z0-9+\-.]*:/  // any URI scheme
const CRLF_RE         = /[\r\n]/
const TRAVERSAL_RE    = /(^|\/)\.\.(\/|$)/         // /../ path-traversal segments

/**
 * Returns `target` if it is a safe internal path, otherwise returns `fallback`.
 */
export function validateRedirect(
  target: unknown,
  fallback = '/',
): string {
  if (typeof target !== 'string' || !target) return fallback
  if (CRLF_RE.test(target))        return fallback  // newline / header injection
  if (PROTO_RE.test(target))       return fallback  // absolute URL with scheme
  if (TRAVERSAL_RE.test(target))   return fallback  // path traversal (/../)
  if (!SAFE_PATH_RE.test(target))  return fallback  // not a rooted internal path
  return target
}
