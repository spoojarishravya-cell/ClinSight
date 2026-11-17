---
name: ClinSight Diagnostic System
colors:
  surface: '#f7fafe'
  surface-dim: '#d7dade'
  surface-bright: '#f7fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f8'
  surface-container: '#ebeef2'
  surface-container-high: '#e5e8ec'
  surface-container-highest: '#e0e3e7'
  on-surface: '#181c1f'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eef1f5'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#4d5f7b'
  primary: '#000205'
  on-primary: '#ffffff'
  primary-container: '#071d35'
  on-primary-container: '#7386a3'
  inverse-primary: '#b4c8e7'
  secondary: '#006a67'
  on-secondary: '#ffffff'
  secondary-container: '#73f7f2'
  on-secondary-container: '#00706e'
  tertiary: '#000203'
  on-tertiary: '#ffffff'
  tertiary-container: '#002122'
  on-tertiary-container: '#009496'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e3ff'
  primary-fixed-dim: '#b4c8e7'
  on-primary-fixed: '#061c34'
  on-primary-fixed-variant: '#354862'
  secondary-fixed: '#73f7f2'
  secondary-fixed-dim: '#52dad5'
  on-secondary-fixed: '#00201f'
  on-secondary-fixed-variant: '#00504e'
  tertiary-fixed: '#72f6f9'
  tertiary-fixed-dim: '#50d9dc'
  on-tertiary-fixed: '#002020'
  on-tertiary-fixed-variant: '#004f51'
  background: '#f7fafe'
  on-background: '#181c1f'
  surface-variant: '#e0e3e7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: '0'
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
  metric-num:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies authoritative intelligence, clinical precision, and urgent clarity. Designed for clinicians, diagnosticians, and high-intensity acute care teams, it eliminates cognitive friction through structural restraint and data legibility.

The design movement combines **Modern Corporate Precision** with **Clinical Glassmorphism/Tactile Overlay**. The aesthetic is clean, calibrated, and unapologetically technical without feeling cold or hostile. Surfaces feel crisp, clinical, and reassuringly stable, using razor-sharp micro-borders and deliberate contrast ratios to support rapid visual scanning under fatigue and ambient hospital lighting.

## Colors
The palette balances executive clinical authority with vibrant diagnostic indicators:

- **Primary (`#071D35`)**: Deep Navy Blue grounds the layout, used for primary navigation, deep-tier structural headers, key action states, and high-emphasis typography.
- **Secondary (`#19B6B2`)**: Medical Teal serves as the system's operational heartbeat—signifying confirmed clinical insights, verified AI conclusions, affirmative triggers, and active patient chart states.
- **Tertiary (`#55DDE0`)**: Electric Cyan highlights predictive AI markers, machine-generated anomalies, confidence scores, and real-time processing streams.
- **Neutral Surface (`#F4F7FB`)**: A calibrated clinical slate/blue-gray canvas that mitigates screen glare on bedside tablets and diagnostic monitors.
- **Pure White (`#FFFFFF`)**: Strictly reserved for elevated operational cards, focus modules, and high-priority patient documentation panels.
- **Structural Stroke (`#E2E8F0`)**: Low-contrast perimeter boundary defining data nodes and diagnostic matrices without visual noise.

### Functional Alerts
- **Critical Risk**: `#DC2626`
- **Guarded / Warning**: `#F59E0B`
- **Stable / Normal**: `#0D9488`

## Typography
The pairing combines **Plus Jakarta Sans** for structural headlines with **Inter** for clinical dense content and reading ergonomics.

- **Tabular Figures (`tnum`)**: All numeric indicators, vitals metrics, AI confidence thresholds, and dosage rates enforce OpenType `font-feature-settings: "tnum" 1, "cv05" 1`. This prevents layout shifts during live telemetry and maintains vertical alignment across patient comparison charts.
- **Metric Scale**: `metric-num` is specialized for real-time biometrics, lab values, and diagnostic percentages.
- **Hierarchy Hierarchy**: Labels and micro-indicators feature high letter-spacing and uppercase styling to ensure immediate discernibility in emergency UI states.

## Layout & Spacing
The layout model employs a fluid 12-column grid on desktop/workstations transitioning to an 8-column layout on clinical tablets and a 4-column column on mobile devices.

### Breakpoints & Adaptations
- **Desktop (1440px+)**: 12 columns, `margin`: 2.5rem, `gutter`: 1.5rem. Supports simultaneous tri-panel clinical views: patient history tree (col 1–3), primary diagnostic workspace (col 4–9), and AI inference sidebar (col 10–12).
- **Tablet / Workstation on Wheels (768px – 1439px)**: 8 columns, `margin`: 1.5rem, `gutter`: 1rem. The AI inference sidebar becomes a collapsible drawer; vitals collapse into horizontally scrollable metric chains.
- **Mobile (320px – 767px)**: 4 columns, `margin`: 1rem, `gutter`: 0.75rem. Stacks content sequentially, with fixed critical bottom alert zones for abnormal vitals.

