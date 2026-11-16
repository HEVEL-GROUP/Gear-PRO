// iOS Safari does not resize the layout viewport when the software keyboard
// opens, and react-native-web does not turn that into a keyboard event.
// documentElement.clientHeight stays put while visualViewport shrinks, so the
// gap between them is the keyboard. offsetTop is subtracted so a focus pan
// doesn't lift the sheet twice.

const MIN_KEYBOARD_PX = 120;

export function webKeyboardBottomInset(metrics: {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
  editableFocused: boolean;
  alreadyVisible: boolean;
}): number {
  const resizeHeight = Math.max(0, metrics.layoutHeight - metrics.viewportHeight);
  const visibleBottom = metrics.offsetTop + metrics.viewportHeight;
  const bottomInset = Math.max(0, Math.round(metrics.layoutHeight - visibleBottom));
  const tallEnough = resizeHeight >= MIN_KEYBOARD_PX;
  if (!tallEnough) return 0;
  if (!metrics.editableFocused && !metrics.alreadyVisible) return 0;
  return bottomInset;
}

export function sheetMaxHeightPx(layoutHeight: number, keyboardInset: number, isWide: boolean): number {
  const visible = Math.max(0, layoutHeight - keyboardInset);
  const cap = isWide
    ? Math.min(visible - 48, visible * 0.85)
    : keyboardInset > 0
      ? visible - 8
      : visible * 0.9;
  return Math.max(0, Math.round(Math.min(cap, visible)));
}

export function readWebKeyboardBottomInset(alreadyVisible: boolean): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutHeight = document.documentElement?.clientHeight || window.innerHeight;
  return webKeyboardBottomInset({
    layoutHeight,
    viewportHeight: vv.height,
    offsetTop: vv.offsetTop,
    editableFocused: isEditableElement(document.activeElement),
    alreadyVisible,
  });
}

function isEditableElement(el: EventTarget | null): boolean {
  if (!el || typeof HTMLElement === 'undefined' || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (el instanceof HTMLInputElement && el.disabled) return false;
    return true;
  }
  return el.isContentEditable;
}
