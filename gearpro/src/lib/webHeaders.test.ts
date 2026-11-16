import app from '../../app.json';

describe('HTML cache headers', () => {
  it('sets Cache-Control no-cache on route responses via the expo-router server headers', () => {
    const router = app.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-router',
    );
    expect(Array.isArray(router)).toBe(true);
    if (!Array.isArray(router)) return;
    const options = router[1] as { headers?: { 'Cache-Control'?: string } };
    expect(options.headers?.['Cache-Control']).toBe('no-cache');
  });
});
