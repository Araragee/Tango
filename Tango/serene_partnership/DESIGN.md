---
name: Serene Partnership
colors:
  surface: '#f8f9ff'
  surface-dim: '#d7dae1'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4fb'
  surface-container: '#ebeef5'
  surface-container-high: '#e5e8ef'
  surface-container-highest: '#dfe2ea'
  on-surface: '#181c21'
  on-surface-variant: '#42474d'
  inverse-surface: '#2d3136'
  inverse-on-surface: '#eef1f8'
  outline: '#72777e'
  outline-variant: '#c2c7ce'
  surface-tint: '#3e6280'
  primary: '#3c5f7d'
  on-primary: '#ffffff'
  primary-container: '#557897'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a7caed'
  secondary: '#45645e'
  on-secondary: '#ffffff'
  secondary-container: '#c7eae1'
  on-secondary-container: '#4b6a63'
  tertiary: '#5d5c58'
  on-tertiary: '#ffffff'
  tertiary-container: '#767471'
  on-tertiary-container: '#fcffe3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#a7caed'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#254a67'
  secondary-fixed: '#c7eae1'
  secondary-fixed-dim: '#accec5'
  on-secondary-fixed: '#00201b'
  on-secondary-fixed-variant: '#2d4c46'
  tertiary-fixed: '#e5e2dd'
  tertiary-fixed-dim: '#c9c6c2'
  on-tertiary-fixed: '#1c1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#f8f9ff'
  on-background: '#181c21'
  surface-variant: '#dfe2ea'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 40px
  edge-margin: 20px
  touch-target: 48px
---

## Brand & Style

This design system is built on the philosophy of **Calm Tech**, prioritizing the mental space of the users over loud notifications or aggressive visuals. The brand personality is supportive, dependable, and quietly sophisticated, acting as a background facilitator for partner connections rather than a source of digital noise.

The design style is a hybrid of **Minimalism** and **Tactile UI**. It utilizes expansive whitespace and a restrained palette to reduce cognitive load, while employing subtle physical metaphors—soft shadows and pill-shaped interactive zones—to make the interface feel approachable and "clickable." The goal is an emotional response of security and ease, ensuring the app feels like a digital sanctuary for shared information.

## Colors

The color strategy uses a low-vibrancy palette to maintain the "Calm Tech" aesthetic.

*   **Primary (Soft Blue):** Used for primary actions and active states. It suggests stability and clarity.
*   **Secondary (Muted Green):** Reserved for growth-oriented features, positive confirmations, and secondary highlights.
*   **Tertiary (Warm Gray/Cream):** The foundational surface color, replacing harsh whites to reduce eye strain.
*   **Neutral (Slate):** Used for text and icons to ensure high legibility without the starkness of pure black.

Backgrounds should primarily use the tertiary warm gray, with components sitting on top in pure white to create subtle separation.

## Typography

This design system utilizes a dual-font approach. **Manrope** provides a modern, slightly rounded character for headlines, reinforcing the friendly brand voice. **Inter** is used for all functional text, chosen for its exceptional legibility on mobile screens at smaller sizes.

Hierarchy is established through weight and scale rather than color. Important information uses the Slate neutral, while secondary metadata should drop to a 60% opacity of the neutral color. Avoid using more than three levels of information in a single view to maintain the minimalist intent.

## Layout & Spacing

This design system employs a **Fluid Grid** model optimized for mobile-first constraints. A standard 4-column grid is used for mobile portrait views, with a 20px outer margin to keep content away from the bezel.

The spacing rhythm is based on an **8px linear scale**. To emphasize the "Calm" aspect, vertical rhythm should lean toward generous padding (`lg` and `xl` units) between major content sections to allow the design to breathe. All interactive elements must adhere to a minimum 48px touch-target zone to ensure accessibility and ease of use while on the go.

## Elevation & Depth

Visual hierarchy is communicated through **Ambient Shadows** and **Tonal Layering**. 

Instead of heavy black shadows, this system uses "Tinted Soft Shadows"—shadows that inherit a small percentage of the primary blue or secondary green to feel more natural and integrated. 
*   **Surface Level 0:** The main background (Warm Gray).
*   **Surface Level 1:** Cards and input fields (Pure White) with a very soft, diffused shadow (15% opacity, 20px blur).
*   **Surface Level 2:** Floating Action Buttons or active Modals, using a slightly deeper shadow to indicate they are closest to the user.

Glassmorphism is used sparingly, specifically for the bottom navigation bar, using a 20px backdrop blur to allow content to scroll behind it without losing legibility.

## Shapes

The shape language is defined by **Rounded** geometry. There are no sharp corners in this design system. 

*   **Standard Components:** Buttons and Cards use a 0.5rem (8px) radius.
*   **Containers:** Larger layout sections and Bottom Sheets use a 1.5rem (24px) radius on top corners to create a "container" feel that is welcoming.
*   **Interactive Indicators:** Small indicators (like notification dots or active state pills) are fully rounded (Pill-shaped).

This consistent roundness removes the "edge" from the technology, making the interface feel softer and more human.

## Components

**Buttons**
Primary buttons should be pill-shaped with a subtle gradient of the Primary color. Secondary buttons use a "Ghost" style with a 1px border in a muted tone. All buttons must have a subtle "press" animation that scales the element down to 98% to provide tactile feedback.

**Bottom Navigation**
The primary navigation anchor. It should feature 4-5 icons with clear labels in the `label-caps` style. Use an active state indicator that is a soft-colored pill behind the icon, rather than just a color change.

**Cards**
Cards are the primary container for shared data. They should have no visible border, relying instead on the white fill and soft ambient shadow to separate them from the warm gray background.

**Inputs & Selection**
Input fields should be large (56px height) with the label floating inside the top margin when active. Checkboxes and Radios should be oversized to accommodate easy thumb-tapping, using the Primary color for the checked state.

**Chips**
Small, pill-shaped tags used for filtering or status. They should use the Secondary (Muted Green) or a light version of the Primary color to distinguish categories without overwhelming the layout.