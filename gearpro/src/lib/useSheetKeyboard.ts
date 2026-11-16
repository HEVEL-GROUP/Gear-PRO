import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

import { readWebKeyboardBottomInset } from '@/lib/keyboardInset';

/**
 * How far a bottom sheet must move up to clear the software keyboard.
 * Web (iOS Safari included) reads visualViewport. Native iOS reads the
 * keyboard frame — KeyboardAvoidingView inside a Modal often misses it.
 */
export function useSheetKeyboard(active: boolean): { lift: number; layoutHeight: number } {
  const { height } = useWindowDimensions();
  const [webInset, setWebInset] = useState(0);
  const [iosInset, setIosInset] = useState(0);
  const visibleRef = useRef(false);

  useEffect(() => {
    if (!active || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const update = () => {
      const next = readWebKeyboardBottomInset(visibleRef.current);
      visibleRef.current = next > 0;
      setWebInset((prev) => (prev === next ? prev : next));
    };
    const frame = requestAnimationFrame(update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      visibleRef.current = false;
      setWebInset(0);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
    };
  }, [active]);

  useEffect(() => {
    if (!active || Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setIosInset(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setIosInset(0));
    return () => {
      show.remove();
      hide.remove();
      setIosInset(0);
    };
  }, [active]);

  const layoutHeight =
    Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement?.clientHeight
      ? document.documentElement.clientHeight
      : height;
  const measured = Platform.OS === 'web' ? webInset : Platform.OS === 'ios' ? iosInset : 0;
  return { lift: active ? measured : 0, layoutHeight };
}
