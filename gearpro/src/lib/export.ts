import { Platform, Share } from 'react-native';

import { useGearStore } from '@/store/useGearStore';

function buildExportPayload() {
  const { gear, trips, customCategories } = useGearStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    app: 'GearPro',
    version: 1,
    gear,
    trips,
    customCategories,
  };
}

/**
 * Web downloads a .json file directly. Native has no filesystem write access
 * without adding expo-file-system/expo-sharing, so it opens the OS share
 * sheet with the JSON payload instead -- the app only ships on web today.
 */
export async function exportData(): Promise<void> {
  const payload = buildExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const filename = `gearpro-export-${payload.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ title: filename, message: json });
}
