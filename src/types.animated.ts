import type { SharedValue } from 'react-native-reanimated';
import type { ReactNode } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import type { ShadowShape, ShadowFillStyle } from './types';

/**
 * A value that can be either static or a Reanimated SharedValue.
 * When animated, Skia reads it directly on the UI thread — no React re-renders.
 */
export type Animatable<T> = T | SharedValue<T>;

/**
 * Animated shadow layer descriptor.
 * Any numeric prop can be a SharedValue for 60fps animation.
 */
export interface AnimatedShadowParams {
  /** Fill style (not animatable — use opacity in color for fade effects) */
  fillStyle?: ShadowFillStyle;
  /** Gaussian blur radius. Animatable. Default: 24 */
  blurRadius?: Animatable<number>;
  /** Expands the shadow outline beyond element bounds. Animatable. Default: 4 */
  spread?: Animatable<number>;
  /** Horizontal offset. Animatable. Default: 0 */
  offsetX?: Animatable<number>;
  /** Vertical offset. Animatable. Default: 0 */
  offsetY?: Animatable<number>;
  /** Shape override for this layer */
  shape?: ShadowShape;
}

/**
 * Props for the `<AnimatedShadow>` component.
 */
export interface AnimatedShadowProps {
  /** One or more animated shadow layers */
  shadows: AnimatedShadowParams | AnimatedShadowParams[];
  /** Default shape. Default: rect */
  shape?: ShadowShape;
  /** Explicit width */
  width?: number;
  /** Explicit height */
  height?: number;
  /**
   * Maximum canvas padding to accommodate animated values.
   * Since blur/spread/offset may change at runtime, set this to
   * the largest extent the shadow can reach.
   * Default: 120
   */
  maxCanvasPadding?: number;
  /** RN style for the outer container */
  style?: StyleProp<ViewStyle>;
  /** Content rendered above the shadow */
  children?: ReactNode;
}
