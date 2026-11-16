import { sheetMaxHeightPx, webKeyboardBottomInset } from './keyboardInset';

describe('webKeyboardBottomInset', () => {
  it('is zero when the viewport has not shrunk', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
        editableFocused: true,
        alreadyVisible: false,
      }),
    ).toBe(0);
  });

  it('lifts by the keyboard height while a field is focused', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 480,
        offsetTop: 0,
        editableFocused: true,
        alreadyVisible: false,
      }),
    ).toBe(320);
  });

  it('does not over-lift when Safari pans the visual viewport', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 480,
        offsetTop: 40,
        editableFocused: true,
        alreadyVisible: false,
      }),
    ).toBe(280);
  });

  it('ignores a short viewport change such as the URL bar', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 740,
        offsetTop: 0,
        editableFocused: true,
        alreadyVisible: false,
      }),
    ).toBe(0);
  });

  it('stays up while focus moves between fields and the keyboard is still open', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 480,
        offsetTop: 0,
        editableFocused: false,
        alreadyVisible: true,
      }),
    ).toBe(320);
  });

  it('drops once the keyboard is gone, even if it was visible', () => {
    expect(
      webKeyboardBottomInset({
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
        editableFocused: false,
        alreadyVisible: true,
      }),
    ).toBe(0);
  });
});

describe('sheetMaxHeightPx', () => {
  it('keeps the phone sheet at 90% of the screen when the keyboard is closed', () => {
    expect(sheetMaxHeightPx(800, 0, false)).toBe(720);
  });

  it('fits the sheet in the space above the keyboard', () => {
    expect(sheetMaxHeightPx(800, 320, false)).toBe(472);
  });

  it('does not grow taller than the visible area', () => {
    const inset = 700;
    const max = sheetMaxHeightPx(800, inset, false);
    expect(max).toBeLessThanOrEqual(800 - inset);
    expect(max).toBeGreaterThan(0);
  });
});
