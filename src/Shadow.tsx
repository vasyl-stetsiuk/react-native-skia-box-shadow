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

import type {
  Animatable,
  ShadowProps,
  ShadowParams,
  ShadowShape,
  ShadowFillStyle,
} from './types';
import {useDerivedValue} from "react-native-reanimated";

// ── Defaults (mirrors ShadowDefaults.kt) ────────────────────────
const DEFAULTS = {
  fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.10)' } as ShadowFillStyle,
  blurRadius: 24,
  spread: 4,
  offsetX: 0,
  offsetY: 0,
} as const;

const pixelRatio = PixelRatio.get();

// ── Helpers ─────────────────────────────────────────────────────

const readNum = (v: Animatable<number> | undefined, fallback: number): number => {
  'worklet';
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'number') return v;
  return v.value;
};

const readStr = (v: Animatable<string> | undefined, fallback: string): string => {
  'worklet';
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') return v;
  return v.value;
};

const isAnimated = (v: any): boolean =>
    v !== undefined && v !== null && typeof v === 'object' && 'value' in v;

const hasAnimatedValues = (params: ShadowParams): boolean =>
    isAnimated(params.blurRadius) ||
    isAnimated(params.spread) ||
    isAnimated(params.offsetX) ||
    isAnimated(params.offsetY) ||
    (params.fillStyle?.kind === 'color' && isAnimated(params.fillStyle.color)) ||
    (params.shape?.kind === 'roundedRect' && isAnimated(params.shape.radius));

