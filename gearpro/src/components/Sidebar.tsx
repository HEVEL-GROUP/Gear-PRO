import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { font, useTheme } from '@/theme/tokens';

const NAV_ITEMS = [
  { href: '/home', label: 'Trips', icon: 'map-outline' },
  { href: '/gear', label: 'Gear', icon: 'cube-outline' },
  { href: '/you', label: 'You', icon: 'person-outline' },
] as const;

// react-navigation's bottom-tabs always docks the tab bar at the bottom of
// the screen, even with a custom `tabBar` renderer -- there's no way to make
// it render as a left column that way. So on wide viewports the tab bar is
// hidden entirely and this renders as a real flex sibling instead, navigating
// via plain router.push (same routes, same URLs). Lives at the (protected)
// layout level (not inside (tabs)) so it persists on trip/[id] too.
export function Sidebar() {
  const t = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={{ width: 240, backgroundColor: t.bar, paddingTop: 28, paddingHorizontal: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 26, paddingHorizontal: 10 }}>
        <Mark size={24} fill={t.primary} check={t.bg} />
        <Text style={{ fontFamily: font.display, fontSize: 17, color: t.barText }}>Gear Pro</Text>
      </View>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/home' ? pathname === '/home' || pathname.startsWith('/trip') : pathname === item.href;
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}>
            <Ionicons name={item.icon} size={19} color={active ? t.barActive : t.barMuted} />
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: active ? t.barText : t.barMuted }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
