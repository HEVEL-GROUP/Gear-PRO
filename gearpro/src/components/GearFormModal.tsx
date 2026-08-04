import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, ChipPicker, Field, Label, Sheet } from '@/components/form';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { useAuth } from '@/lib/auth/AuthProvider';
import { type CatalogSuggestion, MIN_QUERY_LENGTH, searchCatalogProducts } from '@/lib/catalog/searchCatalog';
import { submitCatalogWeight } from '@/lib/catalog/submitWeight';
import { tapLight } from '@/lib/haptics';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

// Capped low, and rendered in a height-limited scroller (below) -- this
// shows up in a bottom sheet with a phone keyboard already covering half
// the screen, so the visible area for suggestions is small. 4 full rows
// fit comfortably above a keyboard on a typical phone without pushing the
// rest of the form out of reach.
const SUGGESTION_LIMIT = 4;
const SUGGESTION_LIST_MAX_HEIGHT = 4 * 56;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

type Props = { visible: boolean; onClose: () => void; editId?: string | null; notice?: string };

const blank = {
  brand: '',
  name: '',
  category: 'Shelter',
  weightLb: '',
  weightOz: '',
  quantity: '1',
  notes: '',
  expiration: '',
  catalogProductId: null as string | null,
};

const isValidDate = (s: string) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

// weightLb/weightOz are two halves of one physical weight -- oz is always
// < 16 (a full pound rolls into the lb side) so the two fields never
// disagree about how heavy the item actually is.
const combineWeight = (lbStr: string, ozStr: string): number =>
  (Number(lbStr) || 0) + (Number(ozStr) || 0) / 16;

const splitWeight = (totalLb: number): { weightLb: string; weightOz: string } => {
  const lb = Math.floor(totalLb);
  const oz = Math.round((totalLb - lb) * 16 * 100) / 100;
  return { weightLb: String(lb), weightOz: oz > 0 ? String(oz) : '' };
};

