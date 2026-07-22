import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useCloudSync } from '@/lib/sync/useCloudSync';
import { usePro } from '@/lib/stripe/usePro';
import { useTheme } from '@/theme/tokens';

export default function ProtectedLayout() {
  const { session, isLoading } = useAuth();
  const { isPro } = usePro();
  const t = useTheme();
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
