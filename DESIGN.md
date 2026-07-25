---
name: Clinical Intelligence System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#0051d5'
  on-tertiary: '#ffffff'
  tertiary-container: '#316bf3'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: 18px
  code-icd:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base_padding: 1rem
  compact_padding: 0.75rem
  gutter: 1rem
  margin_edge: 1.5rem
  sidebar_width: 260px
---

## Brand & Style
This design system is engineered for high-stakes clinical environments where information density and cognitive clarity are paramount. The brand personality is authoritative, precise, and technologically advanced, functioning as a reliable partner to medical professionals. 

The aesthetic follows a **Modern Minimalist** approach with a focus on functional hierarchy. It avoids decorative elements in favor of "data-first" layouts. The emotional response is one of calm efficiency and trust, achieved through a sterile but accessible color palette, crisp borders, and rhythmic spacing that facilitates rapid clinical scannability.

## Colors
The palette utilizes a strict **60-30-10 distribution** to maintain clinical focus.
- **Base (60%):** A foundation of Slate-50 for backgrounds to reduce eye strain, with pure white panels to elevate active content. Dividers use Slate-200 for subtle structural definition.
- **Structural (30%):** Slate-900 provides high-contrast legibility for primary text. Deep Teal (#0d9488) is reserved for headers and section-level navigation to anchor the eye.
- **Accents (10%):** Emerald-600 is the "Action Color" for primary CTAs and final approvals. Amber-500 is used exclusively for validation and attention-required states. Soft Blue-600 is the "Intelligence Layer," highlighting AI-generated insights and recommendations.

## Typography
The system employs a dual-font strategy:
- **Inter** handles all UI chrome, prose, and instructional text. It is chosen for its exceptional legibility and neutral tone.
- **JetBrains Mono** is utilized for all alphanumeric ICD-11 codes, laboratory values, and numeric data. Its monospaced nature ensures that columns of numbers align perfectly (tabular-nums), allowing clinicians to spot trends or outliers instantly across patient records.

For mobile constraints, headlines scale down by 15%, while body and data text remain at their base sizes to ensure accessibility in high-pressure environments.

## Layout & Spacing
The layout uses a **Fixed Grid** philosophy with a high-density 12-column system. 
- **The Sidebar:** A fixed 260px Slate-900 navigation bar anchors the left side, providing a permanent high-contrast home for global navigation.
- **Panels:** Content is organized into "Clinical Cards" using 1rem (16px) consistent padding. 
- **Density:** To achieve rapid scannability, vertical rhythm is tight, using 4px increments. Gutters are fixed at 1rem to maximize screen real estate for data tables.
- **Responsive Behavior:** On tablet, the sidebar collapses to icons; on mobile, the layout reflows into a single column with panels stacking vertically and padding reduced to 0.75rem.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than heavy shadows.
- **Level 0 (Background):** Slate-50.
- **Level 1 (Panels):** Pure White with a subtle 1px border (#e2e8f0) and a `shadow-sm` (low-offset, 2px blur, 0.05 opacity).
- **Level 2 (Modals/Popovers):** Higher contrast 1px border with a medium shadow to indicate temporary focus.

This approach creates a flat, professional interface that avoids the "mushiness" of soft shadows, keeping the clinical workspace feeling crisp and organized.

## Shapes
The shape language is conservative and structural. A **Soft (rounded-md)** setting is applied across the system. 
- **Buttons and Inputs:** 0.25rem (4px) corner radius. This provides a modern touch while maintaining the serious, "instrument-like" feel of medical software.
- **Status Badges:** Use a slightly higher 0.5rem radius to distinguish them from interactive buttons.
- **Large Panels:** 0.5rem radius to soften the overall frame of the application.

## Components
- **Buttons:** Primary buttons use Emerald-600 with white text. Secondary buttons use ghost styles with Deep Teal outlines.
- **Clinical Data Tables:** Must use JetBrains Mono for all numeric cells. Header rows use Slate-50 background with Slate-900 bold text.
- **AI Highlights:** Elements surfaced by the AI agent are wrapped in a Soft Blue-50 background with a 1px Soft Blue-600 left-accent border.
- **Status Chips:** Use a "dot + label" pattern. Emerald for "Stable/Approved," Amber for "Review Needed," and Blue for "Processing."
- **Inputs:** 1px Slate-300 borders that transition to Deep Teal on focus. Use JetBrains Mono for inputs intended for numeric medical values.
- **ICD-11 Tags:** Small, monospaced capsules with Slate-100 backgrounds to make them identifiable as standardized codes within free-text notes.