export function GearFormModal({ visible, onClose, editId, notice }: Props) {
  const t = useTheme();
  const { session } = useAuth();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const categories = useGearStore((s) => s.categories);
  const addCategory = useGearStore((s) => s.addCategory);
  const addGear = useGearStore((s) => s.addGear);
  const updateGear = useGearStore((s) => s.updateGear);
  const removeGear = useGearStore((s) => s.removeGear);

  const editing = editId ? gear.find((g) => g.id === editId) : null;
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([]);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Debounced catalog search as the user types brand and/or item name --
  // 250ms so a fast typist doesn't fire a query per keystroke. searchSeq
  // guards against an in-flight older query's response landing after a
  // newer one (a slow first keystroke's result arriving after the third
  // keystroke's) and clobbering the list with stale suggestions.
  //
  // Both fields feed ONE combined query rather than triggering separate
  // searches, because the ranking (search_catalog_products, trigram
  // similarity against brand+name) is what makes a bare brand ever safe to
  // search on: "KUIU" alone scores a loose brand-level match against every
  // KUIU product, but "KUIU rain" sharpens to the actual rain jacket. Firing
  // brand and name as independent queries would lose that combination.
  //
  // This app is explicitly offline-first and used in the backcountry --
  // a failed/timed-out search (no signal at a trailhead) is an expected,
  // routine outcome, not an error worth surfacing. It fails silently into
  // "no suggestions," same as if the catalog just didn't have a match.
  const combinedQuery = `${form.brand} ${form.name}`.trim();
  useEffect(() => {
    if (!visible || editing || suggestionsDismissed || combinedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      setSearching(true);
      searchCatalogProducts(combinedQuery, SUGGESTION_LIMIT)
        .catch(() => [])
        .then((results) => {
          if (searchSeq.current !== seq) return;
          setSuggestions(results);
          setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [combinedQuery, visible, editing, suggestionsDismissed]);

  const applySuggestion = (s: CatalogSuggestion) => {
    tapLight();
    Keyboard.dismiss();
    const weightSplit = s.weightLb != null ? splitWeight(s.weightLb) : null;
    setForm((f) => ({
      ...f,
      brand: s.brand || f.brand,
      name: s.name,
      category: categories.includes(s.category) ? s.category : f.category,
      weightLb: weightSplit?.weightLb ?? f.weightLb,
      weightOz: weightSplit?.weightOz ?? f.weightOz,
      catalogProductId: s.id,
    }));
    setSuggestions([]);
    setSuggestionsDismissed(true);
  };

  useEffect(() => {
    if (!visible) return;
    setError('');
    setConfirmingDelete(false);
    setSuggestions([]);
    setSuggestionsDismissed(false);
    setSearching(false);
    setForm(
      editing
        ? {
            brand: editing.brand,
            name: editing.name,
            category: editing.category,
            ...splitWeight(editing.weightLb),
            quantity: String(editing.quantity),
            notes: editing.notes ?? '',
            expiration: editing.expiration ?? '',
            catalogProductId: editing.catalogProductId ?? null,
          }
        : blank,
    );
  }, [visible, editId]);

  const inUse = editing
    ? trips.some((tr) => tr.assignments.some((a) => a.gearId === editing.id))
    : false;

  const save = () => {
    const weight = combineWeight(form.weightLb, form.weightOz);
    const quantity = Number(form.quantity);
    if (!form.brand.trim() || !form.name.trim() || !(weight > 0) || !(quantity >= 1)) {
      setError('Add a brand, name, a weight above 0, and quantity of at least 1.');
      return;
    }
    if (!isValidDate(form.expiration)) {
      setError('Expiration date should look like 2026-12-31, or leave it blank.');
      return;
    }
    const payload = {
      brand: form.brand.trim(),
      name: form.name.trim(),
      category: form.category,
      weightLb: weight,
      quantity: Math.round(quantity),
      notes: form.notes.trim() || undefined,
      expiration: form.expiration.trim() || undefined,
      catalogProductId: form.catalogProductId ?? undefined,
    };
    if (editing) updateGear(editing.id, payload);
    else addGear(payload);
    // Fire-and-forget, after the local save already succeeded -- the weight
    // the user just entered for their own gear doubles as a submission for
    // whichever catalog product this item is linked to (set once, at
    // creation, via applySuggestion). Never blocks or can fail the actual
    // save; see submitCatalogWeight's own module comment for why a failure
    // here is silently dropped rather than surfaced.
    if (form.catalogProductId && session?.user.id) {
      submitCatalogWeight(session.user.id, form.catalogProductId, weight);
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit gear' : 'Add gear'}>
      {notice ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: t.alertSoft,
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}>
          <Ionicons name="alert-circle-outline" size={18} color={t.alertText} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: t.alertText }}>{notice}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Brand" value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} placeholder="KUIU" />
        </View>
        <View style={{ flex: 1.4 }}>
          <Field label="Item name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Super Down jacket" />
        </View>
      </View>

      {searching ? (
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 12,
            color: t.textMuted,
            marginTop: -6,
            marginBottom: 14,
          }}>
          Searching…
        </Text>
      ) : suggestions.length > 0 ? (
        <View
          style={{
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            marginTop: -6,
            marginBottom: 14,
            maxHeight: SUGGESTION_LIST_MAX_HEIGHT,
            overflow: 'hidden',
          }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {suggestions.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => applySuggestion(s)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minHeight: 56,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.border,
                }}>
                <Ionicons name="pricetag-outline" size={16} color={t.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14, color: t.text }}>
                    {s.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>
                    {s.brand ? `${s.brand} · ` : ''}
                    {s.category}
                    {s.weightLb != null ? ` · ${s.weightLb} lb` : ''}
                  </Text>
                </View>
                {s.link ? (
                  // Separate tap target from the row itself -- tapping the
                  // row fills the form, tapping this opens the real listing,
                  // and they shouldn't be the same gesture on a touchscreen.
                  // stopPropagation matters on web (this app's only shipped
                  // platform so far): react-native-web's Pressable bubbles
                  // through the DOM, so without it this would ALSO fire the
                  // row's onPress and fill the form on every link tap.
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                      e.stopPropagation();
                      WebBrowser.openBrowserAsync(s.link!);
                    }}
                    style={{ padding: 4 }}>
                    <Ionicons name="open-outline" size={18} color={t.primary} />
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ChipPicker
        label="Category"
        value={form.category}
        options={categories}
        onChange={(v) => setForm((f) => ({ ...f, category: v }))}
        onAddCustom={addCategory}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Weight (lb)" value={form.weightLb} onChangeText={(v) => setForm((f) => ({ ...f, weightLb: v }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Weight (oz)" value={form.weightOz} onChangeText={(v) => setForm((f) => ({ ...f, weightOz: v }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Owned qty" value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} placeholder="1" keyboardType="number-pad" />
        </View>
      </View>
      {form.weightLb || form.weightOz ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted, marginTop: -6, marginBottom: 14 }}>
          Total: {combineWeight(form.weightLb, form.weightOz).toFixed(2)} lb
        </Text>
      ) : null}

      <Label>Expiration date (optional)</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Pressable onPress={() => setDatePickerOpen(true)} style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 48,
            }}>
            <Ionicons name="calendar-outline" size={18} color={t.textMuted} />
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 15,
                color: form.expiration ? t.text : t.textMuted,
              }}>
              {form.expiration ? fmtDate(form.expiration) : 'Add expiration date'}
            </Text>
          </View>
        </Pressable>
        {form.expiration ? (
          <Pressable onPress={() => setForm((f) => ({ ...f, expiration: '' }))} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={t.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Maintenance, fit, replacement…" multiline />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={editing ? 'Save changes' : 'Add to library'} onPress={save} />

      {editing ? (
        <View style={{ marginTop: 10 }}>
          {inUse ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: t.alertSoft,
                borderRadius: 12,
                padding: 12,
              }}>
              <Ionicons name="alert-circle-outline" size={18} color={t.alertText} />
              <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 13, color: t.alertText }}>
                Can't delete — assigned to a trip. Remove it there first.
              </Text>
            </View>
          ) : confirmingDelete ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
                Delete {editing.brand} {editing.name} forever? This can&apos;t be undone.
              </Text>
              <Button
                label="Yes, delete"
                tone="danger"
                onPress={() => {
                  removeGear(editing.id);
                  onClose();
                }}
              />
              <Button label="Cancel" tone="ghost" onPress={() => setConfirmingDelete(false)} />
            </View>
          ) : (
            <Button label="Delete gear" tone="danger" onPress={() => setConfirmingDelete(true)} />
          )}
        </View>
      ) : null}

      <DatePickerSheet
        visible={datePickerOpen}
        value={form.expiration}
        title="Expiration date"
        onChange={(v) => setForm((f) => ({ ...f, expiration: v }))}
        onClose={() => setDatePickerOpen(false)}
      />
    </Sheet>
  );
}
