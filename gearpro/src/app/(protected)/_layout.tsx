import { Redirect, Stack } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCloudSync } from '@/lib/sync/useCloudSync';
import { useTheme } from '@/theme/tokens';

// GearPro is free -- being signed in is the only gate. There is no Pro/trial
// check here anymore; see the You tab for an optional, non-gating "Support
// GearPro" donation link instead.
export default function ProtectedLayout() {
  const { session, isLoading } = useAuth();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  useCloudSync();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
      {isWide && <Sidebar />}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="help" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </View>
    </View>
  );
}
