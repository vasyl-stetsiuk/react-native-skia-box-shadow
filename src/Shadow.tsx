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
  ShadowProps,
  ShadowParams,
  ShadowShape,
  ShadowFillStyle,
} from './types';

// ── Defaults (mirrors ShadowDefaults.kt) ───────────────────────
const DEFAULTS = {
  fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.10)' } as ShadowFillStyle,
  blurRadius: 24,
  spread: 4,
  offsetX: 0,
  offsetY: 0,
} as const;

const pixelRatio = PixelRatio.get();

// ── Single shadow layer renderer ────────────────────────────────
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

  // ── Paint ─────────────────────────────────────────────────────
  const paint = useMemo(() => {
    const p = Skia.Paint();
    if (fillStyle.kind === 'color') {
      p.setColor(Skia.Color(fillStyle.color));
    } else {
      p.setShader(fillStyle.factory(width, height));
    }
    return p;
  }, [fillStyle, width, height]);

  // ── Shadow sizing (spread) ────────────────────────────────────
  const shadowWidth = width + spread * 2;
  const shadowHeight = height + spread * 2;
  const scaleX = width > 0 ? shadowWidth / width : 1;
  const scaleY = height > 0 ? shadowHeight / height : 1;

  // ── Blur (adjusted for pixel density) ─────────────────────────
  const adjustedBlur = blurRadius / pixelRatio;
  const blurChild = adjustedBlur > 0 ? <Blur blur={adjustedBlur} /> : null;

  // ── Shape element (with Blur as child) ────────────────────────
  const shapeElement = useMemo(() => {
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
  }, [shape, width, height, paint, blurChild]);

  return (
    <Group transform={[{ translateX: offsetX }, { translateY: offsetY }]}>
      <Group
        transform={[{ scaleX }, { scaleY }]}
        origin={{ x: width / 2, y: height / 2 }}
      >
        {shapeElement}
      </Group>
    </Group>
  );
};

/**
 * `<Shadow>` — CSS-style box shadows for React Native.
 *
 * Renders one or more blurred, colored shadows behind `children`.
 * Supports blur, spread, offset, custom colors/shaders, and
 * arbitrary shapes (rect, roundedRect, circle, SVG path).
 *
 * Powered by `@shopify/react-native-skia`.
 *
 * @example
 * ```tsx
 * import { Shadow } from 'react-native-skia-box-shadow';
 *
 * <Shadow
 *   shadows={{
 *     fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.15)' },
 *     blurRadius: 20,
 *     offsetY: 4,
 *   }}
 *   shape={{ kind: 'roundedRect', radius: 16 }}
 * >
 *   <View style={styles.card}>
 *     <Text>Card with shadow</Text>
 *   </View>
 * </Shadow>
 * ```
 *
 * @example
 * ```tsx
 * // Multiple shadow layers
 * <Shadow
 *   shadows={[
 *     { blurRadius: 4, offsetY: 2, fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.08)' } },
 *     { blurRadius: 16, offsetY: 8, fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.12)' } },
 *   ]}
 *   shape={{ kind: 'roundedRect', radius: 12 }}
 * >
 *   {children}
 * </Shadow>
 * ```
 */
const Shadow: React.FC<ShadowProps> = ({
  shadows,
  shape = { kind: 'rect' },
  width: _width,
  height: _height,
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

  // ── Compute canvas padding ────────────────────────────────────
  // The canvas must be large enough to contain blurred + spread +
  // offset shadows without clipping.
  const canvasPadding = useMemo(() => {
    let maxExtent = 0;
    for (const s of shadowList) {
      const blur = s.blurRadius ?? DEFAULTS.blurRadius;
      const spread = s.spread ?? DEFAULTS.spread;
      const ox = Math.abs(s.offsetX ?? DEFAULTS.offsetX);
      const oy = Math.abs(s.offsetY ?? DEFAULTS.offsetY);
      const extent = blur * 3 + spread + Math.max(ox, oy);
      if (extent > maxExtent) maxExtent = extent;
    }
    return Math.ceil(maxExtent);
  }, [shadowList]);

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
