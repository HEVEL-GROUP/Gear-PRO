import { type Href, Redirect } from 'expo-router';
import { View } from 'react-native';

import { LandingPage } from '@/components/marketing/LandingPage';
import { useAuth } from '@/lib/auth/AuthProvider';
import { takePendingJoin } from '@/lib/sharing/pendingJoin';
import { useTheme } from '@/theme/tokens';

export default function Index() {
  const { session, isLoading } = useAuth();
  const t = useTheme();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (session) {
    // If the user arrived via a share link while logged out, finish the join
    // now that they're authed; otherwise land on their trips.
    const pending = takePendingJoin();
    return <Redirect href={pending ? (`/join/${pending}` as Href) : '/home'} />;
  }

  return <LandingPage />;
}
