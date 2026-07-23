import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { fetchTripForecast, ForecastPeriod, weatherIcon } from '@/lib/weather';
import { font, useTheme } from '@/theme/tokens';

export function WeatherCard({
  lat,
  lon,
  startDate,
  endDate,
}: {
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
}) {
  const t = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'out_of_range' | 'unavailable'>('loading');
  const [periods, setPeriods] = useState<ForecastPeriod[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetchTripForecast(lat, lon, startDate, endDate).then((result) => {
      if (cancelled) return;
      setState(result.status);
      setPeriods(result.status === 'ok' ? result.periods : []);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, startDate, endDate]);

  // Silent for "loading" (avoids a layout flash) and "unavailable" (non-US
  // point, or the API didn't answer -- not worth alarming over).
  if (state === 'loading' || state === 'unavailable') return null;

  if (state === 'out_of_range') {
    return (
      <Card style={{ padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="calendar-outline" size={18} color={t.textMuted} />
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, flex: 1 }}>
          Forecast opens up closer to the trip.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 14, marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 12,
          color: t.softText,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 10,
        }}>
        Forecast
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {periods.map((p, i) => (
          <View
            key={i}
            style={{
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: t.surfaceAlt,
              minWidth: 76,
            }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: t.textMuted }} numberOfLines={1}>
              {p.name}
            </Text>
            <Ionicons name={weatherIcon(p.shortForecast)} size={22} color={t.primary} />
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
              {p.temperature}°{p.temperatureUnit}
            </Text>
            <Text
              style={{ fontFamily: font.medium, fontSize: 10, color: t.textMuted, textAlign: 'center' }}
              numberOfLines={2}>
              {p.shortForecast}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}
