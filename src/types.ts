import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * A value that can be either static or a Reanimated SharedValue.
 * When static, no reanimated dependency is needed.
 */
export type Animatable<T> = T | { value: T };

/**
 * Fill style for a shadow layer.
 *
 * - `color`: solid color fill. The color string itself can be
 *   a `SharedValue<string>` for animated color transitions.
 * - `shader`: custom Skia shader factory (gradients, etc.)
 */
export type ShadowFillStyle =
    | { kind: 'color'; color: Animatable<string> }
    | { kind: 'shader'; factory: (width: number, height: number) => any };

/**
 * Parameters for a single shadow layer.
 * All numeric values accept `number | SharedValue<number>`.
 */
export interface ShadowParams {
  /** Fill style: solid color or shader factory. Default: black @ 10% */
  fillStyle?: ShadowFillStyle;
  /** Gaussian blur radius (in points, Figma-compatible). Default: 24 */
  blurRadius?: Animatable<number>;
  /** Expands the shadow outline beyond element bounds. Default: 4 */
  spread?: Animatable<number>;
  /** Horizontal offset. Default: 0 */
  offsetX?: Animatable<number>;
  /** Vertical offset. Default: 0 */
  offsetY?: Animatable<number>;
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
    | { kind: 'roundedRect'; radius: Animatable<number> }
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
  /**
   * Maximum canvas padding for animated shadows.
   * When using SharedValue props, the final extent is unknown at render time.
   * Set this large enough to contain the shadow at its maximum animated state.
   * Ignored when all props are static (padding is auto-calculated).
   * Default: undefined (auto-calculate from static values)
   */
  maxCanvasPadding?: number;
  /** RN style for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Content rendered above the shadow. */
  children?: ReactNode;
}
