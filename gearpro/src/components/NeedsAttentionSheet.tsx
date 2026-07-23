import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/form';
import { Card, Chip } from '@/components/ui';
import { tapLight, tapSuccess } from '@/lib/haptics';
import { font, useTheme } from '@/theme/tokens';
import { flaggedAssignments, GearStatus, gearMap, STATUS_LABELS, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void };

const toneFor = (s: GearStatus) => (s === 'consumed' ? ('neutral' as const) : ('alert' as const));

export function NeedsAttentionSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const trips = useGearStore((s) => s.trips);
  const gear = useGearStore((s) => s.gear);
  const updateAssignment = useGearStore((s) => s.updateAssignment);
  const removeGear = useGearStore((s) => s.removeGear);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  const byId = gearMap(gear);
  const flagged = flaggedAssignments(trips);

  return (
    <Sheet visible={visible} onClose={onClose} title="Needs attention">
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
        Gear checked in broken, used up, or lost -- out of the pool until you add it back or remove it for
        good.
      </Text>

      {flagged.length === 0 ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
          Nothing needs attention.
        </Text>
      ) : (
        flagged.map(({ trip, assignment }) => {
          const item = byId[assignment.gearId];
          return (
            <Card key={assignment.id} style={{ padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                    {item ? `${item.brand} ${item.name}` : 'Unknown item'}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    {trip.name}
                  </Text>
                </View>
                <Chip label={STATUS_LABELS[assignment.status]} tone={toneFor(assignment.status)} />
              </View>
              {assignment.statusReason ? (
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 8 }}>
                  "{assignment.statusReason}"
                </Text>
              ) : null}
              {confirmingRemove === assignment.id ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert }}>
                    Delete {item ? `${item.brand} ${item.name}` : 'this item'} from your library forever? This
                    also removes it from every trip. This can&apos;t be undone.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={() => setConfirmingRemove(null)} style={{ flex: 1 }}>
                      <View
                        style={{
                          alignItems: 'center',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: t.border,
                          paddingVertical: 10,
                        }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.text }}>Cancel</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        removeGear(assignment.gearId);
                        setConfirmingRemove(null);
                      }}
                      style={{ flex: 1 }}>
                      <View style={{ alignItems: 'center', borderRadius: 10, backgroundColor: t.alert, paddingVertical: 10 }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.onPrimary }}>Delete forever</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      updateAssignment(trip.id, assignment.id, { status: 'returned', statusReason: undefined });
                      tapSuccess();
                    }}
                    style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: t.border,
                        paddingVertical: 10,
                      }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={t.text} />
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.text }}>Add back</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => setConfirmingRemove(assignment.id)} style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: t.alert,
                        paddingVertical: 10,
                      }}>
                      <Ionicons name="trash-outline" size={16} color={t.alert} />
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.alert }}>Remove forever</Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })
      )}
    </Sheet>
  );
}
