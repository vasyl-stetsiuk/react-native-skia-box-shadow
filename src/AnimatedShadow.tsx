import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  PixelRatio,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Canvas,
  Group,
  RoundedRect,
  Rect,
  Circle,
  Path,
  Blur,
  Skia,
} from '@shopify/react-native-skia';

import type { ShadowShape, ShadowFillStyle } from './types';
import type {
  Animatable,
  AnimatedShadowParams,
  AnimatedShadowProps,
} from './types.animated';
import {useDerivedValue} from "react-native-reanimated";

// ── Defaults ────────────────────────────────────────────────────
const DEFAULTS = {
  fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.10)' } as ShadowFillStyle,
  blurRadius: 24,
  spread: 4,
  offsetX: 0,
  offsetY: 0,
} as const;

const pixelRatio = PixelRatio.get();

/**
 * Read a value that may be static or a SharedValue.
 * Called inside useDerivedValue / on UI thread.
 */
const readValue = (v: Animatable<number>, fallback: number): number => {
  'worklet';
  if (typeof v === 'number') return v;
  if (v === undefined || v === null) return fallback;
  return v.value;
};

// ── Animated single shadow layer ────────────────────────────────
const AnimatedShadowLayer: React.FC<{
  params: AnimatedShadowParams;
  width: number;
  height: number;
  defaultShape: ShadowShape;
}> = ({ params, width, height, defaultShape }) => {
  const {
    fillStyle = DEFAULTS.fillStyle,
    blurRadius = DEFAULTS.blurRadius,
    spread = DEFAULTS.spread,
    offsetX = DEFAULTS.offsetX,
    offsetY = DEFAULTS.offsetY,
    shape: shapeOverride,
  } = params;

  const shape = shapeOverride ?? defaultShape;

  // ── Paint (static — color changes don't need 60fps) ───────────
  const paint = useMemo(() => {
    const p = Skia.Paint();
    if (fillStyle.kind === 'color') {
      p.setColor(Skia.Color(fillStyle.color));
    } else {
      p.setShader(fillStyle.factory(width, height));
    }
    return p;
  }, [fillStyle, width, height]);

  // ── Animated blur (derived on UI thread) ──────────────────────
  const derivedBlur = useDerivedValue(() => {
    return readValue(blurRadius, DEFAULTS.blurRadius) / pixelRatio;
  }, [blurRadius]);

  // ── Animated offset transform ─────────────────────────────────
  const offsetTransform = useDerivedValue(() => {
    return [
      { translateX: readValue(offsetX, DEFAULTS.offsetX) },
      { translateY: readValue(offsetY, DEFAULTS.offsetY) },
    ];
  }, [offsetX, offsetY]);

  // ── Animated spread transform ─────────────────────────────────
  const scaleTransform = useDerivedValue(() => {
    const s = readValue(spread, DEFAULTS.spread);
    const sw = width + s * 2;
    const sh = height + s * 2;
    return [
      { scaleX: width > 0 ? sw / width : 1 },
      { scaleY: height > 0 ? sh / height : 1 },
    ];
  }, [spread, width, height]);

  // ── Shape element ─────────────────────────────────────────────
  const shapeElement = useMemo(() => {
    const blurChild = <Blur blur={derivedBlur} />;

    switch (shape.kind) {
      case 'roundedRect':
        return (
          <RoundedRect
            x={0}
            y={0}
            width={width}
            height={height}
            r={shape.radius}
            paint={paint}
          >
            {blurChild}
          </RoundedRect>
        );

      case 'circle': {
        const r = Math.min(width, height) / 2;
        return (
          <Circle cx={width / 2} cy={height / 2} r={r} paint={paint}>
            {blurChild}
          </Circle>
        );
      }

      case 'path':
        return (
          <Path path={shape.svgPath} paint={paint}>
            {blurChild}
          </Path>
        );

      case 'rect':
      default:
        return (
          <Rect x={0} y={0} width={width} height={height} paint={paint}>
            {blurChild}
          </Rect>
        );
    }
  }, [shape, width, height, paint, derivedBlur]);

  return (
    <Group transform={offsetTransform}>
      <Group
        transform={scaleTransform}
        origin={{ x: width / 2, y: height / 2 }}
      >
        {shapeElement}
      </Group>
    </Group>
  );
};

/**
 * `<AnimatedShadow>` — Animated CSS-style box shadows.
 *
 * Same API as `<Shadow>`, but numeric props accept Reanimated
 * `SharedValue<number>` for 60fps animations on the UI thread.
 *
 * Requires `react-native-reanimated` >= 3.0.0.
 *
 * @example
 * ```tsx
 * import { AnimatedShadow } from 'react-native-skia-box-shadow';
 * import { useSharedValue, withSpring } from 'react-native-reanimated';
 *
 * const MyCard = () => {
 *   const blur = useSharedValue(16);
 *   const offsetY = useSharedValue(4);
 *   const spread = useSharedValue(0);
 *
 *   const onPressIn = () => {
 *     blur.value = withSpring(32);
 *     offsetY.value = withSpring(12);
 *     spread.value = withSpring(4);
 *   };
 *
 *   const onPressOut = () => {
 *     blur.value = withSpring(16);
 *     offsetY.value = withSpring(4);
 *     spread.value = withSpring(0);
 *   };
 *
 *   return (
 *     <AnimatedShadow
 *       shadows={{
 *         fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.15)' },
 *         blurRadius: blur,
 *         offsetY,
 *         spread,
 *       }}
 *       shape={{ kind: 'roundedRect', radius: 16 }}
 *     >
 *       <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *         <View style={styles.card}>
 *           <Text>Press me</Text>
 *         </View>
 *       </Pressable>
 *     </AnimatedShadow>
 *   );
 * };
 * ```
 */
const AnimatedShadow: React.FC<AnimatedShadowProps> = ({
  shadows,
  shape = { kind: 'rect' },
  width: _width,
  height: _height,
  maxCanvasPadding = 120,
  style,
  children,
}) => {
  const [layout, setLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };

  const width = _width ?? layout?.width ?? 0;
  const height = _height ?? layout?.height ?? 0;

  const shadowList = Array.isArray(shadows) ? shadows : [shadows];

  const hasSize = width > 0 && height > 0;

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {hasSize && (
        <Canvas
          style={[
            styles.canvas,
            {
              top: -maxCanvasPadding,
              left: -maxCanvasPadding,
              width: width + maxCanvasPadding * 2,
              height: height + maxCanvasPadding * 2,
            },
          ]}
        >
          <Group
            transform={[
              { translateX: maxCanvasPadding },
              { translateY: maxCanvasPadding },
            ]}
          >
            {shadowList.map((params, idx) => (
              <AnimatedShadowLayer
                key={idx}
                params={params}
                width={width}
                height={height}
                defaultShape={shape}
              />
            ))}
          </Group>
        </Canvas>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  canvas: {
    position: 'absolute',
    pointerEvents: 'none',
  },
});

export default AnimatedShadow;
export { AnimatedShadow };
