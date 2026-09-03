// Identity resolution — works in production (IAP) and local dev (Vite)
//
// How it works:
//   Production (Cloud Run behind IAP + nginx):
//     nginx injects the IAP header value into every HTML response:
//       window.__IAP_USER__ = "accounts.google.com:user@elastic.co"
//     This file strips the "accounts.google.com:" prefix → "user@elastic.co"
//
//   Local dev (Vite dev server, no nginx):
//     window.__IAP_USER__ is undefined → falls back to "dev@localhost"
//
//   Local Docker (nginx but no IAP):
//     $http_x_goog_authenticated_user_email is empty → "" → falls back to "dev@localhost"

declare global {
  interface Window {
    __IAP_USER__?: string
  }
}

const IAP_PREFIX = 'accounts.google.com:'

/**
 * Returns the current user's email address.
 * Always returns a non-empty string — never throws.
 */
export function getCurrentUser(): string {
  const raw = window.__IAP_USER__
  if (!raw) return 'dev@localhost'
  // Strip the IAP prefix and return the bare email
  return raw.startsWith(IAP_PREFIX) ? raw.slice(IAP_PREFIX.length) : raw
}

/**
 * Returns 1–2 uppercase initials suitable for an avatar.
 * "ankita.pachauri@elastic.co" → "AP"
 * "dev@localhost"              → "DV"
 */
export function getUserInitials(email: string): string {
  const local = email.split('@')[0]           // "ankita.pachauri" | "dev"
  const parts = local.split(/[._-]/)          // ["ankita","pachauri"] | ["dev"]
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

/**
 * True when running locally with no real IAP identity.
 */
export function isDevIdentity(email: string): boolean {
  return email === 'dev@localhost'
}
