import { Redirect, Stack } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCloudSync } from '@/lib/sync/useCloudSync';
import { usePro } from '@/lib/stripe/usePro';
import { useTheme } from '@/theme/tokens';

export default function ProtectedLayout() {
  const { session, isLoading } = useAuth();
  const { isPro } = usePro();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  useCloudSync();

  if (isLoading || (session && isPro === null)) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!isPro) {
    return <Redirect href="/subscribe" />;
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
