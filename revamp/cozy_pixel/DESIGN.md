---
name: Cozy Pixel
colors:
  surface: '#fbf9f1'
  surface-dim: '#dcdad2'
  surface-bright: '#fbf9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4ec'
  surface-container: '#f0eee6'
  surface-container-high: '#eae8e0'
  surface-container-highest: '#e4e3db'
  on-surface: '#1b1c17'
  on-surface-variant: '#554243'
  inverse-surface: '#30312c'
  inverse-on-surface: '#f3f1e9'
  outline: '#887273'
  outline-variant: '#dac0c1'
  surface-tint: '#9b404d'
  primary: '#983e4b'
  on-primary: '#ffffff'
  primary-container: '#b75662'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b9'
  secondary: '#77583f'
  on-secondary: '#ffffff'
  secondary-container: '#ffd5b6'
  on-secondary-container: '#7a5a42'
  tertiary: '#94442e'
  on-tertiary: '#ffffff'
  tertiary-container: '#b35c44'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b9'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#7d2937'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#e7bfa0'
  on-secondary-fixed: '#2c1604'
  on-secondary-fixed-variant: '#5d412a'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a1'
  on-tertiary-fixed: '#3b0900'
  on-tertiary-fixed-variant: '#79301b'
  background: '#fbf9f1'
  on-background: '#1b1c17'
  surface-variant: '#e4e3db'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The design system is centered on "digital intimacy"—a blend of 8-bit nostalgia and modern warmth. It targets users seeking a personal, low-pressure environment, moving away from sleek corporate minimalism toward a "hand-crafted" digital aesthetic.

The style is a hybrid of **Retro-Pixel** and **Tactile Skeuomorphism**. It utilizes pixel-art geometry to provide structure while employing dithered gradients and soft, rosy tones to ensure the interface feels organic rather than cold. The emotional response should be one of "digital comfort," reminiscent of a cherished handheld game or a personal diary.

## Colors

The palette is anchored in a sun-drenched, "warm-film" spectrum. 

- **Warm Rose (Primary):** Used for primary actions and key brand moments. 
- **Soft Peach (Secondary):** Used for secondary highlights and gentle UI accents.
- **Cream (Neutral):** The base canvas color, replacing pure white to reduce eye strain and enhance the retro feel.
- **Muted Terracotta (Tertiary):** Used for deep accents, borders, and high-contrast text elements.

Gradient transitions should utilize a "dithered" pattern (checkerboard pixel transparency) rather than smooth linear blurs to maintain the pixel-art integrity.

## Typography

This design system utilizes a high-contrast typographic pairing. 

**Headings** require a pixelated treatment. While the tokens specify *Space Grotesk* as the geometric foundation, these should ideally be rendered using a pixel-font face or via a CSS `image-rendering: pixelated` filter to achieve a blocky, retro appearance. 

**Body Text** uses *Plus Jakarta Sans*. Its soft, rounded terminals provide a friendly and legible counterpoint to the sharp edges of the pixelated headlines. All long-form text should be set in this sans-serif to ensure accessibility and warmth.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy, evoking the contained feel of vintage software windows. The system is built on a 4px/8px pixel grid to ensure that all elements align perfectly with the "pixel-art" aesthetic.

- **Containers:** Most content resides in "Window" cards with fixed maximum widths.
- **Rhythm:** Use generous internal padding (24px+) within components to maintain the "cozy" and airy feel, preventing the pixel elements from appearing too cramped or "crunchy."

## Elevation & Depth

Depth in this design system is created through physical metaphors rather than realistic light physics.

- **Chunky Shadows:** Use hard-edged, non-blurred shadows (often 2px or 4px offsets) in a darker shade of the background color (e.g., Muted Terracotta at 20% opacity).
- **Dithered Layers:** Semi-transparent overlays should use a 50% "checkerboard" dither pattern rather than a standard alpha transparency.
- **Inner Bevels:** Buttons and input fields use a 1px highlight on the top/left and a 2px "shadow" on the bottom/right to create a tactile, pressed-plastic effect.

## Shapes

The shape language is "Softly Blocky." While the core of the aesthetic is pixel-based, we avoid sharp 90-degree corners for main containers to keep the "cozy" vibe.

- **Pixel-Art Borders:** All primary borders should be 2px thick. Instead of smooth rounded corners, use "stepped" corners (a 2px by 2px notch) to mimic hand-drawn pixel art.
- **Soft Elements:** Inner components like chips and tags use a slightly more rounded 0.25rem radius to distinguish them from the more structural "window" containers.

## Components

- **Chunky Buttons:** These are the primary interactive elements. They feature a 2px solid border, a subtle inner highlight, and a hard "drop shadow." On hover, the button should shift 1px down and right; on active (click), it should shift 2px, "covering" its own shadow to simulate a physical press.
- **Pixel Cards:** Use a Cream background with a 2px Muted Terracotta border. The "header" of the card is often a solid block of Warm Rose with white pixelated text.
- **Dithered Progress Bars:** Use a Soft Peach background for the track and a dithered Warm Rose gradient for the fill.
- **Input Fields:** Recessed into the page using an "inner shadow" (a darker terracotta line on the top and left) to make them feel like physical slots.
- **Dithered Tooltips:** Small pop-ups that use a dithered transparency effect on their edges to soften their appearance against the background.