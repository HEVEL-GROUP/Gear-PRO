import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useTheme } from '@/theme/tokens';

export default function ProtectedLayout() {
  const { session, isLoading } = useAuth();
  const t = useTheme();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
