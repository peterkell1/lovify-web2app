// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — shared UI primitives.
 * Ported from the design bundle's lovify-ui.jsx (inline-styled to stay
 * pixel-faithful and self-contained for this preview route). */

import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { LOVIFY, SANS } from './theme';
const logo = '/assets/lovify-logo.png';

// Multiplies every LovHeading's font size. The web funnel sets this >1 (via the
// provider in OnboardingV3Flow) so headlines read a touch larger on a phone;
// the native app leaves it at 1, so app headlines are unchanged.
export const HeadingScaleContext = createContext(1);

export function LovLogo({ size = 96 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="Lovify"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

export function LovProgress({
  step, total = 13, right = 24,
}: { step: number; total?: number; right?: number }) {
  const pct = Math.max(0, Math.min(1, (step - 1) / (total - 1)));
  return (
    <div
      style={{
        // Sits inline to the right of the back arrow (top:55, ends ~x58) to
        // keep the whole header on one row and save vertical space.
        position: 'absolute', top: 74, left: 60, right,
        height: 3, borderRadius: 2, zIndex: 5,
        background: 'rgba(166, 109, 56, 0.14)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`, height: '100%',
          background: LOVIFY.orangeGradient,
          borderRadius: 2,
          transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}

export function LovBack({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="back"
      style={{
        position: 'absolute', top: 55, left: 18, zIndex: 6,
        width: 40, height: 40, borderRadius: 20,
        background: 'transparent', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
      }}
    >
      <svg width="11" height="18" viewBox="0 0 11 18" fill="none">
        <path
          d="M9 1L1.5 9L9 17"
          stroke={LOVIFY.ink}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function LovPrimary({
  children, onClick, disabled, style = {},
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 58, borderRadius: 29, border: 'none',
        background: disabled ? 'rgba(27, 27, 27, 0.10)' : LOVIFY.orangeGradient,
        color: disabled ? 'rgba(27, 27, 27, 0.4)' : '#FFFCF4',
        fontFamily: SANS, fontSize: 17, fontWeight: 600, letterSpacing: 0.1,
        boxShadow: disabled
          ? 'none'
          : '0 14px 28px -10px rgba(216, 92, 28, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 120ms ease',
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}

export function LovGhost({
  children, onClick, style = {},
}: {
  children: ReactNode; onClick?: () => void; style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', height: 52, borderRadius: 26,
        background: 'transparent', border: 'none',
        color: LOVIFY.inkSoft,
        fontFamily: SANS, fontSize: 15, fontWeight: 500,
        cursor: 'pointer', letterSpacing: 0.1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Top-right "Skip" link
export function LovSkip({ onClick, label = 'Skip' }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        // Sits left of the persistent music toggle (which lives at right:16).
        position: 'absolute', top: 62, right: 62, zIndex: 5,
        padding: '6px 10px', background: 'transparent',
        border: 'none', cursor: 'pointer',
        fontFamily: SANS, fontSize: 14, fontWeight: 600,
        color: LOVIFY.sub, letterSpacing: 0.2,
      }}
    >
      {label}
    </button>
  );
}

// Big circular arrow primary CTA (hero/welcome screens)
export function LovCircleBtn({
  onClick, size = 78, glyph,
}: {
  onClick?: () => void; size?: number; glyph?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="continue"
      style={{
        width: size, height: size, borderRadius: size / 2,
        border: 'none',
        background: LOVIFY.orangeGradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 22px 38px -12px rgba(216, 92, 28, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
        transition: 'transform 140ms ease',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {glyph || (
        <svg width={size * 0.34} height={size * 0.34} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12H19M19 12L13 6M19 12L13 18"
            stroke="#FFFCF4"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// Single-select option card (with radio check)
export function LovOption({
  label, selected, onClick,
}: {
  label: ReactNode; selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '20px 22px',
        borderRadius: 22,
        background: selected ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.7)',
        border: `1px solid ${selected ? LOVIFY.orange : LOVIFY.line}`,
        color: selected ? LOVIFY.ink : LOVIFY.inkSoft,
        fontFamily: SANS, fontSize: 16, fontWeight: selected ? 600 : 500,
        letterSpacing: 0.05, lineHeight: 1.35,
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 200ms ease',
        boxShadow: selected ? '0 10px 22px -10px rgba(216, 92, 28, 0.35)' : 'none',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 22, height: 22, borderRadius: 11,
          border: `1.5px solid ${selected ? LOVIFY.orange : 'rgba(126, 107, 94, 0.35)'}`,
          background: selected ? LOVIFY.orangeGradient : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
        }}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>{label}</div>
    </button>
  );
}

// Single-select text row (Life Stage style): text left, orange border +
// tint + gradient check circle on the right.
export function LovSelectRow({
  label, selected, onClick,
}: {
  label: ReactNode; selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '18px 22px', borderRadius: 20, textAlign: 'left',
        background: selected ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.78)',
        border: `1.5px solid ${selected ? LOVIFY.orange : LOVIFY.line}`,
        cursor: 'pointer',
        fontFamily: SANS, fontSize: 16, fontWeight: selected ? 700 : 500,
        color: selected ? LOVIFY.ink : LOVIFY.inkSoft, letterSpacing: -0.1, lineHeight: 1.3,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        transition: 'all 180ms ease',
        boxShadow: selected ? '0 10px 22px -12px rgba(216, 92, 28, 0.35)' : 'none',
      }}
    >
      <span>{label}</span>
      {selected && (
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
          <circle cx="10" cy="10" r="10" fill="url(#lovselcheck)" />
          <defs>
            <linearGradient id="lovselcheck" x1="0" y1="0" x2="20" y2="20">
              <stop offset="0%" stopColor="#F5B73D" />
              <stop offset="100%" stopColor="#D85C1C" />
            </linearGradient>
          </defs>
          <path d="M5.5 10.5L8.5 13.5L14.5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}

// Multi-select chip
export function LovChip({
  label, selected, onClick,
}: {
  label: ReactNode; selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '13px 20px',
        borderRadius: 24,
        background: selected ? LOVIFY.orangeGradient : 'rgba(255, 251, 244, 0.75)',
        border: `1px solid ${selected ? 'transparent' : LOVIFY.line}`,
        color: selected ? '#FFFCF4' : LOVIFY.inkSoft,
        fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: 0.1,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 200ms ease',
        boxShadow: selected ? '0 10px 22px -10px rgba(216, 92, 28, 0.5)' : 'none',
        transform: selected ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {label}
    </button>
  );
}

// Screen shell — fills the phone column.
export function LovScreen({
  children, bgStyle = {}, padTop = 100,
}: {
  children: ReactNode; bgStyle?: CSSProperties; padTop?: number;
}) {
  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: LOVIFY.bgGradient,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        paddingTop: padTop,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...bgStyle,
      }}
    >
      {children}
    </div>
  );
}

// Headline + subcopy block
export function LovHeading({
  title, subcopy, align = 'center', titleStyle = {}, subStyle = {},
}: {
  title: ReactNode; subcopy?: ReactNode; align?: CSSProperties['textAlign'];
  titleStyle?: CSSProperties; subStyle?: CSSProperties;
}) {
  const scale = useContext(HeadingScaleContext);
  // Resolve the base size (per-screen override or the 22 default), then scale it.
  // Applied AFTER spreading titleStyle so the scaled value always wins.
  const baseSize = typeof titleStyle.fontSize === 'number' ? titleStyle.fontSize : 22;
  const scaledSize = Math.round(baseSize * scale);
  return (
    <div style={{ padding: '0 26px', textAlign: align }}>
      <h1
        style={{
          fontFamily: SANS, fontWeight: 600,
          lineHeight: 1.2, letterSpacing: -0.5,
          color: LOVIFY.ink, margin: 0,
          textWrap: 'pretty' as CSSProperties['textWrap'],
          ...titleStyle,
          fontSize: scaledSize,
        }}
      >
        {title}
      </h1>
      {subcopy && (
        <p
          style={{
            marginTop: 12, marginBottom: 0,
            fontFamily: SANS, fontSize: 15.5, lineHeight: 1.5, fontWeight: 400,
            color: LOVIFY.sub, letterSpacing: 0.05,
            ...subStyle,
          }}
        >
          {subcopy}
        </p>
      )}
    </div>
  );
}

// Warm orange-gradient text emphasis.
export function LovAccent({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: LOVIFY.orangeGradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

export function LegalRow() {
  return (
    <div
      style={{
        fontFamily: SANS, fontSize: 12, color: LOVIFY.subSoft,
        textAlign: 'center', letterSpacing: 0.2, lineHeight: 1.5,
      }}
    >
      Privacy Policy · Terms of Service
    </div>
  );
}

export function EmojiOption({
  emoji, label, selected, onClick,
}: {
  emoji: string; label: ReactNode; selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '18px 20px',
        borderRadius: 22,
        background: selected ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.78)',
        border: `1.5px solid ${selected ? LOVIFY.orange : LOVIFY.line}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'all 180ms ease',
        boxShadow: selected ? '0 10px 22px -12px rgba(216, 92, 28, 0.4)' : 'none',
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <span
        style={{
          flex: 1,
          fontFamily: SANS, fontSize: 16, fontWeight: selected ? 600 : 500,
          color: selected ? LOVIFY.ink : LOVIFY.inkSoft,
          letterSpacing: 0.05, lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </button>
  );
}