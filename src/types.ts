import type { ReactNode } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';

/**
 * Fill style for shadow — solid color or a Skia shader factory.
 *
 * @example
 * // Solid color
 * { kind: 'color', color: 'rgba(0,0,0,0.12)' }
 *
 * // Linear gradient
 * {
 *   kind: 'shader',
 *   factory: (w, h) => Skia.Shader.MakeLinearGradient(
 *     { x: 0, y: 0 }, { x: w, y: h },
 *     [Skia.Color('#6366F1'), Skia.Color('#EC4899')],
 *     null, 0,
 *   ),
 * }
 */
export type ShadowFillStyle =
  | { kind: 'color'; color: string }
  | {
      kind: 'shader';
      factory: (
        width: number,
        height: number,
      ) => import('@shopify/react-native-skia').SkShader;
    };

/**
 * Single shadow layer descriptor.
 * All numeric values are in device-independent points.
 */
export interface ShadowParams {
  /** Fill style: solid color string or shader factory. Default: black @ 10% */
  fillStyle?: ShadowFillStyle;
  /** Gaussian blur radius (in points, Figma-compatible). Default: 24 */
  blurRadius?: number;
  /** Expands the shadow outline beyond element bounds. Default: 4 */
  spread?: number;
  /** Horizontal offset. Default: 0 */
  offsetX?: number;
  /** Vertical offset. Default: 0 */
  offsetY?: number;
  /**
   * Shape override for this specific shadow layer.
   * When undefined, inherits `shape` from the parent `<Shadow>`.
   */
  shape?: ShadowShape;
}

/**
 * Supported shadow shapes.
 */
export type ShadowShape =
  | { kind: 'rect' }
  | { kind: 'roundedRect'; radius: number }
  | { kind: 'circle' }
  | { kind: 'path'; svgPath: string };

/**
 * Props for the `<Shadow>` component.
 */
export interface ShadowProps {
  /** One or more shadow layers. */
  shadows: ShadowParams | ShadowParams[];
  /** Default shape applied to shadows that don't specify their own. Default: rect */
  shape?: ShadowShape;
  /** Explicit component width. If omitted, measured via onLayout. */
  width?: number;
  /** Explicit component height. If omitted, measured via onLayout. */
  height?: number;
  /** RN style for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Content rendered above the shadow. */
  children?: ReactNode;
}