// ── Shadow layer ────────────────────────────────────────────────
const ShadowLayer: React.FC<{
  params: ShadowParams;
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

  // ── Color: static Paint or animated ───────────────────────────
  const isColorAnimated =
      fillStyle.kind === 'color' && isAnimated(fillStyle.color);

  const staticPaint = useMemo(() => {
    if (isColorAnimated) return null;
    const p = Skia.Paint();
    if (fillStyle.kind === 'color') {
      p.setColor(Skia.Color(fillStyle.color as string));
    } else {
      p.setShader(fillStyle.factory(width, height));
    }
    return p;
  }, [fillStyle, width, height, isColorAnimated]);

  const animatedColor = useDerivedValue(() => {
    if (fillStyle.kind === 'color') {
      return Skia.Color(readStr(fillStyle.color, 'rgba(0,0,0,0.10)'));
    }
    return Skia.Color('transparent');
  }, [fillStyle]);

  // ── Animated blur ─────────────────────────────────────────────
  const derivedBlur = useDerivedValue(() => {
    return readNum(blurRadius, DEFAULTS.blurRadius) / pixelRatio;
  }, [blurRadius]);

  // ── Animated offset ───────────────────────────────────────────
  const offsetTransform = useDerivedValue(() => {
    return [
      { translateX: readNum(offsetX, DEFAULTS.offsetX) },
      { translateY: readNum(offsetY, DEFAULTS.offsetY) },
    ];
  }, [offsetX, offsetY]);

  // ── Animated spread (scale) ───────────────────────────────────
  const scaleTransform = useDerivedValue(() => {
    const s = readNum(spread, DEFAULTS.spread);
    const sw = width + s * 2;
    const sh = height + s * 2;
    return [
      { scaleX: width > 0 ? sw / width : 1 },
      { scaleY: height > 0 ? sh / height : 1 },
    ];
  }, [spread, width, height]);

  // ── Animated border radius ────────────────────────────────────
  const derivedRadius = useDerivedValue(() => {
    if (shape.kind === 'roundedRect') {
      return readNum(shape.radius, 0);
    }
    return 0;
  }, [shape]);

  // ── Shape element ─────────────────────────────────────────────
  const shapeElement = useMemo(() => {
    const blurChild = <Blur blur={derivedBlur} />;
    const colorProps = isColorAnimated
        ? { color: animatedColor }
        : { paint: staticPaint! };

    switch (shape.kind) {
      case 'roundedRect':
        return (
            <RoundedRect
                x={0} y={0} width={width} height={height}
                r={derivedRadius} {...colorProps}
            >
              {blurChild}
            </RoundedRect>
        );
      case 'circle': {
        const r = Math.min(width, height) / 2;
        return (
            <Circle cx={width / 2} cy={height / 2} r={r} {...colorProps}>
              {blurChild}
            </Circle>
        );
      }
      case 'path':
        return (
            <Path path={shape.svgPath} {...colorProps}>
              {blurChild}
            </Path>
        );
      case 'rect':
      default:
        return (
            <Rect x={0} y={0} width={width} height={height} {...colorProps}>
              {blurChild}
            </Rect>
        );
    }
  }, [shape, width, height, staticPaint, animatedColor, derivedBlur, derivedRadius, isColorAnimated]);

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

// ── Main Shadow component ───────────────────────────────────────

/**
 * `<Shadow>` — CSS-style box shadows for React Native.
 *
 * Supports animated values via Reanimated `SharedValue`,
 * color animation, gradient fills, multi-layer shadows,
 * and arbitrary shapes.
 *
 * All numeric props (`blurRadius`, `spread`, `offsetX`, `offsetY`)
 * and color strings accept both static values and `SharedValue`
 * for 60fps UI-thread animations.
 *
 * @example Static shadow
 * ```tsx
 * <Shadow
 *   shadows={{ blurRadius: 16, offsetY: 4,
 *     fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.15)' } }}
 *   shape={{ kind: 'roundedRect', radius: 16 }}
 * >
 *   <View style={styles.card}><Text>Hello</Text></View>
 * </Shadow>
 * ```
 *
 * @example Animated shadow with color transition
 * ```tsx
 * const blur = useSharedValue(16);
 * const shadowColor = useSharedValue('rgba(0,0,0,0.15)');
 *
 * const onPressIn = () => {
 *   blur.value = withSpring(32);
 *   shadowColor.value = withTiming('rgba(59,130,246,0.4)');
 * };
 *
 * <Shadow
 *   shadows={{
 *     blurRadius: blur,
 *     fillStyle: { kind: 'color', color: shadowColor },
 *   }}
 *   shape={{ kind: 'roundedRect', radius: 16 }}
 *   maxCanvasPadding={150}
 * >
 *   <Pressable onPressIn={onPressIn}>
 *     <View style={styles.card}><Text>Press me</Text></View>
 *   </Pressable>
 * </Shadow>
 * ```
 */
const Shadow: React.FC<ShadowProps> = ({
                                         shadows,
                                         shape = { kind: 'rect' },
                                         width: _width,
                                         height: _height,
                                         maxCanvasPadding,
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

  // ── Canvas padding ────────────────────────────────────────────
  const canvasPadding = useMemo(() => {
    const parentShapeAnimated =
        shape.kind === 'roundedRect' && isAnimated(shape.radius);
    const anyAnimated =
        parentShapeAnimated || shadowList.some(hasAnimatedValues);
    if (anyAnimated) {
      return maxCanvasPadding ?? 120;
    }

    let maxExtent = 0;
    for (const s of shadowList) {
      const blur = (s.blurRadius as number) ?? DEFAULTS.blurRadius;
      const sp = (s.spread as number) ?? DEFAULTS.spread;
      const ox = Math.abs((s.offsetX as number) ?? DEFAULTS.offsetX);
      const oy = Math.abs((s.offsetY as number) ?? DEFAULTS.offsetY);
      const extent = blur * 3 + sp + Math.max(ox, oy);
      if (extent > maxExtent) maxExtent = extent;
    }
    return Math.ceil(maxExtent);
  }, [shadowList, shape, maxCanvasPadding]);

  const hasSize = width > 0 && height > 0;

  return (
      <View style={[styles.container, style]} onLayout={onLayout}>
        {hasSize && (
            <Canvas
                style={[
                  styles.canvas,
                  {
                    top: -canvasPadding,
                    left: -canvasPadding,
                    width: width + canvasPadding * 2,
                    height: height + canvasPadding * 2,
                  },
                ]}
            >
              <Group
                  transform={[
                    { translateX: canvasPadding },
                    { translateY: canvasPadding },
                  ]}
              >
                {shadowList.map((params, idx) => (
                    <ShadowLayer
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

export default Shadow;
export { Shadow, DEFAULTS as ShadowDefaults };
