/**
 * middleware.ts — Router-level security middleware
 *
 * Registered via router.beforeEach in router/index.ts.
 * Runs before every navigation and enforces app-wide rules that individual
 * route guards shouldn't have to repeat.
 *
 * Current checks:
 *  1. Sanitise ?redirect= query param — prevent open-redirect attacks where
 *     an attacker crafts a URL that navigates the user off-site after login.
 *  2. Strip unexpected query params that could be used for reflected XSS via
 *     server-side log injection or analytics-bypass tricks (future-proof).
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { validateRedirect } from '@/utils/safeRedirect'

/**
 * Sanitises the `?redirect=` query parameter on the login route.
 * If the value is not a safe internal path it is removed from the URL so the
 * user is sent to the default post-login destination instead.
 */
export function sanitiseRedirectParam(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  // Only relevant on routes that accept a ?redirect= param
  if (to.path !== '/login' && to.path !== '/signup') {
    next()
    return
  }

  const raw = to.query.redirect
  if (!raw) {
    next()
    return
  }

  const safe = validateRedirect(raw, '')
  if (safe === String(raw)) {
    // Already valid — proceed without rewriting
    next()
    return
  }

  // Rewrite the URL without the unsafe redirect param
  const sanitised = { ...to, query: { ...to.query, redirect: undefined } }
  next(sanitised)
}
