import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { LandingPage } from '@/components/marketing/LandingPage';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useTheme } from '@/theme/tokens';

export default function Index() {
  const { session, isLoading } = useAuth();
  const t = useTheme();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return <LandingPage />;
}