Grid density favors rapid horizontal scannability over long vertical scrolling. Margins and component gutters are unyielding to preserve clinical focus and prevent accidental touch target overlap.

## Elevation & Depth
Elevation is handled via **Tonal Stacking** paired with **Low-Contrast Micro-Borders** and **Subtle Diagnostic Ambient Shadows**. Excessive drop shadows are prohibited to maintain clean chart borders.

- **Level 0 (Canvas Base)**: `#F4F7FB`. The clinical foundation where background telemetry resides.
- **Level 1 (Patient Modules & Chart Cards)**: `#FFFFFF` surface backed by a 1px solid border in `#E2E8F0` and an ambient shadow: `box-shadow: 0 1px 3px 0 rgba(7, 29, 53, 0.04), 0 1px 2px -1px rgba(7, 29, 53, 0.02)`.
- **Level 2 (Active Diagnostic Nodes & Hovered Insights)**: `#FFFFFF` surface with micro-accent edge: 1px border `#19B6B2` (or `#55DDE0`), accompanied by a soft diagnostic glow: `box-shadow: 0 8px 16px -4px rgba(7, 29, 53, 0.08), 0 2px 4px -2px rgba(25, 182, 178, 0.06)`.
- **Level 3 (Diagnostic Drawers, Overlays & Dose Calculators)**: `#FFFFFF` overlay flanked by a frosted clinical backdrop blur (`backdrop-filter: blur(12px)`) and a structured shadow: `box-shadow: 0 20px 25px -5px rgba(7, 29, 53, 0.12), 0 8px 10px -6px rgba(7, 29, 53, 0.06)`.

## Shapes
A controlled, soft geometry (`roundedness: 1`) is applied uniformly. Clinical environments require structure, order, and efficient screen real estate utilization:

- **Base Components (Inputs, Buttons, Badges, Table Rows)**: `0.25rem` (4px). Clean, precise corners communicate stability and enterprise rigor.
- **Cards, Panels & Data Containers (`rounded-lg`)**: `0.5rem` (8px). Softened containment keeps high-density screens organized without wasting edge margin pixels.
- **Clinical Modals & Flyout Sheets (`rounded-xl`)**: `0.75rem` (12px). Applied strictly to root overlays to define them against underlying telemetry.
- **Pills**: Strictly reserved for AI confidence ratings, status chips, and triage priority tags to differentiate taxonomy from actionable square-cornered UI.

## Components

### Buttons
- **Primary Action (Confirm Diagnosis, Order Lab)**: Background `#071D35`, text `#FFFFFF`, 4px border-radius, font-weight 600. Focus ring: 2px offset `#55DDE0`.
- **AI Assist / Action (Generate Differential, Run CDS)**: Background `#19B6B2`, text `#071D35`, hover shifts to `#55DDE0` with subtle ambient teal glow.
- **Secondary / Ghost**: Background transparent, border 1px solid `#E2E8F0`, text `#071D35`, hover background `#F4F7FB`.
- **Destructive (Override Alert)**: Outline `#DC2626`, text `#DC2626`, hover background `#FEF2F2`.

### Diagnostic Chips & Badges
- **Confidence Score Pill**: Background `#E6FFFA`, border 1px solid `#19B6B2`, text `#071D35`, typography `label-sm` with tabular numbers (e.g., `98.4% Match`).
- **Triage Level**: High-contrast, micro-pill indicators utilizing semantic tokens with matching 8% opacity background washes.

### Data Tables & Lists
- Crisp 1px `#E2E8F0` separators. Alternate zebra striping using `#F4F7FB` at 50% opacity.
- Row padding: `space-sm` vertically for high density, `space-md` horizontally.
- All numbers align right using `metric-num` or `body-md` with `tnum` activated.

### Input Fields & Selectors
- Background `#FFFFFF`, 1px border `#E2E8F0`, 4px corner radius.
- Active/Focused state: Border `#19B6B2` with a 3px ring of `#55DDE0` at 20% opacity.
- Clinical unit append labels (e.g., `mg/dL`, `mmHg`) set in muted slate (`#64748B`) inside the trailing edge.

### Diagnostic Matrix Cards
- Surface `#FFFFFF`, border 1px solid `#E2E8F0`, padding `space-lg`.
- Top-level cards feature a 3px accent line on the left edge corresponding to clinical status (Teal for validated AI insight, Cyan for active processing, Amber for clinician verification required).