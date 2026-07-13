import Svg, { Path } from 'react-native-svg';

type Props = { size?: number; fill?: string; check?: string };

export function Mark({ size = 28, fill = '#7a8a5e', check = '#f5ead8' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Path d="M12 68 L40 20 L52 40 L64 20 L88 68 Z" fill={fill} />
      <Path
        d="M34 56 L44 66 L64 40"
        stroke={check}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
