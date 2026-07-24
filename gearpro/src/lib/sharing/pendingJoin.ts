// A share link can be opened while logged out. The join route stashes the
// token here and bounces to /login; the authed-landing redirect (index/login)
// consumes it and sends the user back to /join/<token>, now signed in. Kept in
// memory only -- the Expo web app is a single-page session, so a logout->login
// round-trip never reloads the page and this survives it; a hard refresh just
// drops the pending join, which is a fine failure mode (the user re-taps the
// link). The token itself always lives in the route path, so this only carries
// the "come back here after auth" intent, never the source of truth.
let pending: string | null = null;

export function setPendingJoin(token: string | null): void {
  pending = token;
}

// Returns the pending token and clears it, so it's consumed exactly once.
export function takePendingJoin(): string | null {
  const token = pending;
  pending = null;
  return token;
}
