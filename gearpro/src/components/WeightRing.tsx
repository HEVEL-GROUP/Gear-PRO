import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { font, useTheme } from '@/theme/tokens';

type Props = { value: number; target: number; size?: number };

export function WeightRing({ value, target, size = 108 }: Props) {
  const t = useTheme();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const over = value > target;
  const targetPct = Math.max(0, Math.min(0.9999, target > 0 ? value / target : 0));
  const color = over ? t.alert : t.primary;

  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const from = pctRef.current;
    const startT = Date.now();
    const dur = 700;
    const tick = () => {
      const k = Math.min(1, (Date.now() - startT) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = from + (targetPct - from) * eased;
      pctRef.current = v;
      setPct(v);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [targetPct]);

  const angle = pct * 2 * Math.PI;
  const endX = c + r * Math.sin(angle);
  const endY = c - r * Math.cos(angle);
  const largeArc = angle > Math.PI ? 1 : 0;
  const arc = `M ${c} ${c - r} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={t.track} strokeWidth={stroke} fill="none" />
        {pct > 0.001 ? (
          <Path d={arc} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        ) : null}
      </Svg>
      <Text style={{ fontFamily: font.extrabold, fontSize: 26, color: t.text }}>
        {value.toFixed(1)}
      </Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
        of {target} lb
      </Text>
    </View>
  );
}
