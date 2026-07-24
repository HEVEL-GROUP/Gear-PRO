// A share link can be opened while logged out, and the auth that follows may
// reload the whole page -- an email-confirmation link opens a fresh document,
// and Google SSO does a full-page redirect to Google and back. An in-memory
// variable would not survive either, so the pending join token is persisted in
// localStorage: the join route stashes it, the user authenticates, and whatever
// post-auth landing point runs next (index / login / signup / auth callback)
// consumes it and forwards to /join/<token>. The token also lives in the route
// path and can be threaded through the OAuth/email redirect URL as ?join=, so a
// cross-device email confirmation still recovers it; this store is the
// same-browser path. Web-only (localStorage); guarded so native/no-DOM no-ops.
const KEY = 'gearpro-pending-join';

export function setPendingJoin(token: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable (private mode / native) -- the ?join= URL path still covers it
  }
}

// Returns the pending token and clears it, so it's consumed exactly once.
export function takePendingJoin(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(KEY);
    if (token) localStorage.removeItem(KEY);
    return token;
  } catch {
    return null;
  }
}

// Reads without consuming -- used when building an OAuth/email redirect URL that
// needs to carry the token as ?join= so a full page reload can recover it.
export function peekPendingJoin(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  } catch {
    return null;
  }
}
