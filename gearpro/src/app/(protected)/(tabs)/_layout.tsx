import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

import { font, useTheme } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.barMuted,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        // The sidebar (rendered one level up, in (protected)/_layout.tsx so it
        // also covers trip/[id]) replaces this entirely on wide viewports.
        tabBarStyle: isWide
          ? { display: 'none' }
          : {
              backgroundColor: t.bar,
              borderTopWidth: 0,
              height: Platform.OS === 'web' ? 62 : undefined,
              paddingTop: 6,
            },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: 'Gear',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pack"
        options={{
          title: 'Pack',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
