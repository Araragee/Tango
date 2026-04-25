---
name: Tango Retro Digital
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#554243'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#887273'
  outline-variant: '#dac0c1'
  surface-tint: '#9b404d'
  primary: '#983e4b'
  on-primary: '#ffffff'
  primary-container: '#b75662'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b9'
  secondary: '#506354'
  on-secondary: '#ffffff'
  secondary-container: '#d0e5d2'
  on-secondary-container: '#546758'
  tertiary: '#7a5155'
  on-tertiary: '#ffffff'
  tertiary-container: '#95696d'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b9'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#7d2937'
  secondary-fixed: '#d3e8d5'
  secondary-fixed-dim: '#b7ccb9'
  on-secondary-fixed: '#0e1f13'
  on-secondary-fixed-variant: '#394b3d'
  tertiary-fixed: '#ffdadc'
  tertiary-fixed-dim: '#eeb9bd'
  on-tertiary-fixed: '#301216'
  on-tertiary-fixed-variant: '#623c40'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  margin: 20px
---

## Brand & Style

This design system is built upon the concept of "Romantic Pixelation"—a blend of 8-bit nostalgia and modern editorial refinement. It evokes a cozy, safe, and intimate digital environment, moving away from the cold glassiness of contemporary tech toward the tactile warmth of the early web and vintage gaming.

The brand personality of Tango is expressive, sentimental, and rhythmic. It targets a generation that finds comfort in the "lo-fi" aesthetic while demanding high-quality interaction. The visual style is a hybrid of **Retro-Brutalism** and **Tactile Minimalism**, utilizing hard pixelated edges and dithered gradients to create a sense of physical presence and history within a flat digital space.

## Colors

The palette is centered on a high-contrast yet soft relationship between warm organic tones and deep botanical accents. 

- **Primary Rosy Red (#D8707C):** Used for call-to-action elements, brand highlights, and romantic focal points.
- **Deep Earthy Green (#4A5D4E):** Reserved for accents, success states, and providing grounding contrast against the lighter backgrounds.
- **Cream Foundation (#FAF7F2):** The primary surface color, replacing pure white to reduce eye strain and enhance the vintage "paper" feel.
- **Dithered Shadows:** Rather than using alpha-transparent grays, depth is suggested through stippled or dithered patterns using the primary and secondary colors at low density.

## Typography

This design system utilizes **Space Grotesk** across all levels to bridge the gap between technical precision and retro character. The font's eccentric terminals and geometric construction mimic the "chunky" feel of pixel-rendered fonts while remaining perfectly legible at all sizes.

Headlines should be set with tight tracking and heavy weights to create "blocks" of text that anchor the layout. Body text maintains a generous line height to preserve the "cozy" readability of the interface. Label styles should be used for metadata and button text, often in uppercase to reinforce the UI's structural, grid-based nature.

## Layout & Spacing

The layout philosophy is strictly grid-bound, mimicking the constraints of low-resolution displays. A **Fixed Grid** model is preferred for core content containers to maintain a "boxed-in" retro feel.

All spacing must be increments of 4px to ensure that pixel borders and icons align perfectly with the spatial rhythm. Backgrounds should feature a subtle 8px or 16px dot-grid pattern or a light linen texture to break up large cream surfaces. Elements should feel "snapped" to the grid, avoiding fluid percentages where a fixed pixel value can maintain the structural integrity of the pixel-art aesthetic.

## Elevation & Depth

This design system rejects blurred shadows in favor of **Bold Borders** and **Hard Offsets**. 

- **Level 0 (Base):** Flat on the cream background, defined by a 1px solid border.
- **Level 1 (Raised):** A 2px solid border with a "hard" 4px offset shadow (no blur). This shadow should use the Primary Rosy Red or Deep Green depending on the component's context.
- **Interactive Depth:** When pressed, buttons and cards should lose their offset shadow and shift 2px down and to the right, simulating a physical "click" into the page.
- **Dithering:** For larger surfaces like modals, use a 50% checkerboard "dither" pattern at the edges to transition between depths, rather than a gradient.

## Shapes

In keeping with the pixelized aesthetic, the shape language is strictly **Sharp (0px)**. All containers, buttons, and input fields must have square corners. 

To simulate "roundedness" in a retro fashion, use "stepped" corners where a single pixel is removed from the absolute corner at a 45-degree angle, but standard CSS border-radius is never used. This creates a handcrafted, digitized feel that aligns with pixel-art icon sets.

## Components

### Buttons
Buttons are chunky and high-contrast. They feature a 2px solid black or deep green border and a thick hard shadow in Rosy Red. Text is centered and set in `label-sm` or `body-md` bold.

### Progress Bars
Progress bars utilize a "dithered fill" technique. The background of the bar is a 1px border frame, and the "progress" is represented by a solid block of color followed by a 2x2 pixel checkerboard pattern to show the leading edge of the loading state.

### Cards
Cards are the primary organizational unit. They use the cream background but are distinguished by 1px pixelated borders. For featured content, cards can have a "header bar" in a contrasting color (Green or Red) with the title set in the `label-sm` style.

### Inputs & Selects
Text fields should appear "sunken." This is achieved by using a 2px top and left border in a slightly darker shade of cream, and a 1px bottom and right border in a lighter shade, creating an inverted-shadow effect common in 90s OS design.

### Pixel-Art Icons
All iconography must be custom pixel-art assets, rendered on a 16x16 or 24x24 grid. Line weights in icons should match the 1px or 2px border weights of the UI elements to ensure visual cohesion.

### Chips
Small, flat tags used for categorization. They use a 1px solid border and no shadow, appearing "tacked" onto the surface.