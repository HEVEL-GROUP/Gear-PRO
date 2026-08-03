import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Non-standard event Android Chrome fires before showing its own install
// mini-infobar -- there's no official TS type for it, so this is the
// minimal shape this hook actually uses.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallPrompt =
  | { kind: 'none' }
  | { kind: 'android'; install: () => Promise<void> }
  | { kind: 'ios' };

// Whether a home-screen-install shortcut is worth offering right now, and
// how to trigger it -- the two mobile platforms genuinely differ here.
// Android Chrome exposes a real install-prompt API a page can call
// programmatically (captured via beforeinstallprompt below). iOS Safari
// deliberately exposes NOTHING -- there is no API that triggers "Add to
// Home Screen"; the only thing a page can do is show the manual steps
// (Share icon -> Add to Home Screen) and let the user do it themselves.
// Desktop browsers are out of scope -- this is specifically the "on their
// phone" ask.
export function useInstallPrompt(): InstallPrompt {
  // State, not a ref -- this is read during render below (to decide which
  // `kind` to return), and a ref's `.current` isn't safe to read there
  // (mutating a ref never triggers the re-render that would pick up the
  // new value).
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const alreadyInstalled =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (alreadyInstalled) {
      setSuppressed(true);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setSuppressed(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (Platform.OS !== 'web' || suppressed) return { kind: 'none' };

  if (deferredEvent) {
    return {
      kind: 'android',
      install: async () => {
        await deferredEvent.prompt();
        await deferredEvent.userChoice;
        setDeferredEvent(null);
        setSuppressed(true);
      },
    };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iphone|ipad|ipod/i.test(ua)) return { kind: 'ios' };

  return { kind: 'none' };
}
