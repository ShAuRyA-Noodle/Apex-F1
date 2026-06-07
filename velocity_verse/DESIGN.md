---
name: Velocity & Verse
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2b2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c8c6c5'
  primary: '#c8c6c5'
  on-primary: '#313030'
  primary-container: '#0f0f0f'
  on-primary-container: '#7d7b7b'
  inverse-primary: '#5f5e5e'
  secondary: '#ffb4a8'
  on-secondary: '#680200'
  secondary-container: '#e00600'
  on-secondary-container: '#fff1ef'
  tertiary: '#c9c6c0'
  on-tertiary: '#31312c'
  tertiary-container: '#0f0f0b'
  on-tertiary-container: '#7d7c76'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410100'
  on-secondary-fixed-variant: '#930300'
  tertiary-fixed: '#e5e2db'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
  carbon-black: '#0F0F0F'
  telemetry-red: '#E10600'
  prestige-parchment: '#F4F1EA'
  asphalt-gray: '#262626'
  stave-line: rgba(255, 255, 255, 0.15)
typography:
  display-xl:
    fontFamily: anybody
    fontSize: 84px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  display-xl-mobile:
    fontFamily: anybody
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
  headline-lg:
    fontFamily: anybody
    fontSize: 42px
    fontWeight: '700'
    lineHeight: '1.2'
  editorial-serif:
    fontFamily: ebGaramond
    fontSize: 32px
    fontWeight: '300'
    lineHeight: '1.4'
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.1em
spacing:
  grid-margin: 4rem
  grid-gutter: 1.5rem
  stave-gap: 2rem
  safe-area: 10vw
---

## Brand & Style

The design system is built on the narrative of **Engineered Elegance**. It merges the high-velocity, precision-engineered world of Formula 1 with the cinematic, prestigious, and archival storytelling found in world-class musical theatre. The aesthetic is a hybrid of **Minimalism** and **Modern Theatricality**, characterized by heavy white space, high-contrast typography, and subtle atmospheric textures.

The target audience is the "Elite Enthusiast"—someone who values technical precision as much as the human drama of the sport. Every interaction should feel like a deliberate, mechanical movement, evoking an emotional response of being "backstage" at a high-stakes, multi-million dollar performance.

## Colors

The palette is anchored by **Carbon Black**, providing a deep, high-tech void that mimics both an orchestral pit and an F1 monocoque. **Telemetry Red** is used exclusively as a high-impact accent for critical data, CTA highlights, and "Live" indicators.

To bridge the gap between "Tech" and "Archive," a **Prestige Parchment** (tertiary) is used for subtle background overlays or text-heavy editorial sections. This color should have a very fine noise texture applied to it to simulate paper grain or lightweight carbon composite. Default color mode is **Dark**, focusing on cinematic depth.

## Typography

The typography system creates a "Wide/Narrow" visual tension. **Anybody** (the headline font) is used in its widest variations for titles to mimic the aggressive stance of F1 logos. This is contrasted with **EB Garamond** (the prestige serif) for pull-quotes and editorial headers, providing an archival, Alan Menken-esque sophistication.

**Hanken Grotesk** serves as the primary reading font for its clarity and contemporary feel. All technical data, timestamps, and live telemetry use **JetBrains Mono** to maintain a sense of digital precision.

## Layout & Spacing

This design system uses an **Asymmetrical Fluid Grid**. The layout is defined by "Stave-like dividers"—thin, horizontal lines spanning the full width of the container, spaced at regular `stave-gap` intervals to organize content like sheet music.

**Layout Rules:**
- **Desktop:** 12-column grid with alternating white-space columns. Content should often be "clipped" or offset from the grid to create a sense of motion.
- **Mobile:** Single column with heavy 2rem side margins.
- **Dividers:** Use 0.5px lines in `stave-line` color. Occasionally break these lines with "live data" tickers.
- **Clipped Corners:** Use a 45-degree chamfer on image containers and cards to simulate mechanical aerospace components.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Atmospheric Textures** rather than shadows. 

1.  **Background Layer:** Carbon Black with a very subtle 2% noise grain.
2.  **Middle Layer:** Parchment-colored editorial blocks or translucent "Asphalt Gray" overlays for data panels.
3.  **Backdrop Blurs:** Use heavy blurs (40px+) for navigation menus to create a "Frosted Carbon" effect.
4.  **No Shadows:** Avoid traditional box shadows. Use high-contrast borders (1px) in `stave-line` or `telemetry-red` to define active surfaces.

## Shapes

The design system utilizes **Sharp (0)** roundedness to maintain an aggressive, technical edge. Instead of curves, use **diagonal chamfers** (clipped corners) at 8px increments to imply aerodynamics. Elements should feel "machined" rather than "molded."

## Components

### Buttons
- **Primary:** Rectangular, sharp corners. Solid Carbon Black background with a Telemetry Red right-border (2px). Text is `data-mono`.
- **Secondary:** Transparent background with a 1px `stave-line` border. On hover, the border slides to Telemetry Red.

### Cards (The "Archive" Card)
- Cards use the asymmetric grid. One corner (top-right or bottom-left) is always chamfered.
- Large typography overlaps the image boundaries, creating a cinematic editorial look.

### Live Telemetry Integrated UI
- Small sparklines (line charts without axes) should be embedded into list items to show performance trends.
- Use `telemetry-red` for active data pulses.

### Dividers (Staves)
- Horizontal rules that act as the structural spine of the site. They are not just separators but can house "Live" labels or timestamps in `data-mono`.

### Form Fields
- Minimalist inputs. Only a bottom border (1px `stave-line`). On focus, the border turns Telemetry Red and expands 2px upwards.