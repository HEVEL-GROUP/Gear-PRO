import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Label } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';

type Suggestion = { id: string; label: string; lat: number; lon: number };

// OpenStreetMap Nominatim -- free, no API key. Their usage policy wants
// light client-side usage identified by Referer (which the browser sends
// automatically) rather than server-side bulk querying, which this is.
// Debounced so we don't fire a request per keystroke.
async function searchPlaces(query: string): Promise<Suggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search failed');
  const data: { place_id: number; display_name: string; lat: string; lon: string }[] = await res.json();
  return data.map((d) => ({
    id: String(d.place_id),
    label: d.display_name,
    lat: Number(d.lat),
    lon: Number(d.lon),
  }));
}

export function PlaceField({
  label,
  value,
  onChangeText,
  onSelectCoords,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  // Fires only when a suggestion is tapped (a real geocoded point) -- typing
  // free text never gives us coordinates, so callers must treat this as
  // optional and handle the no-coords case.
  onSelectCoords?: (lat: number, lon: number) => void;
  placeholder?: string;
}) {
  const t = useTheme();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const seq = ++requestSeq.current;
      searchPlaces(query)
        .then((results) => {
          if (seq !== requestSeq.current) return;
          setSuggestions(results);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (seq !== requestSeq.current) return;
          setLoading(false);
        });
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <View style={{ marginBottom: 14, position: 'relative', zIndex: open ? 20 : 1 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        style={{
          fontFamily: font.medium,
          fontSize: 16,
          color: t.text,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: 48,
        }}
      />
      {loading && (
        <View style={{ position: 'absolute', right: 14, top: 38 }}>
          <ActivityIndicator size="small" color={t.textMuted} />
        </View>
      )}
      {open && suggestions.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#201e1d',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => {
                onChangeText(s.label);
                onSelectCoords?.(s.lat, s.lon);
                setSuggestions([]);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: t.border,
              }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.text }} numberOfLines={2}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
