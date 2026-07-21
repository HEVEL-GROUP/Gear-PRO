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
 */
export function useCloudSync() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const syncedUserId = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    const teardown = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = null;
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

    let cancelled = false;
    syncOnLogin(userId)
      .catch((err) => console.warn('[sync] initial sync failed, continuing offline', err))
      .finally(() => {
        if (cancelled) return;
        storeUnsub.current = useGearStore.subscribe((state, prev) => {
          if (state.gear === prev.gear && state.trips === prev.trips) return;
          if (pushTimer.current) clearTimeout(pushTimer.current);
          pushTimer.current = setTimeout(() => {
            pushToCloud(userId).catch((err) => console.warn('[sync] push failed', err));
          }, PUSH_DEBOUNCE_MS);
        });
      });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [userId]);
}
