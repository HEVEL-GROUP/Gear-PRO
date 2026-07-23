import { useEffect, useRef } from 'react';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useGearStore } from '@/store/useGearStore';

import { pushToCloud, syncOnLogin } from './index';

const PUSH_DEBOUNCE_MS = 1500;

/**
 * Runs the initial pull/push once per login, then keeps the cloud in sync
 * with local edits. Local AsyncStorage stays the source of truth for what
 * renders -- sync runs in the background and never blocks the UI, since the
 * app has to keep working offline (trip packing happens with no signal).
 *
 * Every local edit marks the store syncDirty and schedules a debounced push;
 * the flag is cleared ONLY after a verified successful push. So if a push
 * fails (offline) or the app closes before it runs, syncDirty stays true and
 * syncOnLogin pushes-before-pulling next launch instead of letting the cloud
 * overwrite the unsynced work. Pushes are also flushed when the tab is hidden
 * and retried when the network reconnects.
 */
export function useCloudSync() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const syncedUserId = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = null;
    };
    const teardown = () => {
      clearTimer();
      storeUnsub.current?.();
      storeUnsub.current = null;
    };

    if (!userId) {
      teardown();
      syncedUserId.current = null;
      return;
    }

    if (syncedUserId.current === userId) return;
    syncedUserId.current = userId;

    const push = () => {
      clearTimer();
      pushToCloud(userId)
        .then(() => useGearStore.getState().setSyncDirty(false))
        .catch((err) => console.warn('[sync] push failed', err));
    };
    // Push right now (not debounced) if there is unsynced work -- used when the
    // tab is backgrounded/closed and on reconnect, to shrink the window where
    // an edit lives only on this device.
    const flush = () => {
      if (useGearStore.getState().syncDirty) push();
    };
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
    };

    let cancelled = false;
    syncOnLogin(userId)
      .catch((err) => console.warn('[sync] initial sync failed, continuing offline', err))
      .finally(() => {
        if (cancelled) return;
        storeUnsub.current = useGearStore.subscribe((state, prev) => {
          if (state.gear === prev.gear && state.trips === prev.trips) return;
          useGearStore.getState().setSyncDirty(true);
          clearTimer();
          pushTimer.current = setTimeout(push, PUSH_DEBOUNCE_MS);
        });
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibility);
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('pagehide', flush);
          window.addEventListener('online', flush);
        }
      });

    return () => {
      cancelled = true;
      teardown();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', flush);
        window.removeEventListener('online', flush);
      }
    };
  }, [userId]);
}
