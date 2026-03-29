# react-native-skia-box-shadow

CSS-style box shadows for React Native — blur, spread, offset, colors, gradients, and arbitrary shapes.

Powered by [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/).

## 👀 Preview
![Shadow Preview](media/preview.gif)

## Features

- **Blur** — Gaussian blur with no sigma limit (uses Skia ImageFilter)
- **Spread** — expand or shrink shadow beyond element bounds
- **Offset** — horizontal and vertical translation
- **Colors & Gradients** — solid colors or Skia shader fills (linear, radial, sweep)
- **Shapes** — rect, roundedRect, circle, or arbitrary SVG path
- **Multi-layer** — stack multiple shadow layers, just like in Figma
- **Animated** — 60fps animations via Reanimated SharedValues (optional)
- **Cross-platform** — iOS & Android

## Installation

```bash
npm install react-native-skia-box-shadow @shopify/react-native-skia
```

> **Peer dependency**: `@shopify/react-native-skia` >= 1.0.0
>
> For animated shadows: `react-native-reanimated` >= 3.0.0 (optional)

## Usage

### Simple shadow

```tsx
import { Shadow } from 'react-native-skia-box-shadow';

<Shadow
  shadows={{
    fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.12)' },
    blurRadius: 16,
    offsetY: 4,
  }}
  shape={{ kind: 'roundedRect', radius: 16 }}
>
  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
    <Text>Card with shadow</Text>
  </View>
</Shadow>
```

### Animated shadow

```tsx
import { Shadow } from 'react-native-skia-box-shadow';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const MyCard = () => {
  const blur = useSharedValue(16);
  const offsetY = useSharedValue(4);
  const spread = useSharedValue(0);

  const onPressIn = () => {
    blur.value = withSpring(32);
    offsetY.value = withSpring(12);
    spread.value = withSpring(4);
  };

  const onPressOut = () => {
    blur.value = withSpring(16);
    offsetY.value = withSpring(4);
    spread.value = withSpring(0);
  };

  return (
    <Shadow
      shadows={{
        fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.15)' },
        blurRadius: blur,
        offsetY,
        spread,
      }}
      shape={{ kind: 'roundedRect', radius: 16 }}
    >
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.card}>
          <Text>Press me</Text>
        </View>
      </Pressable>
    </Shadow>
  );
};
```

### Multiple shadow layers

```tsx
<Shadow
  shadows={[
    { blurRadius: 2, offsetY: 1, fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.04)' } },
    { blurRadius: 6, offsetY: 3, fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.06)' } },
    { blurRadius: 24, offsetY: 12, fillStyle: { kind: 'color', color: 'rgba(0,0,0,0.10)' } },
  ]}
  shape={{ kind: 'roundedRect', radius: 12 }}
>
  {children}
</Shadow>
```

### Colored / gradient shadow

```tsx
import { Skia } from '@shopify/react-native-skia';

<Shadow
  shadows={{
    fillStyle: {
      kind: 'shader',
      factory: (w, h) =>
        Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: w, y: h },
          [Skia.Color('#6366F1'), Skia.Color('#EC4899')],
          null,
          0,
        ),
    },
    blurRadius: 24,
    offsetY: 8,
  }}
  shape={{ kind: 'roundedRect', radius: 20 }}
>
  {children}
</Shadow>
```

### Circle shape

```tsx
<Shadow
  shadows={{ blurRadius: 20, spread: 4, fillStyle: { kind: 'color', color: 'rgba(236,72,153,0.35)' } }}
  shape={{ kind: 'circle' }}
>
  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EC4899' }} />
</Shadow>
```

## API

### `<Shadow>` Props

| Prop       | Type                              | Default             | Description                            |
| ---------- | --------------------------------- | ------------------- | -------------------------------------- |
| `shadows`  | `ShadowParams \| ShadowParams[]` | required            | One or more shadow layer descriptors   |
| `shape`    | `ShadowShape`                     | `{ kind: 'rect' }`  | Default shape for all shadow layers    |
| `width`    | `number`                          | auto (onLayout)     | Explicit width                         |
| `height`   | `number`                          | auto (onLayout)     | Explicit height                        |
| `style`    | `ViewStyle`                       | —                   | Style for the outer container          |
| `children` | `ReactNode`                       | —                   | Content rendered above the shadow      |

### `ShadowParams`

| Prop         | Type              | Default        | Description                    |
| ------------ | ----------------- | -------------- | ------------------------------ |
| `fillStyle`  | `ShadowFillStyle` | black @ 10%    | Shadow color or shader         |
| `blurRadius` | `number`          | `24`           | Gaussian blur radius           |
| `spread`     | `number`          | `4`            | Expand shadow beyond bounds    |
| `offsetX`    | `number`          | `0`            | Horizontal offset              |
| `offsetY`    | `number`          | `0`            | Vertical offset                |
| `shape`      | `ShadowShape`     | inherits       | Per-layer shape override       |

### `ShadowShape`

| Kind          | Props      | Description            |
| ------------- | ---------- | ---------------------- |
| `rect`        | —          | Rectangle              |
| `roundedRect` | `radius`   | Rounded rectangle      |
| `circle`      | —          | Circle                 |
| `path`        | `svgPath`  | Arbitrary SVG path     |

### `ShadowFillStyle`

| Kind     | Props               | Description                        |
| -------- | ------------------- | ---------------------------------- |
| `color`  | `color: string`     | Solid color (any CSS color string) |
| `shader` | `factory: Function` | `(width, height) => SkShader`      |

## How it works

The component renders a Skia `<Canvas>` behind your children. Each shadow layer draws a shape (matching your content's shape) with a Gaussian blur applied as an ImageFilter. The canvas is automatically expanded to prevent clipping.

This is a React Native port of the Compose Multiplatform library [`vasyl-stetsiuk/shadow`](https://github.com/vasyl-stetsiuk/shadow).

## License

MIT © [Vasyl Stetsiuk](https://stetsiuk.dev)
