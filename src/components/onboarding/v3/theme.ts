// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — brand tokens (warm peach/orange).
 * Ported from the Claude Design handoff bundle ("Lovify Onboarding.html").
 * Self-contained so this preview flow can be lifted into the live
 * onboarding later without touching shared theme files. */

export const LOVIFY = {
  bg: '#FCF8F1',
  cream: '#FAF1E3',
  peach: '#F8E0C6',
  peachDeep: '#F0BFA0',
  ink: '#1B1B1B',
  inkSoft: '#3A2E26',
  sub: '#7E6B5E',
  subSoft: '#A0907F',
  orange: '#ED7A2A',
  orangeDeep: '#D85C1C',
  goldOrange: '#F5B73D',
  line: 'rgba(166, 109, 56, 0.14)',
  lineSoft: 'rgba(166, 109, 56, 0.08)',
  bgGradient: `
    radial-gradient(110% 70% at 100% 0%, #FFCFA0 0%, #FFE0C2 22%, #FFEFD9 48%, #FCF8F1 80%),
    linear-gradient(180deg, #FCF8F1 0%, #FAF4E8 100%)
  `,
  orangeGradient: 'linear-gradient(140deg, #F5B73D 0%, #ED7A2A 55%, #D85C1C 100%)',
  orangeGradientSoft: 'linear-gradient(140deg, rgba(245,183,61,0.16), rgba(216,92,28,0.18))',
} as const;

export const SANS =
  '"Montserrat", -apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';

// Loaded font for emotional / editorial moments.
export const SERIF = '"Playfair Display", "Cormorant Garamond", Georgia, serif';