import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { ClearDemoDataSheet } from '@/components/ClearDemoDataSheet';
import { DeleteAccountSheet } from '@/components/DeleteAccountSheet';
import { Mark } from '@/components/Mark';
import { Card, Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { exportData } from '@/lib/export';
import { tapLight } from '@/lib/haptics';
import { useProfile } from '@/lib/profile/useProfile';
import { pushToCloud } from '@/lib/sync';
import { demoDataCounts, useGearStore } from '@/store/useGearStore';
import { font, useTheme } from '@/theme/tokens';

function Row({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: t.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={19} color={t.softText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{title}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function YouScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const { session, signOut } = useAuth();
  const { displayName, save: saveDisplayName } = useProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const resetLocal = useGearStore((s) => s.resetLocal);
  const [exportError, setExportError] = useState<string | null>(null);
  const [demoSheetOpen, setDemoSheetOpen] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const demoCounts = useMemo(() => demoDataCounts(gear, trips), [gear, trips]);
  const hasDemoData = demoCounts.gear > 0 || demoCounts.trips > 0;

  const startEditName = () => {
    setNameDraft(displayName ?? '');
    setEditingName(true);
  };
  const commitName = async () => {
    if (nameSaving) return;
    setNameSaving(true);
    try {
      await saveDisplayName(nameDraft);
      setEditingName(false);
    } catch {
      // leave the field open so the user can retry
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <Screen maxWidth={isWide ? 860 : 720}>
      <View style={{ paddingTop: 8, paddingBottom: 14 }}>
        <Display style={{ fontSize: 26 }}>You</Display>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Mark size={44} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        {editingName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, width: '100%', maxWidth: 320 }}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onSubmitEditing={commitName}
              autoFocus
              placeholder="Your name"
              placeholderTextColor={t.textMuted}
              maxLength={40}
              style={{
                flex: 1,
                fontFamily: font.bold,
                fontSize: 18,
                color: t.text,
                textAlign: 'center',
                borderBottomWidth: 1,
                borderColor: t.border,
                paddingVertical: 4,
              }}
            />
            <Pressable onPress={commitName} hitSlop={8}>
              <Ionicons name="checkmark-circle" size={24} color={t.primary} />
            </Pressable>
            <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
              <Ionicons name="close-circle" size={24} color={t.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={startEditName}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Display style={{ fontSize: 20, color: displayName ? t.text : t.textMuted }}>
              {displayName || 'Add your name'}
            </Display>
            <Ionicons name="pencil-outline" size={16} color={t.textMuted} />
          </Pressable>
        )}
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          {session?.user.email}
        </Text>
      </Card>

      <View style={{ height: 12 }} />

      <Pressable onPress={() => router.push('/help' as Href)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: t.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="help-buoy-outline" size={19} color={t.softText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>How Gear Pro works</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
              A quick guide to gear, trips, and packing
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </Card>
      </Pressable>

      <View style={{ height: 12 }} />

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="cloud-offline-outline" title="Works offline" subtitle="Your gear and trips live on this device first" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Row icon="cloud-upload-outline" title="Cloud sync" subtitle="Your data syncs automatically across every device you log into" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Pressable
          onPress={async () => {
            setExportError(null);
            try {
              tapLight();
              await exportData();
            } catch (err) {
              setExportError(err instanceof Error ? err.message : 'Export failed');
            }
          }}>
          <Row icon="download-outline" title="Backup & export" subtitle="Download a copy of your gear and trips as JSON" />
        </Pressable>
      </Card>
      {exportError && (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert, marginTop: 6 }}>{exportError}</Text>
      )}

      <View style={{ height: 12 }} />

      <Pressable onPress={() => router.push('/donate' as Href)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: t.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="heart-outline" size={19} color={t.softText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>Support GearPro</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
              GearPro is free — an optional way to help cover hosting costs
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </Card>
      </Pressable>

      {hasDemoData ? (
        <>
          <View style={{ height: 12 }} />
          <Pressable onPress={() => setDemoSheetOpen(true)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: t.alertSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="trash-outline" size={18} color={t.alertText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>Clear demo data</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                  Remove the sample gear and trips Gear Pro ships with
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </Card>
          </Pressable>
        </>
      ) : null}

      <View style={{ height: 16 }} />

      <Pressable
        disabled={loggingOut}
        onPress={async () => {
          tapLight();
          setLogoutError(null);
          setLoggingOut(true);
          try {
            // Flush any unsynced work to the cloud BEFORE wiping local to the
            // demo seed -- otherwise recent edits (or, in the worst case, the
            // whole account) can be lost on the next login. Must run while still
            // authenticated; after signOut the token is gone and the write fails.
            const uid = session?.user.id;
            if (uid && useGearStore.getState().syncDirty) {
              await pushToCloud(uid);
              useGearStore.getState().setSyncDirty(false);
            }
          } catch {
            // Couldn't reach the cloud. Do NOT sign out / reset -- that would
            // discard unsynced work with no cloud copy. Stay signed in so the
            // data is safe and can sync once back online.
            setLoggingOut(false);
            setLogoutError("Couldn't sync your latest changes. Check your connection and try again — your data is safe.");
            return;
          }
          await signOut();
          resetLocal();
          router.replace('/');
        }}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: t.alertSoft,
            opacity: loggingOut ? 0.6 : 1,
          }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.alertText }}>
            {loggingOut ? 'Saving & logging out…' : 'Log out'}
          </Text>
        </View>
      </Pressable>
      {logoutError ? (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert, textAlign: 'center', marginTop: 10 }}>
          {logoutError}
        </Text>
      ) : null}

      <Pressable onPress={() => setDeleteSheetOpen(true)} style={{ marginTop: 20, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Delete account</Text>
      </Pressable>

      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>
        Gear Pro
      </Text>

      <ClearDemoDataSheet visible={demoSheetOpen} onClose={() => setDemoSheetOpen(false)} />
      <DeleteAccountSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)} />
    </Screen>
  );
}
