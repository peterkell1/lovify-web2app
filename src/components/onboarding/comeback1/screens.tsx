// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — the onboarding screens.
 * Ported from the design bundle (lovify-v3-a.jsx / lovify-v3-b.jsx).
 * Each screen takes nav props (onNext / onBack / onSkip) and, where it
 * captures input, a value + setValue pair owned by the flow controller. */

import { useEffect, useState, useRef, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOVIFY, SANS, SERIF } from '@/components/onboarding/v3/theme';
import {
  LovScreen, LovBack, LovSkip, LovHeading, LovAccent,
  LovPrimary, LovGhost, LovCircleBtn, LovLogo, LovOption, LovChip, LovSelectRow,
  LegalRow,
} from '@/components/onboarding/v3/primitives';
import { suggestSoundStyles, buildStyleContext, generateLyrics, type SoundVibe } from '@/components/onboarding/v3/generation';
import { promptPushPermission } from '@/lib/onesignal';
import { capturePostHogEvent } from '@/lib/posthog';
import { requestTrackingPermission } from '@/lib/tracking-consent';
const kaitlinPhoto = '/assets/onboarding/characters/kaitlin.png';
const becomeCards = '/assets/onboarding/become-cards.png';
// Roleplay-demo assets — a sample person's uploaded photo, their generated
// dream vision, and the song cover. Used to ACT OUT a chat session rather than
// show app screenshots.
const demoPhoto = '/assets/onboarding/before-photo.png';
const demoVision = '/assets/onboarding/after-photo.png';
const demoCover = '/assets/onboarding/album-cover.png';
// Two real demo songs the roleplay "creates" at the end (playable).
const demoSong1 = '/assets/onboarding/v3/demo-song-1.mp3';
const demoSong2 = '/assets/onboarding/v3/demo-song-2.mp3';
// Nurse-comeback demo assets (the acted-out persona on /comeback1): her photo
// (the 📷 step + the song row art), her vision (Disneyland with her son), and
// the real nurse comeback track.
const nursePhoto = '/assets/onboarding/comeback1/nurse-photo.jpg';
const nurseVision = '/assets/onboarding/comeback1/nurse-vision.jpg';
const nurseSong = '/assets/onboarding/comeback1/nurse-song.mp3';
// Premium illustrated heroes (Kive.ai) — warm, headphones, dreamy. home-hero is
// the heart/sway for the landing; hero-float is the arms-wide joyful release.
const homeHero = '/assets/onboarding/v3/home-hero.png';
// Reveal-beat heroes (backgrounds keyed to transparent): glossy pill, the pill
// splitting open, a person with music streaming into the ear, and a couple in a
// glowing circle.
const heroPill = '/assets/onboarding/v3/hero-pill.png';
const heroPillBreak = '/assets/onboarding/v3/hero-pillbreak.png';
const heroListening = '/assets/onboarding/v3/hero-listening.png';
const heroFamily = '/assets/onboarding/v3/hero-family.png';
const heroTransform = '/assets/onboarding/v3/hero-transform.png';
const heroLives = '/assets/onboarding/v3/hero-lives.png';
const heroDriving = '/assets/onboarding/v3/hero-driving.png';

// Every illustration shown during the funnel, in roughly the order it appears.
// The flow controller eagerly preloads these on mount (web) so each screen's
// art is already downloaded + decoded by the time the user swipes to it — no
// "pop-in" on a phone over a cellular connection.
export const ONBOARDING_PRELOAD_IMAGES: string[] = [
  homeHero, heroPill, heroPillBreak, heroListening, heroFamily, heroTransform,
  heroLives, heroDriving, becomeCards, kaitlinPhoto, demoPhoto, demoVision, demoCover,
];

interface NavProps {
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}
interface SingleProps extends NavProps {
  value: string;
  setValue: (v: string) => void;
}
interface MultiProps extends NavProps {
  value: string[];
  setValue: (v: string[]) => void;
}

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

// A small speaker toggle (top-right) for the ambient soundtrack. Visual + state
// only for now; wire to a real <audio> loop once a track is chosen.
function MusicToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? 'Mute sound' : 'Play sound'}
      style={{
        position: 'absolute', top: 54, right: 16, zIndex: 8,
        width: 44, height: 44, borderRadius: 22, cursor: 'pointer', padding: 0,
        background: 'transparent', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.4))' }}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff" />
        {on ? (
          <>
            <path d="M16 8.5a4 4 0 0 1 0 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M18.5 6a7 7 0 0 1 0 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <path d="M17 9l5 6M22 9l-5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

// Notes + sparkles ORBITING the couple in the center of the hero. Each element
// rides a slow circular path (varied radius/speed/direction) with a soft warm
// glow, twinkling as it goes — so it feels like music + magic swirling around
// them rather than rising from the bottom. `cy` tunes the orbit's vertical
// center to sit over the figures.
function NoteParticles({ cy = '44%' }: { cy?: string }) {
  // Wider orbits + bigger, brighter glyphs so they clearly read as floating ON
  // TOP of the art (not the notes baked into the illustration).
  const items = [
    { c: '♪', r: 150, s: 30, dur: 15, delay: 0.0, dir: 1, start: 0 },
    { c: '✦', r: 178, s: 20, dur: 19, delay: 1.0, dir: -1, start: 55 },
    { c: '♫', r: 128, s: 26, dur: 13, delay: 1.9, dir: 1, start: 115 },
    { c: '✧', r: 196, s: 16, dur: 21, delay: 0.5, dir: 1, start: 175 },
    { c: '♬', r: 162, s: 32, dur: 17, delay: 2.7, dir: -1, start: 215 },
    { c: '✦', r: 112, s: 15, dur: 12, delay: 1.6, dir: -1, start: 275 },
    { c: '♩', r: 186, s: 24, dur: 20, delay: 2.3, dir: 1, start: 315 },
    { c: '✧', r: 140, s: 18, dur: 16, delay: 0.8, dir: -1, start: 25 },
  ];
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {items.map((n, i) => {
        const isSparkle = n.c === '✦' || n.c === '✧';
        // Sample the circle into keyframes so framer-motion tweens along the arc.
        const steps = 24;
        const xs: number[] = [], ys: number[] = [];
        for (let k = 0; k <= steps; k++) {
          const a = (n.start + n.dir * (360 * k) / steps) * Math.PI / 180;
          xs.push(Math.cos(a) * n.r);
          ys.push(Math.sin(a) * n.r * 0.82); // slightly flattened orbit
        }
        return (
          <motion.span
            key={i}
            style={{
              position: 'absolute', left: '50%', top: cy, fontSize: n.s,
              color: '#FFFFFF', fontWeight: 700,
              textShadow: isSparkle
                ? '0 0 10px rgba(255,236,200,1), 0 0 22px rgba(245,183,61,0.85)'
                : '0 0 12px rgba(245,183,61,0.95), 0 0 22px rgba(237,122,42,0.7), 0 2px 6px rgba(216,92,28,0.6)',
              marginLeft: -n.s / 2, marginTop: -n.s / 2, willChange: 'transform, opacity',
            }}
            animate={{
              x: xs, y: ys,
              opacity: isSparkle ? [0.45, 1, 0.5, 1, 0.45] : [0.8, 1, 0.85, 1, 0.8],
              scale: isSparkle ? [0.6, 1.3, 0.7, 1.25, 0.6] : [0.95, 1.12, 1, 1.12, 0.95],
            }}
            transition={{
              x: { duration: n.dur, repeat: Infinity, ease: 'linear', delay: n.delay },
              y: { duration: n.dur, repeat: Infinity, ease: 'linear', delay: n.delay },
              opacity: { duration: n.dur / 4, repeat: Infinity, ease: 'easeInOut', delay: n.delay },
              scale: { duration: n.dur / 4, repeat: Infinity, ease: 'easeInOut', delay: n.delay },
            }}
          >
            {n.c}
          </motion.span>
        );
      })}
    </div>
  );
}

// ─── 01. Home (premium full-bleed illustrated hero) ─────────────
// First impression. A warm illustrated couple-with-headphones hero fills the
// screen; code-driven top/bottom gradient scrims keep the wordmark + headline +
// CTA legible over it regardless of the art. Slow Ken-Burns drift + drifting
// note particles + a music toggle give it that always-alive, premium feel.
// `sound` + `onToggleSound` come from the flow controller so the ambient track
// keeps playing across every onboarding step (the <audio> lives up there).
export function V3_01_Splash({ onNext, onSignIn, sound = true, onToggleSound }: NavProps & { sound?: boolean; onToggleSound?: () => void; onSignIn?: () => void }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: LOVIFY.bg }}>
      {/* Full-bleed hero with a slow Ken-Burns drift so it breathes. */}
      <motion.img
        src={homeHero}
        alt=""
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1.16, x: [0, -8, 0], y: [0, -6, 0] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      {/* Notes + sparkles orbiting the couple in the center. */}
      <NoteParticles />

      {/* No scrims — clean art top and bottom (per design). Text legibility is
          handled by per-element shadows below. */}
      <MusicToggle on={sound} onClick={() => onToggleSound?.()} />

      {/* Wordmark — lower down + much bigger. */}
      <div style={{ position: 'absolute', top: 108, left: 0, right: 0, textAlign: 'center', zIndex: 6 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: -1, color: '#fff', textShadow: '0 1px 10px rgba(58,30,16,0.35)' }}>
          Lovify
        </span>
      </div>

      {/* Bottom content — subheadline, CTA, and (app-only) sign-in. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, padding: '0 26px 30px' }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ margin: '0 auto 22px', maxWidth: 360, fontFamily: SANS, fontSize: 17.5, lineHeight: 1.35, fontWeight: 700, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', textShadow: '0 1px 10px rgba(58,30,16,0.35)' }}
        >
          Become who you're meant to be<br />with music made just for you.
        </motion.p>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
        {/* App-only: returning users sign in here. The web funnel passes no
            onSignIn (direct-response — keep the page to a single CTA). */}
        {onSignIn && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: '#fff', textShadow: '0 1px 6px rgba(58,30,16,0.65)' }}>
              Already a Lovify user?{' '}
              <button
                onClick={onSignIn}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SANS, fontSize: 14, fontWeight: 800, color: '#fff', textDecoration: 'underline' }}
              >
                Sign in
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Native iOS ATT prompt (overlay shown on the Welcome screen) ─

function ATTPrompt({ onRespond }: { onRespond: () => void }) {
  const attBtn: CSSProperties = {
    display: 'block', width: '100%', padding: '11px 12px',
    background: 'transparent', border: 'none',
    color: '#007AFF', fontSize: 17,
    fontFamily: 'inherit', cursor: 'pointer',
  };
  return (
    <motion.div
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* dim the welcome screen behind the prompt */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(60, 38, 20, 0.32)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          width: 'calc(100% - 56px)', maxWidth: 320,
          borderRadius: 14, overflow: 'hidden',
          background: 'rgba(248, 248, 250, 0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <div style={{ padding: '20px 18px 14px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 52, height: 52, borderRadius: 12,
              background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: 12,
            }}
          >
            <LovLogo size={40} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#000', letterSpacing: -0.4 }}>
            Allow "Lovify" to track your activity across other companies' apps and websites?
          </div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.35, color: 'rgba(0, 0, 0, 0.85)' }}>
            Your data is used to deliver personalized content for you.
          </div>
        </div>
        <div
          style={{
            margin: '0 auto 14px', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
            textAlign: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
            ⓘ The app developer would like permission to track you
          </span>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.36)' }}>
          <button style={{ ...attBtn, fontWeight: 400 }} onClick={onRespond}>
            Ask App Not to Track
          </button>
          <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.36)' }} />
          <button style={{ ...attBtn, fontWeight: 600 }} onClick={onRespond}>
            Allow
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 02. Welcome (native ATT prompt pops up over it) ────────────

export function V3_02_Welcome({ onNext }: NavProps) {
  const [showATT, setShowATT] = useState(false);
  // The OS tracking prompt surfaces shortly after the screen appears.
  useEffect(() => {
    const t = setTimeout(() => setShowATT(true), 650);
    return () => clearTimeout(t);
  }, []);

  return (
    <LovScreen padTop={80}>
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '0 26px',
          textAlign: 'center', marginTop: -40,
        }}
      >
        <LovLogo size={84} />
        <h1
          style={{
            marginTop: 30,
            fontFamily: SANS, fontWeight: 800,
            fontSize: 30, letterSpacing: -0.6, lineHeight: 1,
            color: LOVIFY.ink, margin: 0,
          }}
        >
          Ready to change?
        </h1>
        <p
          style={{
            marginTop: 18,
            fontFamily: SANS, fontSize: 17, lineHeight: 1.45, fontWeight: 500,
            color: LOVIFY.sub, letterSpacing: 0.05, maxWidth: 300,
          }}
        >
          If you miss who you used to be — or you're reaching for who you could become — let's start there.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <LovCircleBtn size={78} onClick={onNext} />
      </div>

      <div style={{ padding: '0 26px 28px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: SANS, fontSize: 14, fontWeight: 600,
            color: LOVIFY.inkSoft, letterSpacing: 0.1, marginBottom: 12,
          }}
        >
          I already have an account ·{' '}
          <button
            onClick={onNext}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: SANS, fontSize: 14, color: LOVIFY.orangeDeep, fontWeight: 700,
            }}
          >
            Sign in
          </button>
        </div>
        <LegalRow />
      </div>

      {showATT && <ATTPrompt onRespond={() => setShowATT(false)} />}
    </LovScreen>
  );
}

// ═══════════════════════════════════════════════════════════════
// "Imagine a drug…" opener (6 screens, 03–08) — a cinematic on-ramp inspired
// by Moongate. We make a bold claim feel like a DISCOVERY, then flip the whole
// thing to be about the user's own goals before we ever pitch:
//   03 the hook — "Imagine a drug that could…" (3 benefit promises cycle)
//   04 the reveal — "That drug is… music" (pill dissolves into a waveform)
//   05 the discovery — researchers found something remarkable about music
//   06 the science — music can literally change who you are (credibility)
//   07 the goals — "What would you like to achieve?" (tap to expand each how)
//   08 the turn — "Lovify can help with that" (mirrors back their picks)
// ═══════════════════════════════════════════════════════════════

// The three benefit promises that cycle on the hook screen. Easy to edit.
const DRUG_BENEFITS = [
  'become who you\'re meant to be',
  'create a life you love',
  'feel genuinely happy again',
];

// ═══════════════════════════════════════════════════════════════
// Cinematic motion primitives — the "premium" layer. These give every hero a
// constant subtle life (float / breathe / glow) like Moongate. When real
// rendered hero art (AI-generated PNGs) is ready, drop it into <HeroImage> and
// the same float/glow wrappers animate it — no other changes needed.
// ═══════════════════════════════════════════════════════════════

// A soft, slowly-drifting glow orb. Stack a few behind a hero for an ambient,
// always-alive background (cheap — pure CSS blur + transform loops).
function GlowOrb({ size, color, x, y, delay = 0, dur = 9 }: { size: number; color: string; x: string; y: string; delay?: number; dur?: number }) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 70%)`,
        filter: 'blur(6px)', pointerEvents: 'none',
      }}
      animate={{ x: [0, 18, -10, 0], y: [0, -14, 10, 0], scale: [1, 1.12, 0.95, 1], opacity: [0.6, 0.85, 0.55, 0.6] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// Ambient backdrop — a couple of warm orbs drifting behind the hero. Absolute,
// fills its (positioned) parent, never intercepts taps.
function AmbientGlow() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <GlowOrb size={300} color="rgba(245,183,61,0.30)" x="8%" y="22%" dur={11} />
      <GlowOrb size={260} color="rgba(237,122,42,0.22)" x="52%" y="46%" delay={1.5} dur={9} />
      <GlowOrb size={220} color="rgba(216,92,28,0.16)" x="26%" y="60%" delay={3} dur={13} />
    </div>
  );
}

// Wrap a hero so it gently floats + breathes + glows forever. `fill` makes the
// wrapper stretch to its parent (so a responsive child img can size off the
// available height) instead of shrink-wrapping the child.
function FloatBreathe({ children, dur = 5, fill = false }: { children: ReactNode; dur?: number; fill?: boolean }) {
  return (
    <motion.div
      style={fill
        ? { display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }
        : { display: 'inline-flex' }}
      animate={{ y: [0, -10, 0], scale: [1, 1.025, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// Staggered word-by-word reveal (fade + rise + de-blur). The premium way to
// bring a headline in instead of one hard fade.
function RevealWords({ text, style, delay = 0, per = 0.07 }: { text: string; style?: CSSProperties; delay?: number; per?: number }) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline-block' }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', whiteSpace: 'pre', ...style }}
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * per, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  );
}

// A glossy capsule (the "drug") — richer than a flat glyph: vertical gradient
// body, a soft specular highlight, a seam, an inner glow, and a halo behind it.
// `morph` (0→1) lets the reveal screen visually "dissolve" it as it leaves.
function PillHero({ size = 184 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* glowing halo */}
      <motion.div
        aria-hidden
        style={{ position: 'absolute', width: size * 0.92, height: size * 0.92, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,183,61,0.55) 0%, rgba(237,122,42,0.18) 45%, rgba(255,255,255,0) 72%)', filter: 'blur(4px)' }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ position: 'relative', filter: 'drop-shadow(0 22px 46px rgba(216,92,28,0.5))' }}>
        <defs>
          <linearGradient id="lovpillBody" x1="30" y1="10" x2="92" y2="110">
            <stop offset="0%" stopColor="#FFEFD6" />
            <stop offset="38%" stopColor="#F7C04A" />
            <stop offset="74%" stopColor="#ED7A2A" />
            <stop offset="100%" stopColor="#C9501A" />
          </linearGradient>
          <linearGradient id="lovpillSpec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform="rotate(38 60 60)">
          <rect x="33" y="12" width="54" height="96" rx="27" fill="url(#lovpillBody)" />
          {/* top-half glassy sheen */}
          <rect x="33" y="12" width="54" height="50" rx="27" fill="url(#lovpillSpec)" opacity="0.45" />
          {/* slim specular streak */}
          <rect x="42" y="20" width="9" height="80" rx="4.5" fill="#FFFFFF" opacity="0.4" />
          {/* center seam */}
          <line x1="33" y1="60" x2="87" y2="60" stroke="#FFF6EA" strokeWidth="2.4" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}

// A glowing, animated waveform between two soft "glass" panels — the "sound"
// the drug turns out to be (echoes Moongate's reveal). Each bar pulses with a
// soft outer glow; the whole thing sits over a faint horizontal light beam.
function WaveGlyph({ bars = 15, glow = false }: { bars?: number; glow?: boolean }) {
  const heights = [16, 28, 44, 64, 84, 56, 96, 50, 82, 60, 40, 70, 30, 22, 14];
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, width: '100%' }}>
      {glow && (
        <div aria-hidden style={{ position: 'absolute', width: '86%', height: 60, borderRadius: 40, background: 'radial-gradient(ellipse, rgba(245,183,61,0.4) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(10px)' }} />
      )}
      {/* left glass panel */}
      {glow && <GlassPanel side="left" />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 100, position: 'relative' }}>
        {Array.from({ length: bars }).map((_, i) => (
          <motion.span
            key={i}
            style={{
              width: 6, borderRadius: 4, background: LOVIFY.orangeGradient, display: 'block',
              boxShadow: glow ? '0 0 12px rgba(245,183,61,0.8), 0 0 4px rgba(237,122,42,0.9)' : 'none',
            }}
            initial={{ height: 8 }}
            animate={{ height: [10, heights[i % heights.length], 14, heights[(i + 3) % heights.length], 10] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
          />
        ))}
      </div>
      {glow && <GlassPanel side="right" />}
    </div>
  );
}

// Frosted glass end-cap for the waveform (the panels the sound emanates between).
function GlassPanel({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', [side]: '6%', top: '50%', transform: 'translateY(-50%)',
        width: 14, height: 96, borderRadius: 7,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,240,220,0.35))',
        boxShadow: '0 0 18px rgba(245,183,61,0.5)', backdropFilter: 'blur(4px)',
      } as CSSProperties}
    />
  );
}

// ─── 03 · The hook — "Imagine a drug that could…" ──────────────
// Cycles through all three benefit promises once, then auto-advances — no
// Continue button. The headline reveals slowly so it's easy to read.
const BENEFIT_HOLD = 2000; // ms each benefit stays on screen
export function V3_DrugHook({ onNext, onBack, onSkip }: NavProps & { autoAdvanceOnly?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    // Let the slow headline land first, then start cycling benefits.
    const startDelay = 1400;
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => {
      idx += 1;
      if (idx < DRUG_BENEFITS.length) {
        setI(idx);
        timers.push(setTimeout(tick, BENEFIT_HOLD));
      } else {
        // all three shown — advance to the reveal.
        timers.push(setTimeout(() => onNext?.(), BENEFIT_HOLD));
      }
    };
    timers.push(setTimeout(tick, startDelay + BENEFIT_HOLD));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <LovScreen>
      <AmbientGlow />
      <LovBack onClick={onBack} />
      <LovSkip onClick={onSkip} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 25, lineHeight: 1.3, letterSpacing: -0.5, color: LOVIFY.ink }}>
          <RevealWords text="Imagine a" per={0.16} />{' '}
          <LovAccent>drug</LovAccent>{' '}
          <RevealWords text="that could help you…" delay={0.5} per={0.13} />
        </h1>
        <div style={{ height: 42, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, lineHeight: 1.2, color: LOVIFY.orangeDeep }}
            >
              {DRUG_BENEFITS[i]}
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.div
          style={{ marginTop: 34 }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <FloatBreathe>
            <img src={heroPill} alt="" aria-hidden style={{ width: 230, height: 230, objectFit: 'contain', filter: 'drop-shadow(0 16px 40px rgba(216,92,28,0.32))' }} />
          </FloatBreathe>
        </motion.div>
      </div>
      {/* Auto-advances after all 3 benefits, but the Continue CTA is always
          shown (app + web) so users can move ahead immediately instead of
          waiting out the cinematic intro. */}
      <div style={{ position: 'relative', padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 04 · The reveal — "That drug is… music" ───────────────────
// Headline pinned at the TOP for readability; the pill cross-fades into the
// pill breaking open, with magical music notes floating up out of it.
export function V3_DrugReveal({ onNext, onBack }: NavProps) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 850);
    return () => clearTimeout(t);
  }, []);
  return (
    <LovScreen>
      <AmbientGlow />
      <LovBack onClick={onBack} />

      {/* Headline — pinned at top. "That drug is" then "music" appears under it. */}
      <div style={{ position: 'relative', padding: '4px 30px 0', textAlign: 'center', zIndex: 5 }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 25, lineHeight: 1.25, letterSpacing: -0.5, color: LOVIFY.ink }}>
          That drug is…
        </h1>
        <div style={{ height: 56, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {revealed && (
              <motion.div
                key="music"
                initial={{ opacity: 0, scale: 0.75, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: -1, color: LOVIFY.orangeDeep }}
              >
                music
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero zone — pill cross-fades into the pill breaking open, with a burst
          of magical floating music notes rising out of it. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: 290, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Floating notes rise once the pill opens. */}
          {revealed && <MusicNoteBurst />}

          {/* The closed pill fades as it "opens". */}
          <motion.img
            src={heroPill} alt="" aria-hidden
            style={{ position: 'absolute', width: 210, height: 210, objectFit: 'contain' }}
            initial={{ opacity: 1, scale: 1 }}
            animate={revealed ? { opacity: 0, scale: 1.15 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeIn' }}
          />
          {/* The pill breaking open — music + glow bloom out. */}
          <motion.img
            src={heroPillBreak} alt="" aria-hidden
            style={{ position: 'absolute', width: 280, height: 280, objectFit: 'contain', zIndex: 2 }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// Magical music FX bursting from the pill: expanding glow rings, a big spray of
// glowing notes flying up + out in all directions, and twinkling sparkles.
// Bright and dense so the screen feels powerful and alive.
function MusicNoteBurst() {
  // Notes fly out across a wide arc (varied angle/distance/size/speed).
  const notes = [
    { c: '♪', ang: -110, dist: 150, s: 30, dur: 3.0, delay: 0.0, rot: -22 },
    { c: '♫', ang: -80,  dist: 175, s: 36, dur: 3.6, delay: 0.4, rot: 18 },
    { c: '♬', ang: -95,  dist: 130, s: 28, dur: 2.8, delay: 0.8, rot: -12 },
    { c: '♩', ang: -65,  dist: 165, s: 26, dur: 3.4, delay: 0.2, rot: 20 },
    { c: '♪', ang: -125, dist: 140, s: 32, dur: 3.2, delay: 1.0, rot: -18 },
    { c: '♫', ang: -50,  dist: 185, s: 24, dur: 3.8, delay: 0.6, rot: 16 },
    { c: '♬', ang: -140, dist: 120, s: 22, dur: 2.9, delay: 1.3, rot: -24 },
    { c: '♩', ang: -35,  dist: 155, s: 28, dur: 3.5, delay: 0.9, rot: 22 },
    { c: '♪', ang: -90,  dist: 200, s: 34, dur: 4.0, delay: 1.5, rot: 0 },
  ];
  const sparkles = [
    { ang: -75, dist: 110, s: 16, dur: 2.6, delay: 0.3 },
    { ang: -105, dist: 125, s: 14, dur: 2.4, delay: 0.7 },
    { ang: -55, dist: 100, s: 13, dur: 2.8, delay: 1.1 },
    { ang: -120, dist: 95, s: 15, dur: 2.5, delay: 0.5 },
    { ang: -60, dist: 135, s: 12, dur: 3.0, delay: 1.4 },
  ];
  const rad = (a: number) => a * Math.PI / 180;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 3 }}>
      {/* Expanding glow rings pulsing out from the center. */}
      {[0, 1, 2].map((r) => (
        <motion.div
          key={`ring${r}`}
          style={{ position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: '50%', border: '2px solid rgba(245,183,61,0.6)' }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 2.4], opacity: [0, 0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: r * 0.85 }}
        />
      ))}
      {/* Central radiant glow pulse. */}
      <motion.div
        style={{ position: 'absolute', left: '50%', top: '50%', width: 180, height: 180, marginLeft: -90, marginTop: -90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,236,200,0.7) 0%, rgba(245,183,61,0.25) 40%, rgba(255,255,255,0) 70%)' }}
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Notes flying outward. */}
      {notes.map((n, i) => {
        const dx = Math.cos(rad(n.ang)) * n.dist;
        const dy = Math.sin(rad(n.ang)) * n.dist;
        return (
          <motion.span
            key={`n${i}`}
            style={{
              position: 'absolute', left: '50%', top: '50%', fontSize: n.s, fontWeight: 700,
              color: '#fff', marginLeft: -n.s / 2, marginTop: -n.s / 2, willChange: 'transform, opacity',
              textShadow: '0 0 14px rgba(245,183,61,1), 0 0 26px rgba(237,122,42,0.85), 0 0 4px rgba(255,255,255,0.9)',
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{
              x: [0, dx * 0.55, dx],
              y: [0, dy * 0.55, dy],
              opacity: [0, 1, 0],
              scale: [0.3, 1.1, 0.7],
              rotate: [0, n.rot, n.rot * 1.5],
            }}
            transition={{ duration: n.dur, repeat: Infinity, ease: 'easeOut', delay: n.delay }}
          >
            {n.c}
          </motion.span>
        );
      })}
      {/* Twinkling sparkles. */}
      {sparkles.map((sp, i) => {
        const dx = Math.cos(rad(sp.ang)) * sp.dist;
        const dy = Math.sin(rad(sp.ang)) * sp.dist;
        return (
          <motion.span
            key={`s${i}`}
            style={{
              position: 'absolute', left: '50%', top: '50%', fontSize: sp.s, fontWeight: 700,
              color: '#fff', marginLeft: -sp.s / 2, marginTop: -sp.s / 2, willChange: 'transform, opacity',
              textShadow: '0 0 10px rgba(255,236,200,1), 0 0 20px rgba(245,183,61,0.9)',
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
            animate={{ x: [0, dx], y: [0, dy], opacity: [0, 1, 0], scale: [0.3, 1.3, 0.5] }}
            transition={{ duration: sp.dur, repeat: Infinity, ease: 'easeOut', delay: sp.delay }}
          >
            ✦
          </motion.span>
        );
      })}
    </div>
  );
}

// A capsule that "opens": two rounded halves that, when `opening`, slide apart
// and fade — as if the pill cracks open to release the sound. Built from the
// same glossy look as PillHero so it reads as the same object carried over.
function PillSplit({ opening, size = 150 }: { opening: boolean; size?: number }) {
  const half = (top: boolean) => (
    <motion.div
      style={{ position: 'absolute', left: '50%', width: size * 0.34, height: size * 0.32, marginLeft: -(size * 0.17), borderRadius: top ? `${size * 0.17}px ${size * 0.17}px 6px 6px` : `6px 6px ${size * 0.17}px ${size * 0.17}px`, transformOrigin: top ? 'bottom center' : 'top center',
        background: top
          ? 'linear-gradient(160deg, #FFEFD6 0%, #F7C04A 60%, #ED7A2A 100%)'
          : 'linear-gradient(160deg, #F7C04A 0%, #ED7A2A 60%, #C9501A 100%)',
        boxShadow: '0 12px 30px -12px rgba(216,92,28,0.5)',
        ...(top ? { top: '50%', marginTop: -(size * 0.32) } : { top: '50%', marginTop: 2 }),
      }}
      initial={false}
      animate={opening
        ? { y: top ? -(size * 0.5) : (size * 0.5), opacity: 0, rotate: top ? -12 : 12, scale: 1.1 }
        : { y: 0, opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    />
  );
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'rotate(38deg)' }}>
      {/* halo */}
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: size * 0.9, height: size * 0.9, marginLeft: -(size * 0.45), marginTop: -(size * 0.45), borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,183,61,0.5) 0%, rgba(255,255,255,0) 68%)', filter: 'blur(4px)' }} />
      {half(true)}
      {half(false)}
    </div>
  );
}

// A REVEAL slide laid out like Moongate: HEADLINE at the top, a VISUAL in the
// middle (image / glyph / logo strip — fills the space), supporting TEXT at the
// bottom, and a single CTA. Reused by the discovery + science + mechanism beats.
function SocReveal({
  title, visual, body, cta, onNext, onBack, web,
}: {
  title: ReactNode; visual?: ReactNode; body?: ReactNode; cta: string;
  onNext?: () => void; onBack?: () => void; web?: boolean;
}) {
  if (web) {
    // Web: balanced vertical rhythm. The area above the button is split into
    // three bands — headline / visual / subcopy — each centering its content, so
    // the headline sits centered between the top and the image, and the subcopy
    // centered between the image and the button (instead of both pinned to the
    // extremes). The visual band is double-height so the art stays the hero.
    return (
      <LovScreen>
        <LovBack onClick={onBack} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LovHeading title={title} titleStyle={{ fontSize: 24 }} />
          </div>
          <div style={{ flex: 2, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            {visual}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>
            {body && (
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 15.5, lineHeight: 1.6, color: LOVIFY.sub, textAlign: 'center' }}>
                {body}
              </p>
            )}
          </div>
        </div>
        <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
          <LovPrimary onClick={onNext}>{cta}</LovPrimary>
        </div>
      </LovScreen>
    );
  }
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading title={title} titleStyle={{ fontSize: 24 }} />
      {/* Middle: the visual fills the available height. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 24px' }}>
        {visual}
      </div>
      {/* Bottom: supporting copy sits just above the button. */}
      {body && (
        <p style={{ margin: 0, padding: '0 30px 18px', fontFamily: SANS, fontSize: 15.5, lineHeight: 1.6, color: LOVIFY.sub, textAlign: 'center', flexShrink: 0 }}>
          {body}
        </p>
      )}
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>{cta}</LovPrimary>
      </div>
    </LovScreen>
  );
}

// A floating illustrated hero image with a gentle breathe + soft glow. Used by
// the reveal beats now that we have real art instead of SVG glyphs.
function ImgHero({ src, size = 240, web = false }: { src: string; size?: number; web?: boolean }) {
  const shadow = 'drop-shadow(0 14px 34px rgba(216,92,28,0.28))';
  // Web funnel: let the illustration grow to fill the available space (bounded
  // by the container's height so it never creeps over the Continue button), and
  // multiply-blend it so the artwork's faint square backdrop melts into the page
  // gradient instead of reading as a card. The native app keeps the fixed size.
  // A soft radial mask feathers the outer edge to transparent so any hard line
  // or baked-in rectangle at the bottom of the PNG dissolves into the page
  // instead of showing a crisp border. Paired with multiply (which melts the
  // light fill), this hides the non-transparent backdrop without re-exporting.
  const featherMask = 'radial-gradient(ellipse 86% 82% at 50% 46%, #000 70%, rgba(0,0,0,0) 100%)';
  const imgStyle: CSSProperties = web
    ? { width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply', WebkitMaskImage: featherMask, maskImage: featherMask }
    : { width: size, height: size, objectFit: 'contain', filter: shadow };
  return (
    <FloatBreathe dur={6} fill={web}>
      <img src={src} alt="" aria-hidden style={imgStyle} />
    </FloatBreathe>
  );
}

// ─── 04 · The discovery — intrigue (listening visual) ──────────
export function V3_Discovery({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Researchers have discovered something <LovAccent>remarkable</LovAccent> about music.</>}
      visual={<ImgHero src={heroListening} size={250} web={web} />}
      web={web}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── 05 · The science — music can change who you become ────────
export function V3_Science({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Music can literally <LovAccent>change who you are</LovAccent>.</>}
      visual={<ImgHero src={heroFamily} size={320} web={web} />}
      web={web}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// Headphones + waveform glyph — the listening visual for the discovery beat.
function HeadphonesGlyph() {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
        <defs>
          <linearGradient id="lovhp" x1="0" y1="0" x2="180" y2="180">
            <stop offset="0%" stopColor="#F5B73D" />
            <stop offset="100%" stopColor="#D85C1C" />
          </linearGradient>
        </defs>
        {/* headband */}
        <path d="M40 96 A52 52 0 0 1 140 96" stroke="url(#lovhp)" strokeWidth="9" strokeLinecap="round" fill="none" />
        {/* ear cups */}
        <rect x="30" y="92" width="26" height="46" rx="12" fill="url(#lovhp)" />
        <rect x="124" y="92" width="26" height="46" rx="12" fill="url(#lovhp)" />
      </svg>
      {/* small pulsing waveform in the center */}
      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
        {[18, 30, 22, 38, 26, 14].map((h, i) => (
          <motion.span
            key={i}
            style={{ width: 4, borderRadius: 3, background: LOVIFY.orangeGradient, display: 'block' }}
            initial={{ height: 8 }}
            animate={{ height: [10, h, 12, h - 6, 10] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── 07 · "What would you like to achieve?" — the interactive heart ──
// Multi-select goals; tapping a card expands to reveal HOW personalized music
// delivers it (Moongate-style). Selected goals drive the "Lovify can help"
// turn on the next screen.
// Benefit statements follow Moongate's formula: the core benefit + the
// mechanism, in one line (no problem, no how-to, no bullets).
const ACHIEVE_GOALS: { id: string; emoji: string; label: string; how: string }[] = [
  { id: 'best-self', emoji: '🌟', label: 'Become my best self', how: 'Step into a stronger identity with songs written around who you’re becoming.' },
  { id: 'life-love', emoji: '💖', label: 'Create a life I love', how: 'Make your dream life feel inevitable with music about the life you want.' },
  { id: 'confidence', emoji: '✨', label: 'Feel confident & unstoppable', how: 'Walk in unstoppable with personal hype anthems built around your strengths.' },
  { id: 'calm', emoji: '😌', label: 'Calm my mind', how: 'Quiet a racing mind with soothing tracks made just for you.' },
  { id: 'self-doubt', emoji: '🧠', label: 'Quiet the self-doubt', how: 'Replace the inner critic with words that build you up, on repeat.' },
  { id: 'manifest', emoji: '🎯', label: 'Manifest a specific goal', how: 'Lock in on your goal with a song you rehearse every single day.' },
];

export function V3_Achieve({ value, setValue, onNext, onBack }: MultiProps) {
  const [open, setOpen] = useState<string | null>(null);
  const tap = (id: string) => {
    setOpen((o) => (o === id ? o : id)); // expand on tap; keep open when re-tapping
    setValue(toggle(value, id));
  };
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading
        title={<>What would you like to <LovAccent>create</LovAccent>?</>}
        subcopy="Select all that apply"
        titleStyle={{ fontSize: 25 }}
      />
      {/* Shared gradient def so every check mark (cards + dropdown bullets) resolves it. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="lovselcheck" x1="0" y1="0" x2="20" y2="20">
            <stop offset="0%" stopColor="#F5B73D" />
            <stop offset="100%" stopColor="#D85C1C" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {ACHIEVE_GOALS.map((g) => {
          const selected = value.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => tap(g.id)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '15px 17px', borderRadius: 18,
                background: selected ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.92)',
                border: `1.5px solid ${selected ? LOVIFY.orange : LOVIFY.line}`,
                transition: 'all 180ms ease',
                boxShadow: selected ? '0 10px 22px -12px rgba(216,92,28,0.35)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{g.emoji}</span>
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 15.5, fontWeight: 700, color: LOVIFY.ink }}>{g.label}</span>
                {selected && (
                  <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="10" fill="url(#lovselcheck)" />
                    <path d="M5.5 10.5L8.5 13.5L14.5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
              <AnimatePresence initial={false}>
                {open === g.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ margin: '9px 0 0', paddingLeft: 34, fontFamily: SANS, fontSize: 13.5, lineHeight: 1.45, color: LOVIFY.sub }}>
                      {g.how}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div style={{ padding: '10px 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext} disabled={value.length === 0}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 07 · The turn — "Lovify can help you with that" ───────────
// No repeat of the goal list — just the promise + a one-mechanism, two-line
// explanation of how it helps (Moongate's "we use X shown to do Y" formula).
export function V3_LovifyHelps({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<><LovAccent>Lovify</LovAccent> can help you with that.</>}
      visual={<ImgHero src={heroTransform} size={340} web={web} />}
      web={web}
      body={<>We turn your goals into personalized songs so the words you repeat become who you are.</>}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Product walkthrough + proof + founder (08–15). Three real in-app
// screenshots (ported from the live "fast" onboarding) show what Lovify
// actually does, then a familiarity quiz → two-beat "we analyzed the top
// songs" proof → "that's why we built Lovify" bridge → founder story.
// ═══════════════════════════════════════════════════════════════

// ─── Feature demo as a ROLEPLAY chat — a flowy pattern-interrupt ──
// Rather than static screenshots, we ACT OUT a real session: a sample person
// ("Maya") chats with Lovify, uploads her photo, talks about her dream, and
// watches Lovify generate her vision + song. It auto-plays both sides (bot
// typing dots + her replies) like a sped-up real conversation, then a "Make
// mine" button continues. Same bubble look as the real song chat.
type DemoSong = { cover: string; vision: string; title: string; sub: string; audio: string };
type DemoEvent =
  | { who: 'bot'; text: string }
  | { who: 'user'; reply: string; photo?: string; pick?: boolean } // tap the reply; if photo, posts a photo bubble; if pick, advanced via the per-song "I love this one" buttons
  | { who: 'bot'; lyrics: string[]; title?: string } // a card of lines (lyrics / beliefs); title sets the header
  | { who: 'bot'; songset: DemoSong[] };      // two finished songs, each w/ vision + play

// The two finished demo songs (real audio), each with its own vision image.
const DEMO_SONGS: DemoSong[] = [
  { cover: demoCover, vision: demoVision, title: 'Spotlight', sub: 'Upbeat Pop Anthem', audio: demoSong1 },
  { cover: demoVision, vision: demoCover, title: 'Fearless', sub: 'Empowering Anthem', audio: demoSong2 },
];

// Web-funnel demo song — ONE song: the real nurse comeback track, with her
// photo as the row art and her Disneyland vision on top. App keeps DEMO_SONGS
// untouched.
const WEB_DEMO_SONGS: DemoSong[] = [
  { cover: nursePhoto, vision: nurseVision, title: "Comin' Back to Life", sub: 'Comeback Anthem', audio: nurseSong },
];

// A full create session, acted out: intro → dream → detail → why → photo →
// music style → lyrics → vision → song. The user advances by tapping a single,
// specific reply that appears right under the bot's message; the tapped reply
// becomes their bubble.
const DEMO_SCRIPT: DemoEvent[] = [
  { who: 'bot', text: "Hey, I'm Lovify 👋 I'll show you an example of how it works." },
  { who: 'bot', text: "What's a dream you're reaching for?" },
  { who: 'user', reply: "I want to feel confident and finally believe in myself." },
  { who: 'bot', text: "Love that. Paint me the picture — what does it look like?" },
  { who: 'user', reply: "Honestly? Dancing on stage as a singer, totally fearless ✨" },
  { who: 'bot', text: "Why does that matter so much to you?" },
  { who: 'user', reply: "I've hidden my voice my whole life. I'm done playing small." },
  { who: 'bot', text: "Beautiful. Want to be in your song? Add a photo." },
  { who: 'user', reply: '📷 Add photo', photo: demoPhoto },
  { who: 'bot', text: "Perfect 🙌 What sound do you love?" },
  { who: 'user', reply: "An upbeat pop anthem — something stadium-huge." },
  { who: 'bot', text: "Here are your lyrics 🎶" },
  { who: 'bot', lyrics: ['I step into the light, I’m not afraid', 'Every doubt I had just fades away', 'This is my stage, this is my time', 'Watch me rise — the spotlight’s mine'] },
  { who: 'user', reply: "I love it ❤️" },
  { who: 'bot', text: "Perfect — I created two songs for you, each with a vision ✨" },
  { who: 'bot', songset: DEMO_SONGS },
  { who: 'bot', text: "Press play once a day and these words rewire your mind." },
  { who: 'user', reply: "Okay, this is incredible 😭" },
];

// Web-funnel variant of the demo session (kept fully separate so the native
// app's DEMO_SCRIPT is never touched). Acts out the NURSE COMEBACK — the
// winning ad formula: pain → root cause (lost herself) → turning point →
// action steps → the amazing life. Same 3 questions the real song chat asks,
// so the demo teaches the user exactly what's about to happen to them.
const WEB_DEMO_SCRIPT: DemoEvent[] = [
  { who: 'bot', text: "Hey, I'm Lovify. 👋 Let me show you an example of how to make your first Comeback Song." },
  { who: 'bot', text: "Step 1 — vent it 😤 What's paining you in your life right now?" },
  // Rapid-fire venting: three short chips in a row, in the raw voice of someone
  // who's actually pissed off — so the viewer imagines firing off their own.
  { who: 'user', reply: "I work my ass off and I'm still drowning" },
  { who: 'user', reply: "I freaking hate who I've become" },
  { who: 'user', reply: "I don't even recognize myself anymore" },
  { who: 'bot', text: "I hear you. Somewhere along the way, you gave it all away — and lost yourself. Let's get her back." },
  // Dream comes SECOND (best case first — lighter), then the steps.
  { who: 'bot', text: "Step 2 — the magic wand 🪄 If you could change anything about you or your life, what would you wish for?" },
  { who: 'user', reply: "Waking up excited for my day" },
  { who: 'user', reply: "Proud of what I see in the mirror" },
  { who: 'user', reply: "My family saying I seem happier ✨" },
  { who: 'bot', text: "That's where we're going. Step 3 — build the comeback version of you, like creating your character 🎮 Pick her traits and daily moves:" },
  { who: 'user', reply: "Wake up early. Make time for herself." },
  { who: 'user', reply: "Get her body moving again" },
  { who: 'user', reply: "Plan the life she actually wants" },
  { who: 'bot', text: "That's the comeback plan. Add your photo so you can see her — the you you're coming back to." },
  { who: 'user', reply: '📷 Add photo', photo: nursePhoto },
  { who: 'bot', text: "Perfect 🙌 What's the energy of your comeback song?" },
  { who: 'user', reply: "A comeback anthem 🔥" },
  { who: 'bot', text: "Here's your comeback song — from the life you hate to the life you love:" },
  // Near-verbatim lines from the winning "Nurse" formula.
  { who: 'bot', title: 'Your lyrics', lyrics: [
    'Twelve-hour shift, came home to an empty place',
    "Caught my reflection, didn't know that face",
    'I forgot who I was — gave it all away',
    'God, I miss who I used to be',
    "Hit play every mornin', rewirin' my mind",
    "Wake up before my alarm, makin' time for me",
    'Daughter said "mama, you\'re glowin\', what did you do?"',
    "I'm not just survivin' — I'm finally livin' the life I choose",
  ] },
  { who: 'user', reply: "Turn it into a song 🎶" },
  { who: 'bot', text: "Perfect — here's your song, with your vision ✨" },
  { who: 'bot', text: "Press play, then save your song below" },
  { who: 'bot', songset: WEB_DEMO_SONGS },
  // Picked via the per-song "I love this one" buttons (pick: true → no bottom chip).
  { who: 'user', reply: "Saved! ❤️", pick: true },
  // Ritual + yes-beat — the retention frame, then straight at the heart.
  { who: 'bot', text: "Tomorrow morning, when your alarm goes off — press play. Every day you listen, you rewire." },
  { who: 'bot', text: "Can you feel how this could pull someone out?" },
  { who: 'user', reply: "Yes, honestly I can." },
  { who: 'bot', text: "That's Lovify — one comeback at a time." },
  { who: 'user', reply: "I'm ready to make mine 🔥" },
];

type DemoMsg = {
  id: number; role: 'bot' | 'user';
  kind: 'text' | 'typing' | 'photo' | 'lyrics' | 'songset';
  text?: string; img?: string; lines?: string[]; songs?: DemoSong[]; title?: string;
};

export function V3_FeatureChat({ onNext, onBack, web, playing, onToggleSound }: NavProps & { web?: boolean; playing?: boolean; onToggleSound?: () => void }) {
  // The web funnel runs its own demo script (WEB_DEMO_SCRIPT); the native app
  // keeps the original DEMO_SCRIPT untouched.
  const script = useMemo<DemoEvent[]>(() => (web ? WEB_DEMO_SCRIPT : DEMO_SCRIPT), [web]);
  const [msgs, setMsgs] = useState<DemoMsg[]>([]);
  const [cursor, setCursor] = useState(0);     // next script index to reveal
  const [waiting, setWaiting] = useState(false); // bot is "typing" the next line
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nid = () => ++idRef.current;

  // Push a bot event (user turns are pushed in tapUser with the chosen chip).
  const pushEvent = (ev: DemoEvent) => {
    setMsgs((m) => {
      if ('text' in ev) return [...m, { id: nid(), role: ev.who, kind: 'text', text: ev.text }];
      if ('lyrics' in ev) return [...m, { id: nid(), role: 'bot', kind: 'lyrics', lines: ev.lyrics, title: ev.title }];
      if ('songset' in ev) return [...m, { id: nid(), role: 'bot', kind: 'songset', songs: ev.songset }];
      return m;
    });
  };

  // Reveal all consecutive BOT events from `from`, one at a time with typing
  // dots, then stop at the next USER turn (which becomes a tappable button).
  const playBotsFrom = (from: number) => {
    let i = from;
    const step = () => {
      if (i >= script.length) { setCursor(i); setWaiting(false); return; }
      const ev = script[i];
      if (ev.who !== 'bot') { setCursor(i); setWaiting(false); return; } // hand off to the user button
      setWaiting(true);
      setMsgs((m) => [...m, { id: nid(), role: 'bot', kind: 'typing' }]);
      const tt = setTimeout(() => {
        setMsgs((m) => m.filter((x) => x.kind !== 'typing'));
        pushEvent(ev);
        i += 1;
        const tn = setTimeout(step, 480);
        timers.current.push(tn);
      }, 820);
      timers.current.push(tt);
    };
    step();
  };

  // Kick off: play the opening bot line(s) until the first user turn.
  useEffect(() => {
    playBotsFrom(0);
    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the newest message. Pin to the bottom whenever the
  // transcript grows — new bubbles, the typing indicator, the pending reply
  // chip, or the final CTA — so nothing ever lands below the fold.
  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(() => {
    scrollToEnd();
    // Re-pin after layout settles (chips/CTA mount, fonts/images reflow).
    const r = requestAnimationFrame(scrollToEnd);
    const t = setTimeout(scrollToEnd, 120);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [msgs, cursor, waiting]);

  // User taps their reply → post it (as text, or a photo bubble if this turn
  // carries a photo), then resume the bot from the next index.
  const tapUser = () => {
    const ev = script[cursor];
    if (!ev || ev.who !== 'user') return;
    if (ev.photo) {
      setMsgs((m) => [...m, { id: nid(), role: 'user', kind: 'photo', img: ev.photo }]);
    } else {
      setMsgs((m) => [...m, { id: nid(), role: 'user', kind: 'text', text: ev.reply }]);
    }
    playBotsFrom(cursor + 1);
  };

  // The per-song "I love this one" buttons advance the demo, but only when the
  // current turn is actually the pick step (so tapping an old song row later is
  // a no-op). The bottom reply chip is hidden for this step.
  const tapPick = () => {
    const ev = script[cursor];
    if (ev && ev.who === 'user' && ev.pick) tapUser();
  };

  const pending = !waiting && cursor < script.length ? script[cursor] : null;
  const finished = cursor >= script.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: LOVIFY.bg }}>
      {/* Header — same identity as the song chat, with a "demo" tag. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 12px', borderBottom: `1px solid ${LOVIFY.line}`, position: 'relative' }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: LOVIFY.ink, fontSize: 22, lineHeight: 1 }}>‹</button>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <LovLogo size={28} />
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: LOVIFY.ink, letterSpacing: 0.2 }}>Lovify</div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: LOVIFY.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: '#34c759', display: 'inline-block' }} /> Online
          </div>
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: LOVIFY.orangeDeep, background: 'rgba(255,251,244,0.95)', border: `1px solid ${LOVIFY.line}`, borderRadius: 999, padding: '5px 10px' }}>
          DEMO
        </span>
        {/* Web: the music toggle lives here in the header, right of DEMO (the
            floating one is suppressed for this step so it doesn't overlap). */}
        {web && onToggleSound && (
          <button
            onClick={onToggleSound}
            aria-label={playing ? 'Mute sound' : 'Play sound'}
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 17, cursor: 'pointer', padding: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill={LOVIFY.ink} />
              {playing ? (
                <>
                  <path d="M16 8.5a4 4 0 0 1 0 7" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M18.5 6a7 7 0 0 1 0 12" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : (
                <path d="M17 9l5 6M22 9l-5 6" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Transcript — the pending user reply appears inline, right under the
          bot's last message (a tappable suggestion bubble). */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {msgs.map((m) => <DemoBubble key={m.id} msg={m} onMedia={scrollToEnd} web={web} onPick={tapPick} />)}
        {pending && pending.who === 'user' && !pending.pick && (
          <motion.div
            key={cursor}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, maxWidth: '88%' }}
          >
            {/* Explicit affordance — make it unmistakable this is a tap target. */}
            <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, color: LOVIFY.orangeDeep, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Tap to reply <span style={{ fontSize: 13 }}>👆</span>
            </span>
            <motion.button
              onClick={tapUser}
              aria-label={`Reply: ${pending.reply}`}
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                cursor: 'pointer', textAlign: 'left',
                padding: '12px 12px 12px 18px', borderRadius: 999,
                background: LOVIFY.orangeGradientSoft, border: `2px solid ${LOVIFY.orange}`,
                color: LOVIFY.orangeDeep, fontFamily: SANS, fontSize: 14.5, fontWeight: 800, lineHeight: 1.3,
                display: 'inline-flex', alignItems: 'center', gap: 11,
                boxShadow: '0 10px 22px -8px rgba(216,92,28,0.55)',
              }}
            >
              <span>{pending.reply}</span>
              {/* Send-style icon so it reads as an action, not a chat bubble. */}
              <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 14, background: LOVIFY.orangeGradient, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, boxShadow: '0 4px 10px -4px rgba(216,92,28,0.7)' }}>↑</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Footer — only the final "Make mine" once the demo plays out. */}
      <div style={{ flexShrink: 0, padding: '8px 16px 26px', minHeight: finished ? 70 : 0 }}>
        {finished && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <LovPrimary onClick={() => {
              // Leaving the demo: stop any playing demo song and bring the
              // ambient soundtrack back (only if it was ducked — i.e. it was on)
              // within THIS click gesture, so the browser allows the resume.
              document.querySelectorAll('audio[data-demo-song]').forEach((el) => (el as HTMLAudioElement).pause());
              restoreAmbient();
              onNext();
            }}>{web ? 'Continue' : 'Make mine'}</LovPrimary>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DemoBubble({ msg, onMedia, web, onPick }: { msg: DemoMsg; onMedia?: () => void; web?: boolean; onPick?: () => void }) {
  const isBot = msg.role === 'bot';
  if (msg.kind === 'typing') {
    return (
      <div style={{ alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
        <div style={{ ...bubbleBase, background: isBot ? 'rgba(120,110,100,0.12)' : LOVIFY.orangeGradientSoft, color: LOVIFY.ink, display: 'flex', gap: 4, padding: '14px 16px' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: 'rgba(80,70,60,0.45)', display: 'inline-block', animation: 'lovPulse 1s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    );
  }
  if (msg.kind === 'photo') {
    // The user's uploaded selfie — small framed square, right-aligned.
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ alignSelf: 'flex-end' }}>
        <img src={msg.img} alt="Uploaded photo" style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 18, border: `2px solid ${LOVIFY.orange}` }} />
      </motion.div>
    );
  }
  if (msg.kind === 'lyrics') {
    const lines = msg.lines || [];
    const isLabel = (l: string) => /^\(.*\)$/.test(l.trim());
    if (web) {
      // Web: a clean lyric card. Now that we only show the chorus it's short, so
      // render the lines as proper song lyrics — serif italic, centered, with
      // airy spacing. Section names (if any) become quiet small-caps dividers.
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
          <div style={{ borderRadius: 20, padding: '18px 20px 18px', background: 'rgba(255,251,244,0.96)', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 10px 24px -16px rgba(58,42,34,0.5)' }}>
            <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: LOVIFY.orangeDeep, marginBottom: 12, textAlign: 'center' }}>{msg.title || 'Your lyrics'}</div>
            {lines.map((l, i) => (
              isLabel(l) ? (
                <div key={i} style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: LOVIFY.subSoft, textAlign: 'center', margin: i === 0 ? '0 0 8px' : '16px 0 8px' }}>
                  {l.replace(/[()]/g, '').trim()}
                </div>
              ) : (
                <div key={i} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16.5, fontWeight: 500, lineHeight: 1.75, color: LOVIFY.ink, textAlign: 'center' }}>{l}</div>
              )
            ))}
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
        <div style={{ borderRadius: 18, padding: '14px 16px', background: 'rgba(255,251,244,0.95)', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 10px 24px -16px rgba(58,42,34,0.5)' }}>
          <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: LOVIFY.orangeDeep, marginBottom: 8 }}>{msg.title || 'Your lyrics'}</div>
          {lines.map((l, i) => (
            <div key={i} style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', lineHeight: 1.6, color: LOVIFY.ink }}>{l}</div>
          ))}
        </div>
      </motion.div>
    );
  }
  if (msg.kind === 'songset') {
    return <DemoSongSet songs={msg.songs || []} web={web} onMedia={onMedia} onPick={onPick} />;
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={{ alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
      <div style={{
        ...bubbleBase,
        background: isBot ? 'rgba(120,110,100,0.12)' : LOVIFY.orangeGradient,
        color: isBot ? LOVIFY.ink : '#fff',
        borderBottomLeftRadius: isBot ? 6 : 20,
        borderBottomRightRadius: isBot ? 20 : 6,
      }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

const bubbleBase: CSSProperties = {
  padding: '12px 16px', borderRadius: 20,
  fontFamily: SANS, fontSize: 15, lineHeight: 1.4, fontWeight: 500,
  boxShadow: '0 2px 8px -4px rgba(58,42,34,0.2)',
};

// Duck the ambient soundtrack while a demo song plays, then restore it — but
// only if it was actually playing (so a muted soundtrack stays muted). Shared
// at module scope so playing a second song doesn't lose the "resume" flag.
let ambientWasPlaying = false;
function duckAmbient() {
  const amb = document.querySelector('audio[data-ambient]') as HTMLAudioElement | null;
  if (amb && !amb.paused) { ambientWasPlaying = true; amb.pause(); }
}
function restoreAmbient() {
  const amb = document.querySelector('audio[data-ambient]') as HTMLAudioElement | null;
  if (amb && ambientWasPlaying) { amb.play().catch(() => {}); }
  ambientWasPlaying = false;
}

// Animated "now playing" waveform — a few bars bouncing in height so the
// viewer can tell a song is on during the demo.
function MiniWave() {
  const bars = [11, 17, 9, 18, 13, 16, 10];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 18, marginTop: 3 }} aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          style={{ width: 3, borderRadius: 2, background: LOVIFY.orange, display: 'block' }}
          animate={{ height: [h * 0.4, h, h * 0.55, h * 0.9, h * 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

// A "magical" reveal for the vision board (web): a glowing halo blooms, the
// image develops in from soft-blur, a light shimmer sweeps across it once, and
// a few sparkles drift up around it.
function MagicalVision({ src, onMedia }: { src: string; onMedia?: () => void }) {
  const sparkles = [
    { x: '6%', y: '14%', d: 0.25, s: 15 }, { x: '90%', y: '10%', d: 0.55, s: 19 },
    { x: '94%', y: '64%', d: 0.85, s: 13 }, { x: '4%', y: '74%', d: 0.45, s: 16 },
    { x: '48%', y: '-4%', d: 0.7, s: 14 }, { x: '70%', y: '88%', d: 1.0, s: 15 },
  ];
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Glow halo bloom */}
      <motion.div
        aria-hidden
        style={{ position: 'absolute', inset: -14, borderRadius: 30, background: 'radial-gradient(circle at 50% 42%, rgba(245,183,61,0.6), rgba(237,122,42,0.18) 55%, transparent 75%)', filter: 'blur(14px)', zIndex: 0 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 1, 0.6], scale: [0.9, 1.06, 1] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
      {/* The vision developing in */}
      <motion.div
        style={{ position: 'relative', zIndex: 1, width: '100%', borderRadius: 22, overflow: 'hidden', background: '#000', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 18px 40px -20px rgba(58,42,34,0.6)' }}
        initial={{ opacity: 0, scale: 0.92, filter: 'blur(16px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={src} alt="" onLoad={onMedia} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} loading="eager" />
        {/* one-time light sweep */}
        <motion.div
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)' }}
          initial={{ x: '-130%' }}
          animate={{ x: '130%' }}
          transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.55 }}
        />
      </motion.div>
      {/* Drifting sparkles */}
      {sparkles.map((sp, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ position: 'absolute', left: sp.x, top: sp.y, fontSize: sp.s, zIndex: 2, pointerEvents: 'none' }}
          initial={{ opacity: 0, scale: 0.4, y: 6 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.6], y: [6, -10, -18] }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: sp.d, repeat: Infinity, repeatDelay: 1.6 }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}

// The finished-songs card: a shared vision image + one row per song. Holds the
// "has any song been played yet" state so the attention-grabbing play-button
// pulse + "tap to play" hint switch OFF the moment the viewer plays a song
// (otherwise the other row keeps flashing while they're listening — annoying).
function DemoSongSet({ songs, web, onMedia, onPick }: { songs: DemoSong[]; web?: boolean; onMedia?: () => void; onPick?: () => void }) {
  const [anyPlayed, setAnyPlayed] = useState(false);
  const topVision = songs[0]?.vision;
  const showPing = !!web && !anyPlayed;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ alignSelf: 'stretch', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* One shared vision on top — magical reveal on web, plain on app. */}
      {topVision && (web ? (
        <MagicalVision src={topVision} onMedia={onMedia} />
      ) : (
        <div style={{ width: '100%', borderRadius: 22, overflow: 'hidden', background: '#000', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 18px 40px -20px rgba(58,42,34,0.6)' }}>
          <img src={topVision} alt="" onLoad={onMedia} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} loading="eager" />
        </div>
      ))}
      {/* Web: a clear instruction to press play — disappears once they do. */}
      {showPing && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.4 }}
          style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.3, color: LOVIFY.orangeDeep, textAlign: 'center' }}
        >
          👇 Tap ▶ to hear each song
        </motion.div>
      )}
      {/* On web, each row carries a "Save Song" pick button. Rows shimmer in with
          a stagger so the whole reveal feels alive. */}
      {songs.map((s, i) => (
        web ? (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.9 + i * 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <DemoSongRow song={s} showPing={showPing} onPlay={() => setAnyPlayed(true)} onPick={onPick} />
          </motion.div>
        ) : (
          <DemoSongRow key={i} song={s} showPing={showPing} onPlay={() => setAnyPlayed(true)} onPick={undefined} />
        )
      ))}
    </motion.div>
  );
}

// A finished demo song row — play/pause + title, with the MiniWave shown while
// it's playing. Only one song plays at a time, and the ambient soundtrack ducks
// out while a song is playing.
function DemoSongRow({ song, onPick, showPing, onPlay }: { song: DemoSong; onPick?: () => void; showPing?: boolean; onPlay?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  // If the viewer advances mid-song, stop the song and bring the soundtrack back.
  useEffect(() => () => {
    const a = audioRef.current;
    if (a && !a.paused) { a.pause(); restoreAmbient(); }
  }, []);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();             // fires onPause → setPlaying(false)
      restoreAmbient();
    } else {
      // Stop + rewind any other demo song first, then duck the ambient track.
      document.querySelectorAll('audio[data-demo-song]').forEach((el) => {
        if (el !== a) { const o = el as HTMLAudioElement; o.pause(); o.currentTime = 0; }
      });
      duckAmbient();
      // Always start from the top so each play lets you hear the song from the
      // beginning (and A/B the two versions cleanly).
      a.currentTime = 0;
      a.play().then(() => { setPlaying(true); onPlay?.(); }).catch(() => {});
    }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,251,244,0.97)', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 10px 24px -16px rgba(58,42,34,0.5)' }}>
      <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
        {/* "Ping" ring — an expanding pulse behind the play button to draw the
            eye. Off once any song has been played (showPing) or this one is. */}
        {showPing && !playing && (
          <motion.span
            aria-hidden
            style={{ position: 'absolute', inset: 0, borderRadius: 24, background: LOVIFY.orange }}
            animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          animate={showPing && !playing ? { scale: [1, 1.09, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: showPing && !playing ? Infinity : 0, ease: 'easeInOut' }}
          style={{ position: 'relative', width: 48, height: 48, borderRadius: 24, border: 'none', cursor: 'pointer', background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -8px rgba(216,92,28,0.65)' }}
        >
          <span style={{ color: '#fff', fontSize: 18, marginLeft: playing ? 0 : 2 }}>{playing ? '⏸' : '▶'}</span>
        </motion.button>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 800, color: LOVIFY.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
        {playing
          ? <MiniWave />
          : <div style={{ fontFamily: SANS, fontSize: 12.5, color: LOVIFY.sub }}>{song.sub}</div>}
      </div>
      {onPick && (
        <motion.button
          onClick={onPick}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap',
            padding: '9px 14px', borderRadius: 999,
            background: LOVIFY.orangeGradient, border: 'none', color: '#fff',
            fontFamily: SANS, fontSize: 12.5, fontWeight: 800, lineHeight: 1,
            boxShadow: '0 8px 18px -8px rgba(216,92,28,0.6)',
          }}
        >
          Save Song
        </motion.button>
      )}
      <audio
        ref={audioRef}
        src={song.audio}
        data-demo-song
        preload="none"
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); restoreAmbient(); }}
      />
    </div>
  );
}

// ─── 11 · Familiarity quiz ─────────────────────────────────────
export function V3_Familiarity({ value, setValue, onNext, onBack }: SingleProps) {
  const opts = [
    { e: '🤔', l: "I've never thought about it" },
    { e: '💡', l: "I've noticed it a little" },
    { e: '🎯', l: "Yeah — I feel it daily" },
    { e: '💯', l: "It runs my whole mood" },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading
        title={<>Are you aware how music and lyrics <LovAccent>shape your life</LovAccent>?</>}
        titleStyle={{ fontSize: 23 }}
      />
      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {opts.map((o) => (
          <button
            key={o.l}
            onClick={() => setValue(o.l)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              padding: '16px 18px', borderRadius: 18,
              background: value === o.l ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.92)',
              border: `1.5px solid ${value === o.l ? LOVIFY.orange : LOVIFY.line}`,
              display: 'flex', alignItems: 'center', gap: 13,
              fontFamily: SANS, fontSize: 15.5, fontWeight: 700, color: LOVIFY.ink,
              boxShadow: '0 8px 18px -12px rgba(216,92,28,0.4)', transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{o.e}</span>
            <span>{o.l}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 30px', flexShrink: 0 }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// Negative-emotion words in #1 hits, recreated from the real study data:
// negative-emotion word use rose by more than a third from 1973→2023.
// Source: Martins et al., "Societal crises disrupt long-term increases in
// stress, negativity, and simplicity in US Billboard song lyrics from 1973 to
// 2023," Scientific Reports (Nature), 2025 — 20,186 Billboard Hot 100 songs,
// Univ. of Vienna. We redraw the trend rather than embed the copyrighted figure.
// Shared clean chart card shell — soft surface, generous padding, a title, the
// SVG plot, and a small caption. Keeps both charts visually consistent.
function ChartCard({ title, caption, children, web }: { title: string; caption: string; children: ReactNode; web?: boolean }) {
  return (
    <div style={{ width: '100%', maxWidth: web ? 380 : 300, background: '#fff', border: `1px solid ${LOVIFY.line}`, borderRadius: 20, padding: web ? '20px 20px 16px' : '16px 16px 12px', boxShadow: '0 12px 30px -18px rgba(58,42,34,0.4)' }}>
      <div style={{ fontFamily: SANS, fontSize: web ? 15 : 12.5, fontWeight: 700, color: LOVIFY.inkSoft, textAlign: 'center', marginBottom: web ? 14 : 10 }}>
        {title}
      </div>
      {children}
      <div style={{ fontFamily: SANS, fontSize: web ? 11.5 : 9.5, color: LOVIFY.subSoft, textAlign: 'center', marginTop: web ? 12 : 8, lineHeight: 1.3 }}>
        {caption}
      </div>
    </div>
  );
}

// Rising bars — cleaner: faint baseline, evenly-spaced rounded bars, sparse
// year labels. Negative-emotion words in hit songs climbing over 50 years.
function NegativityChart({ web }: { web?: boolean }) {
  const bars = [30, 36, 42, 49, 56, 64];
  const labels = ['1973', '', '', '', '', '2023'];
  // Taller geometry on web so the chart fills more of the phone screen.
  const W = 300, H = web ? 220 : 150, padX = 14, topY = web ? 18 : 16, baseY = H - 24, max = 72;
  const slot = (W - padX * 2) / bars.length;
  const bw = slot * 0.5;
  const labelSize = web ? 12 : 10;
  return (
    <ChartCard web={web} title="Negativity in hit songs" caption="Scientific Reports (Nature), 2025 · 20,186 songs">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="negbar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7C04A" />
            <stop offset="100%" stopColor="#E8743A" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="rgba(166,109,56,0.18)" strokeWidth="1" />
        {bars.map((b, i) => {
          const h = (b / max) * (baseY - topY);
          const x = padX + i * slot + (slot - bw) / 2;
          const y = baseY - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={h} rx={bw / 2.6} fill="url(#negbar)" />
              {labels[i] && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontFamily={SANS} fontSize={labelSize} fill={LOVIFY.subSoft}>{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// Smooth rising area line — cleaner: faint baseline, soft fill, a single end
// dot. Anxiety & depression climbing over time.
function RisingLineChart({ title, web }: { title: string; web?: boolean }) {
  const pts = [22, 27, 33, 41, 50, 60, 72];
  // Taller geometry on web so the chart fills more of the phone screen.
  const W = 300, H = web ? 220 : 150, padX = 16, topY = web ? 18 : 16, baseY = H - 24, max = 84;
  const stepX = (W - padX * 2) / (pts.length - 1);
  const coords = pts.map((p, i) => [padX + i * stepX, baseY - (p / max) * (baseY - topY)] as [number, number]);
  // Smooth the path with simple midpoint quadratic curves.
  let line = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 1; i < coords.length; i++) {
    const [px, py] = coords[i - 1], [cx, cy] = coords[i];
    const mx = (px + cx) / 2;
    line += ` Q ${px} ${py} ${mx} ${(py + cy) / 2} T ${cx} ${cy}`;
  }
  const last = coords[coords.length - 1];
  const area = `${line} L ${last[0]} ${baseY} L ${coords[0][0]} ${baseY} Z`;
  return (
    <ChartCard web={web} title={title} caption="Rising anxiety & depression, young adults">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="riseline" x1="0" y1="0" x2="300" y2="0">
            <stop offset="0%" stopColor="#F7C04A" />
            <stop offset="100%" stopColor="#E8743A" />
          </linearGradient>
          <linearGradient id="risefill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(232,116,58,0.18)" />
            <stop offset="100%" stopColor="rgba(232,116,58,0)" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="rgba(166,109,56,0.18)" strokeWidth="1" />
        <path d={area} fill="url(#risefill)" />
        <path d={line} fill="none" stroke="url(#riseline)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill="#E8743A" stroke="#fff" strokeWidth="1.5" />
        <text x={padX} y={H - 6} fontFamily={SANS} fontSize={web ? 12 : 10} fill={LOVIFY.subSoft}>past</text>
        <text x={W - padX} y={H - 6} textAnchor="end" fontFamily={SANS} fontSize={web ? 12 : 10} fill={LOVIFY.subSoft}>today</text>
      </svg>
    </ChartCard>
  );
}

// ─── 12 · Proof, beat 1 — the top songs got more negative ──────
export function V3_Proof1({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Music has gotten <LovAccent>sadder and more negative</LovAccent> over the past 50 years.</>}
      visual={<NegativityChart web={web} />}
      web={web}
      body={<>Scientists analyzed 20,000+ hit songs — negative, stressful lyrics keep climbing, year after year.</>}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── 13 · Proof, beat 2 — and people got sadder too ────────────
export function V3_Proof2({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Over those same 50 years, people have gotten <LovAccent>sadder and more depressed</LovAccent>.</>}
      visual={<RisingLineChart title="Anxiety & depression over time" web={web} />}
      web={web}
      body={<>Sad music and negative lyrics plant limiting beliefs that keep us stuck in a negative cycle.</>}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── 14 · The turn — Lovify flips the loop (bridge into the demo) ──
export function V3_WhyBuilt({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Lovify helps you become the person you are <LovAccent>meant to be</LovAccent>.</>}
      visual={<ImgHero src={heroLives} size={320} web={web} />}
      web={web}
      body={<>Positive lyrics on repeat plant empowering beliefs that move you toward your dream life so you become the person living it.</>}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── 15 · Many ways to change your life with music ────────────
// Not about "making songs" — about the big moves members make in their lives,
// so the comeback song on the next screen reads as the smart starting move.
const SONG_IDEAS: { e: string; t: string }[] = [
  { e: '🎯', t: 'Achieve a big goal' },
  { e: '🔥', t: 'Start your comeback' },
  { e: '💪', t: 'Overcome a big struggle' },
  { e: '🎁', t: 'Gift a song to a friend' },
  { e: '🏆', t: 'Imagine yourself a winner' },
  { e: '📸', t: 'Capture a life memory' },
];
export function V3_SongIdeas({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>There are many ways to <LovAccent>change your life</LovAccent> with music.</>}
      visual={
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 340 }}>
          {SONG_IDEAS.map((s) => (
            <div key={s.t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px', borderRadius: 14, background: 'rgba(255,251,244,0.95)', border: `1.5px solid ${LOVIFY.line}`, boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)' }}>
              <span style={{ fontSize: 18 }}>{s.e}</span>
              <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: LOVIFY.ink }}>{s.t}</span>
            </div>
          ))}
        </div>
      }
      web={web}
      body={<>Every big move in your life can become a song you live to.</>}
      cta="Continue"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── 16 · The Comeback Song — the method, taught before the demo ──
// The heads-up that makes the demo's "what do you hate about your life?"
// land as step 1 of a known process instead of an ambush.
const COMEBACK_STEPS: { e: string; t: string }[] = [
  { e: '❌', t: "Vent out what's bugging you" },
  { e: '✨', t: 'Describe the best version of you' },
  { e: '🧭', t: 'Pick the traits & habits that get you there' },
];
export function V3_ComebackMethod({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  return (
    <SocReveal
      title={<>Let&apos;s start with the <LovAccent>Comeback Song</LovAccent>.</>}
      visual={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
          <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: LOVIFY.orangeDeep, padding: '0 4px' }}>
            How to make it
          </div>
          {COMEBACK_STEPS.map((s, i) => (
            <div key={s.t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 14px', borderRadius: 16, background: 'rgba(255,251,244,0.95)', border: `1.5px solid ${LOVIFY.line}`, boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.e}</span>
              <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: LOVIFY.ink }}>{i + 1}. {s.t}</span>
            </div>
          ))}
        </div>
      }
      web={web}
      body={<>We turn it into your anthem. Press play every morning.</>}
      cta="Show me how it works"
      onNext={onNext}
      onBack={onBack}
    />
  );
}

// ─── Tracking (ATT) — "Allow limited tracking" ────────────────
// Warm pre-prompt (same background as the rest of the flow) that frames WHY we
// ask, with a faithful mockup of the native iOS ATT sheet. The buttons fire the
// REAL requestTrackingPermission() so the OS prompt surfaces, then advance.
export function V3_Tracking({ onNext, onBack }: NavProps) {
  const respond = () => {
    // Fire the OS prompt (no-op on web); advance whatever the user picks.
    Promise.resolve(requestTrackingPermission()).catch(() => {}).finally(() => onNext?.());
  };
  const attBtn: CSSProperties = {
    display: 'block', width: '100%', padding: '13px 12px',
    background: 'transparent', border: 'none',
    color: '#0A84FF', fontSize: 17, fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
    cursor: 'pointer',
  };
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      {/* Headline — top */}
      <LovHeading
        title={<>Allow limited <LovAccent>tracking</LovAccent>.</>}
        titleStyle={{ fontSize: 24 }}
      />

      {/* Native ATT sheet mockup — center */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 24px' }}>
        <div style={{ width: '100%', maxWidth: 320, borderRadius: 14, overflow: 'hidden', background: 'rgba(248,248,250,0.97)', boxShadow: '0 24px 60px -20px rgba(58,42,34,0.45)', fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif' }}>
          <div style={{ padding: '20px 18px 14px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: 12 }}>
              <LovLogo size={40} />
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 600, color: '#000', letterSpacing: -0.3 }}>
              Allow "Lovify" to track your activity across other companies' apps and websites?
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.35, color: 'rgba(0,0,0,0.85)' }}>
              This lets us understand how you found Lovify so we can reach more people like you.
            </div>
          </div>
          <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.36)' }}>
            <button style={{ ...attBtn, fontWeight: 400 }}>Ask App Not to Track</button>
            <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.36)' }} />
            {/* "Allow" is the action we're nudging toward — a pulsing glow + a
                bouncing finger cue make it read as the obvious tap target. */}
            <div style={{ position: 'relative' }}>
              <motion.div
                aria-hidden
                style={{ position: 'absolute', inset: '3px 8px', borderRadius: 10, background: 'rgba(10,132,255,0.16)', pointerEvents: 'none' }}
                animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.97, 1, 0.97] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.button
                style={{ ...attBtn, fontWeight: 600, position: 'relative', zIndex: 1 }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                Allow
              </motion.button>
              <motion.span
                aria-hidden
                style={{ position: 'absolute', right: 24, top: '50%', fontSize: 24, pointerEvents: 'none', zIndex: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                animate={{ y: ['-30%', '-10%', '-30%'], rotate: [-8, 4, -8] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                👆
              </motion.span>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting copy — bottom */}
      <div style={{ flexShrink: 0, padding: '0 28px 16px' }}>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 16, lineHeight: 1.5, fontWeight: 500, color: LOVIFY.inkSoft, textAlign: 'center' }}>
          Help us understand how people like you discover Lovify — so we can share our vision with the world.
        </p>
      </div>
      {/* Continue mirrors the sheet's choice (fires the ATT prompt, advances)
          so the user can move ahead from the CTA too — consistent with the flow. */}
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={respond}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Review prompt — "Just a few more questions" (App Store rating) ──
// Native-style rating sheet to capture an App Store review at peak excitement.
export function V3_Review({ onNext, onBack }: NavProps) {
  const [rated, setRated] = useState(0);
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading
        title={<>Just a few more <LovAccent>questions</LovAccent>.</>}
        titleStyle={{ fontSize: 24 }}
      />

      {/* Native rating sheet mockup — center */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 24px' }}>
        <div style={{ width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden', background: 'rgba(248,248,250,0.97)', boxShadow: '0 24px 60px -20px rgba(58,42,34,0.45)', fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif' }}>
          <div style={{ padding: '20px 18px 6px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <LovLogo size={34} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>Enjoying Lovify?</div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 2 }}>Tap a star to rate it on the App Store.</div>
            </div>
          </div>
          <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.3)', marginTop: 14, padding: '16px 18px', display: 'flex', justifyContent: 'center', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRated(n)}
                aria-label={`${n} stars`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 30, lineHeight: 1, color: n <= rated ? '#F5B73D' : 'transparent', WebkitTextStroke: n <= rated ? '0' : '1.6px #0A84FF', transition: 'all 120ms ease' }}
              >
                ★
              </button>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid rgba(60,60,67,0.3)' }}>
            <button style={{ display: 'block', width: '100%', padding: '13px 12px', background: 'transparent', border: 'none', color: '#0A84FF', fontSize: 16, fontWeight: 500, fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif', cursor: 'pointer' }}>
              Not Now
            </button>
          </div>
        </div>
      </div>

      {/* Supporting copy + CTA — bottom */}
      <div style={{ flexShrink: 0, padding: '0 28px 16px' }}>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 16, lineHeight: 1.5, fontWeight: 500, color: LOVIFY.inkSoft, textAlign: 'center' }}>
          Your answers help us tailor Lovify to your needs.
        </p>
      </div>
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Referral — "Did a professional refer you?" (6 options) ────
// The options double as social proof: the kinds of people who recommend
// Lovify (therapists, athletes, coaches, founders…), plus a self-found path.
export function V3_Referral({ value, setValue, onNext, onBack, onSkip }: SingleProps) {
  const opts = [
    { e: '🧠', l: 'Therapist' },
    { e: '🏆', l: 'Pro athlete' },
    { e: '⭐', l: 'High performer' },
    { e: '🧘', l: 'Coach' },
    { e: '🚀', l: 'Founder' },
    { e: '🔎', l: 'A friend / found it myself' },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovSkip onClick={onSkip} />
      <LovHeading
        title={<>Did a professional <LovAccent>refer</LovAccent> you to Lovify?</>}
        titleStyle={{ fontSize: 23 }}
      />

      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((o) => (
          <button
            key={o.l}
            onClick={() => setValue(o.l)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              padding: '15px 18px', borderRadius: 18,
              background: value === o.l ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.92)',
              border: `1.5px solid ${value === o.l ? LOVIFY.orange : LOVIFY.line}`,
              display: 'flex', alignItems: 'center', gap: 13,
              fontFamily: SANS, fontSize: 15.5, fontWeight: 700, color: LOVIFY.ink,
              boxShadow: '0 8px 18px -12px rgba(216,92,28,0.4)', transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{o.e}</span>
            <span>{o.l}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 30px', flexShrink: 0 }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 04. Our Story (founder) ────────────────────────────────────

export function V3_04_Story({ onNext, onBack }: NavProps) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      {/* Scrollable story so the Continue button can stay pinned + visible. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
      <div style={{ padding: '0 26px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: SANS, fontSize: 11.5, fontWeight: 800,
            color: LOVIFY.orangeDeep, letterSpacing: 1.6,
            textTransform: 'uppercase', marginBottom: 8,
          }}
        >
          From Our Founder
        </div>
        <h1
          style={{
            margin: 0, fontFamily: SANS, fontWeight: 600,
            fontSize: 22, letterSpacing: -0.5, color: LOVIFY.ink, lineHeight: 1.2,
          }}
        >
          The #1 app for creating a life you love
        </h1>
      </div>

      {/* Founder photo — compact rounded frame, centered */}
      <div style={{ padding: '14px 26px 0', display: 'flex', justifyContent: 'center' }}>
        <img
          src={kaitlinPhoto}
          alt="Kaitlin O'Toole, Founder of Lovify"
          style={{
            display: 'block', width: '100%', maxWidth: 156,
            aspectRatio: '1 / 1', objectFit: 'cover',
            objectPosition: '50% 22%',
            borderRadius: 20,
            boxShadow: '0 14px 28px -14px rgba(58, 42, 34, 0.35)',
          }}
        />
      </div>

      <div style={{ padding: '16px 28px 0' }}>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, color: LOVIFY.inkSoft, letterSpacing: 0.05 }}>
          “In 2017, doctors gave me five years to live. I was sick, sad, depressed — I'd just lost my job and my relationship.
        </p>
        <p style={{ margin: '14px 0 0', fontFamily: SANS, fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, color: LOVIFY.inkSoft, letterSpacing: 0.05 }}>
          My therapist asked me, <span style={{ fontStyle: 'italic' }}><LovAccent>“What makes you happy?”</LovAccent></span> But the truth was I couldn't even remember what happiness felt like.
        </p>
        <p style={{ margin: '14px 0 0', fontFamily: SANS, fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, color: LOVIFY.inkSoft, letterSpacing: 0.05 }}>
          So I started focusing on falling in love with life again, and turned to positive music to feel better. Eight months later, my whole body healed and my life changed. <span style={{ fontStyle: 'italic' }}><LovAccent>That's why I created Lovify.</LovAccent></span>
        </p>
        <p style={{ margin: '14px 0 0', fontFamily: SANS, fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, color: LOVIFY.inkSoft, letterSpacing: 0.05 }}>
          To help you fall back in love with life, too.”
        </p>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: LOVIFY.ink, letterSpacing: 0.6 }}>
            — KAITLIN O'TOOLE
          </div>
          <div style={{ marginTop: 2, fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: LOVIFY.subSoft, letterSpacing: 1, textTransform: 'uppercase' }}>
            Founder of Lovify
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 30px 0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, fontStyle: 'italic', color: LOVIFY.subSoft, lineHeight: 1.4, letterSpacing: 0.1 }}>
          Kaitlin's personal experience. Lovify is not a medical treatment.
        </p>
      </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 24px 28px' }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 05. The Promise (HERO) ─────────────────────────────────────

export function V3_05_Promise({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  const heading = (
    <LovHeading
      title={<>Unlock the power of <LovAccent>personalized</LovAccent> music.</>}
      titleStyle={{ fontSize: 22 }}
    />
  );
  const sub = (
    <p style={{ margin: 0, fontFamily: SANS, fontSize: 15.5, lineHeight: 1.5, fontWeight: 400, color: LOVIFY.sub, letterSpacing: 0.05, textAlign: 'center' }}>
      Create a life you love by programming the beliefs and feelings of the best version of you!
    </p>
  );
  if (web) {
    // Balanced bands: headline / image / subcopy each centered in its own space.
    return (
      <LovScreen>
        <LovBack onClick={onBack} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{heading}</div>
          <div style={{ flex: 2, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px' }}>
            <img
              src={becomeCards}
              alt="You today versus the you that's coming back"
              style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>{sub}</div>
        </div>
        <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
          <LovPrimary onClick={onNext}>Continue</LovPrimary>
        </div>
      </LovScreen>
    );
  }
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      {/* Headline only — image sits beneath it, subheadline below the image. */}
      {heading}

      <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'center' }}>
        <img
          src={becomeCards}
          alt="You today versus the you that's coming back"
          style={{ display: 'block', width: '100%', maxWidth: 330, height: 'auto' }}
        />
      </div>

      {/* Spacer pushes the subheadline down, closer to the button. */}
      <div style={{ flex: 1 }} />

      <div style={{ padding: '0 30px 22px', textAlign: 'center' }}>
        {sub}
      </div>
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 06. Pain Q1 ────────────────────────────────────────────────

export function V3_06_Pain1({ value, setValue, onNext, onBack }: SingleProps) {
  const opts = [
    { e: '🤩', l: 'I love it — and I want more' },
    { e: '🙂', l: "Some days I feel it, some I don't" },
    { e: '😐', l: 'Mostly just going through the motions' },
    { e: '😔', l: "Honestly, I've lost the spark" },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading
        title="How much do you love your life right now?"
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((o) => (
          <LovSelectRow
            key={o.l}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}><span style={{ fontSize: 20, lineHeight: 1 }}>{o.e}</span>{o.l}</span>}
            selected={value === o.l}
            onClick={() => setValue(o.l)}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 08. Reassurance ────────────────────────────────────────────

function V3_RisingCurve() {
  return (
    <svg width="100%" height="170" viewBox="0 0 320 170" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="v3fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ED7A2A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ED7A2A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v3line" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5B73D" />
          <stop offset="100%" stopColor="#D85C1C" />
        </linearGradient>
      </defs>
      {[40, 80, 120].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(166, 109, 56, 0.12)" strokeDasharray="2 4" />
      ))}
      {/* fill area fades in as the line draws */}
      <motion.path
        d="M0 143 C 32 140, 52 119, 90 125 C 120 130, 122 101, 140 105 C 174 112, 198 83, 236 89 C 272 95, 286 38, 320 16 L 320 170 L 0 170 Z"
        fill="url(#v3fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
      />
      {/* rising line draws on from Day 1 → Day 30 */}
      <motion.path
        d="M0 143 C 32 140, 52 119, 90 125 C 120 130, 122 101, 140 105 C 174 112, 198 83, 236 89 C 272 95, 286 38, 320 16"
        stroke="url(#v3line)" strokeWidth="3" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
      />
      {/* milestone dots fade in as the line reaches each one */}
      {[
        { x: 4, y: 142, big: false, delay: 0.05 },
        { x: 140, y: 105, big: false, delay: 0.6 },
        { x: 318, y: 17, big: true, delay: 1.2 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r={p.big ? 7 : 5}
          fill="#fff" stroke="#D85C1C" strokeWidth={p.big ? 2.5 : 2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: p.delay }}
        />
      ))}
    </svg>
  );
}

export function V3_08_Reassurance({
  joy, onNext, onBack,
}: {
  joy: string; onNext?: () => void; onBack?: () => void;
}) {
  const j = (joy || '').toLowerCase();
  const sub =
    j.includes('lost the spark') ? "Even when it feels far away, it comes back — a little each day."
    : j.includes('going through the motions') ? "That spark is still there. We'll help you feel it again."
    : j.includes('some days') ? "We'll help you feel that way more often than not."
    : j.includes('love it') ? "Let's take what you've already got even higher."
    : "We'll help you feel more like yourself, every day.";
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading
        title={<>Don't worry — <LovAccent>we're here to help</LovAccent>.</>}
        subcopy={sub}
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ margin: '24px 22px 0', padding: '20px 20px 16px', borderRadius: 24, background: 'rgba(255, 251, 244, 0.8)', border: `1px solid ${LOVIFY.line}`, position: 'relative' }}>
        {/* tooltip callout pops in once the line reaches the peak */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 1.25, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            position: 'absolute', top: 12, right: 14, zIndex: 2,
            transformOrigin: 'bottom right',
            padding: '6px 12px', borderRadius: 13,
            background: LOVIFY.orangeGradient, color: '#FFFCF4',
            fontFamily: SANS, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.2, lineHeight: 1.15, maxWidth: 130, textAlign: 'center',
            boxShadow: '0 8px 18px -8px rgba(216, 92, 28, 0.6)',
          }}
        >
          Loving life again
        </motion.div>
        <V3_RisingCurve />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: LOVIFY.subSoft, letterSpacing: 0.3 }}>
          <span>Day 1</span><span>Day 7</span><span>Day 30</span>
        </div>
      </div>

      <div style={{ margin: '16px 22px 0', padding: '18px 22px', borderRadius: 22, background: LOVIFY.orangeGradientSoft, border: '1px solid rgba(216, 92, 28, 0.18)', textAlign: 'left' }}>
        <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: LOVIFY.ink, lineHeight: 1.5, letterSpacing: 0.05 }}>
          It starts small. Press play each day, and the spark you thought you lost gets a little brighter — until you <LovAccent>love your life again</LovAccent>.
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 09. Multi-select goals ─────────────────────────────────────

export function V3_09_Goals({ value, setValue, onNext, onBack }: MultiProps) {
  const opts = [
    { e: '🔥', l: 'Feel alive again' },
    { e: '❤️', l: 'More love' },
    { e: '💰', l: 'More money' },
    { e: '✈️', l: 'Adventure & travel' },
    { e: '✨', l: 'More confidence' },
    { e: '🌿', l: 'Peace & calm' },
    { e: '💪', l: 'Strong in my body' },
    { e: '🚀', l: "Work that's truly mine" },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="What can we help you with?" subcopy="Pick all that resonate." />

      {/* options scroll internally so the header + Continue stay pinned */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map((o) => (
          <LovOption
            key={o.l}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}><span style={{ fontSize: 19, lineHeight: 1 }}>{o.e}</span>{o.l}</span>}
            selected={value.includes(o.l)}
            onClick={() => setValue(toggle(value, o.l))}
          />
        ))}
      </div>

      <div style={{ padding: '12px 24px 28px' }}>
        <LovPrimary disabled={value.length === 0} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 08. Time — how much of your day feels like yours (single) ──

export function V3_10_Deepen({ value, setValue, onNext, onBack }: SingleProps) {
  const opts = [
    'Barely any — my days are already full',
    'A little, here and there',
    'Some, but I want more',
    'Plenty',
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading
        title="How much time do you have to become who you want to be?"
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((o) => (
          <LovSelectRow key={o} label={o} selected={value === o} onClick={() => setValue(o)} />
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Reassurance — handles the "no time" objection (the music part) ──

export function V3_TimeReassurance({ onNext, onBack, web }: NavProps & { web?: boolean }) {
  const heading = (
    <LovHeading
      title={<>Good news, you don't need <LovAccent>more time</LovAccent>.</>}
      align="center"
      titleStyle={{ textAlign: 'center' }}
    />
  );
  const sub = (
    <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 600, color: LOVIFY.ink, lineHeight: 1.45, textAlign: 'center' }}>
      Music goes with you wherever you are.
    </div>
  );
  if (web) {
    // Balanced bands: headline / image / subcopy each centered in its own space.
    return (
      <LovScreen>
        <LovBack onClick={onBack} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{heading}</div>
          <div style={{ flex: 2, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <ImgHero src={heroDriving} size={300} web={web} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>{sub}</div>
        </div>
        <div style={{ padding: '0 24px 36px', flexShrink: 0 }}>
          <LovPrimary onClick={onNext}>Continue</LovPrimary>
        </div>
      </LovScreen>
    );
  }
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      {heading}

      {/* Image in the middle */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
        <ImgHero src={heroDriving} size={300} web={web} />
      </div>

      {/* Subheadline moved to the bottom */}
      <div style={{ padding: '0 30px 18px', textAlign: 'center' }}>
        {sub}
      </div>

      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── 09. The judo — when do you already press play (multi) ──────

export function V3_11_LeanedOn({ value, setValue, onNext, onBack }: MultiProps) {
  const opts = [
    { e: '🚗', l: 'Driving / commuting' },
    { e: '🚿', l: 'In the shower' },
    { e: '💪', l: 'Working out' },
    { e: '🧹', l: 'Cleaning or chores' },
    { e: '🌅', l: 'Getting ready' },
    { e: '🌙', l: 'Winding down at night' },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="When do you usually listen to music?" titleStyle={{ fontSize: 22 }} />

      <div style={{ padding: '24px 22px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map((o) => (
          <LovOption
            key={o.l}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}><span style={{ fontSize: 19, lineHeight: 1 }}>{o.e}</span>{o.l}</span>}
            selected={value.includes(o.l)}
            onClick={() => setValue(toggle(value, o.l))}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '14px 24px 28px' }}>
        <LovPrimary disabled={value.length === 0} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Favorite genres (multi-select pill grid) ───────────────────

export function V3_Genres({ value, setValue, onNext, onBack }: MultiProps) {
  const genres = [
    { e: '🎤', l: 'Pop' }, { e: '🎧', l: 'Hip Hop' }, { e: '🎵', l: 'R&B' }, { e: '🎸', l: 'Rock' },
    { e: '🎹', l: 'Electronic' }, { e: '🤠', l: 'Country' }, { e: '🙏', l: 'Gospel' }, { e: '🎷', l: 'Jazz' },
    { e: '🎻', l: 'Indie' }, { e: '🎙', l: 'Soul' }, { e: '🌴', l: 'Reggae' }, { e: '🎼', l: 'Classical' },
    { e: '💃', l: 'Latin' }, { e: '🪕', l: 'Folk' }, { e: '🔊', l: 'Alternative' }, { e: '🏠', l: 'House' },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="What kind of music do you listen to when you're the happiest?" titleStyle={{ fontSize: 22 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 22px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {genres.map((g) => {
          const sel = value.includes(g.l);
          return (
            <button
              key={g.l}
              onClick={() => setValue(toggle(value, g.l))}
              style={{
                padding: '14px 12px', borderRadius: 24,
                background: sel ? LOVIFY.orangeGradient : 'rgba(255, 251, 244, 0.75)',
                border: `1px solid ${sel ? 'transparent' : LOVIFY.line}`,
                color: sel ? '#FFFCF4' : LOVIFY.inkSoft,
                fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: 0.05,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                cursor: 'pointer', transition: 'all 180ms ease',
                boxShadow: sel ? '0 10px 22px -10px rgba(216, 92, 28, 0.5)' : 'none',
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>{g.e}</span>
              {g.l}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '12px 24px 28px' }}>
        <LovPrimary disabled={value.length === 0} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Attribution ────────────────────────────────────────────────

function SourceListRow({
  icon, label, color, selected, onClick,
}: {
  icon: string; label: string; color: string | null; selected?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 16,
        background: selected ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.75)',
        border: `1px solid ${selected ? LOVIFY.orange : LOVIFY.line}`,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        fontFamily: SANS, fontSize: 15, fontWeight: 600, color: LOVIFY.ink, letterSpacing: 0.05,
        transition: 'all 180ms ease',
      }}
    >
      <span
        style={{
          width: 28, height: 28, borderRadius: 14, flexShrink: 0,
          background: color || 'rgba(255, 240, 220, 0.85)',
          border: color ? 'none' : `1px solid ${LOVIFY.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#fff',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {selected && (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="9" fill="url(#srcsel2)" />
          <defs>
            <linearGradient id="srcsel2" x1="0" y1="0" x2="18" y2="18">
              <stop offset="0%" stopColor="#F5B73D" />
              <stop offset="100%" stopColor="#D85C1C" />
            </linearGradient>
          </defs>
          <path d="M5 9.5L8 12L13.5 6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}

export function V3_14_Source({ value, setValue, onNext, onBack, onSkip }: SingleProps) {
  const sources: { l: string; i: string; c: string | null }[] = [
    { l: 'Instagram', i: '📷', c: 'linear-gradient(135deg, #FFC371 0%, #FF5F6D 50%, #845EC2 100%)' },
    { l: 'TikTok', i: '♪', c: '#000' },
    { l: 'YouTube', i: '▶', c: '#FF0033' },
    { l: 'Facebook', i: 'f', c: '#1877F2' },
    { l: 'Influencer', i: '✨', c: null },
    { l: 'Podcast', i: '🎙', c: null },
    { l: 'Friend or family', i: '💛', c: null },
    { l: 'App Store', i: '🍎', c: null },
    { l: 'Web Search', i: '🔍', c: null },
    { l: 'ChatGPT or similar', i: '✦', c: 'linear-gradient(135deg, #10A37F 0%, #1A7F64 100%)' },
    { l: 'TV', i: '📺', c: null },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovSkip onClick={onSkip} />

      <LovHeading title="How did you hear about us?" titleStyle={{ fontSize: 22 }} />

      {/* Scrollable so the long list never pushes the Continue button off-screen. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sources.map((s) => (
          <SourceListRow key={s.l} icon={s.i} label={s.l} color={s.c} selected={value === s.l} onClick={() => setValue(s.l)} />
        ))}
      </div>

      <div style={{ flexShrink: 0, padding: '14px 24px 28px' }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Daily Nudge ────────────────────────────────────────────────

export function V3_16_Nudge({ onNext, onBack }: NavProps) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <div style={{ width: 78, height: 78, borderRadius: 39, background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 32px -10px rgba(216, 92, 28, 0.55)' }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <path d="M17 4C12 4 9 7.5 9 12.5V17.5L6.5 22H27.5L25 17.5V12.5C25 7.5 22 4 17 4Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M14 25C14.5 26.5 15.5 27 17 27C18.5 27 19.5 26.5 20 25" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <LovHeading
        title={<>The more you listen, <LovAccent>the faster it works</LovAccent>.</>}
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ margin: '28px 22px 0', padding: '14px 16px', borderRadius: 18, background: 'rgba(255, 251, 244, 0.85)', border: `1px solid ${LOVIFY.line}`, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 12px 26px -12px rgba(58, 42, 34, 0.25)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <LovLogo size={30} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: LOVIFY.ink, letterSpacing: 0.3 }}>LOVIFY</span>
            <span style={{ fontFamily: SANS, fontSize: 11, color: LOVIFY.sub }}>8:00 AM</span>
          </div>
          <div style={{ marginTop: 2, fontFamily: SANS, fontSize: 13.5, fontWeight: 500, color: LOVIFY.inkSoft, lineHeight: 1.35 }}>
            Good morning. Press play — she's waiting. ☕
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 26px 0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: LOVIFY.sub, letterSpacing: 0.05 }}>
          Positive music reprograms your mind to create a life you love. We'll remind you at the perfect moments.
        </p>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <LovPrimary onClick={async () => {
          // Fire the real OS notification prompt via OneSignal, then advance
          // regardless of the user's choice (we never block the flow on it).
          capturePostHogEvent('reminders_enabled', { flow: 'onboarding_v3', source: 'daily_nudge' });
          try { await promptPushPermission(); } catch { /* ignore */ }
          onNext?.();
        }}>Turn on reminders</LovPrimary>
        <LovGhost onClick={() => { capturePostHogEvent('reminders_skipped', { flow: 'onboarding_v3' }); onNext?.(); }}>Not now</LovGhost>
      </div>
      <div style={{ height: 28 }} />
    </LovScreen>
  );
}

// ─── 17. How Lovify Works ───────────────────────────────────────

export function V3_17_How({ onNext, onBack }: NavProps) {
  const steps = [
    {
      n: 1, t: 'Tell us who you want to become', d: 'The version of you you’re becoming.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4C7 4 4 7 4 11C4 12.5 4.5 14 5.5 15L4 18L7 17C8 17.7 9.5 18 11 18C15 18 18 15 18 11C18 7 15 4 11 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      n: 2, t: 'We turn it into a song', d: 'It rewires your mind to imagine you as that person now.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M8 4V15M14 7V18M8 15C8 16.7 6.5 18 5 18C3.5 18 2.5 16.7 2.5 15.5C2.5 14.3 3.5 13 5 13C6.5 13 8 14.3 8 15.5M14 18C14 19.7 12.5 21 11 21C9.5 21 8.5 19.7 8.5 18.5C8.5 17.3 9.5 16 11 16C12.5 16 14 17.3 14 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      n: 3, t: 'Press play, every day', d: 'You begin to become the person who creates a life you love.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M6 4L18 11L6 18Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none" />
        </svg>
      ),
    },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading
        title={<>Here's how <LovAccent>Lovify</LovAccent> works.</>}
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s) => (
          <div key={s.n} style={{ padding: '20px 20px', borderRadius: 22, background: 'rgba(255, 251, 244, 0.8)', border: `1px solid ${LOVIFY.line}`, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 6px 18px -10px rgba(58, 42, 34, 0.2)' }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFCF4', flexShrink: 0, boxShadow: '0 8px 14px -6px rgba(216, 92, 28, 0.5)' }}>
              {s.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: LOVIFY.orangeDeep, letterSpacing: 1.4 }}>
                STEP {String(s.n).padStart(2, '0')}
              </span>
              <div style={{ marginTop: 2, fontFamily: SANS, fontSize: 16, fontWeight: 700, color: LOVIFY.ink, letterSpacing: -0.1 }}>{s.t}</div>
              <div style={{ marginTop: 2, fontFamily: SANS, fontSize: 13.5, color: LOVIFY.sub, lineHeight: 1.4 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Upload your photo (face → dream-life image) ────────────────

export function V3_PhotoUpload({
  photos, setPhotos, onNext, onBack,
}: {
  photos?: (string | null)[];
  setPhotos?: (p: (string | null)[]) => void;
  onNext?: () => void; onBack?: () => void;
}) {
  // Self-contained fallback so the screen still works in the canvas / standalone.
  const [localPhotos, setLocalPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const pics = photos ?? localPhotos;
  const writePics = setPhotos ?? setLocalPhotos;

  // Most people only add themselves, so we lead with ONE big "You" slot and
  // tuck the extra people behind an opt-in "Add someone else" button.
  const [showMore, setShowMore] = useState(!!(pics[1] || pics[2] || pics[3]));

  // Read the chosen file as a data URL so we can both preview it now and,
  // in the live app, hand it straight to the vision generator (Gemini).
  const handleFile = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = [...pics];
      next[i] = reader.result as string;
      writePics(next);
    };
    reader.readAsDataURL(file);
  };

  const clear = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = [...pics];
    next[i] = null;
    writePics(next);
  };

  const hasFace = !!pics[0];

  // Small reusable tile renderer for the secondary "people" slots.
  const renderSmallSlot = (i: number) => {
    const src = pics[i];
    const on = !!src;
    return (
      <label
        key={i}
        style={{
          position: 'relative', overflow: 'hidden',
          aspectRatio: '1 / 1', borderRadius: 18,
          background: src ? `center / cover no-repeat url(${src})` : 'rgba(255, 251, 244, 0.7)',
          border: `2px ${on ? 'solid' : 'dashed'} ${on ? LOVIFY.orange : 'rgba(166, 109, 56, 0.35)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer', transition: 'all 180ms ease',
        }}
      >
        <input type="file" accept="image/*" onChange={(e) => handleFile(i, e)} style={{ display: 'none' }} />
        {on ? (
          <button
            type="button"
            onClick={(e) => clear(i, e)}
            aria-label="Remove photo"
            style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 44 44" fill="none">
              <rect x="6" y="13" width="32" height="23" rx="5" stroke={LOVIFY.orangeDeep} strokeWidth="2.6" />
              <circle cx="22" cy="24.5" r="6" stroke={LOVIFY.orangeDeep} strokeWidth="2.6" />
              <path d="M16 13L18.5 9H25.5L28 13" stroke={LOVIFY.orangeDeep} strokeWidth="2.6" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: LOVIFY.inkSoft }}>Add</span>
          </>
        )}
      </label>
    );
  };

  const youSrc = pics[0];

  return (
    <LovScreen padTop={72}>
      <LovBack onClick={onBack} />

      <LovHeading
        title="Add a photo of yourself"
        subcopy="We'll picture you living your dream. Just you is perfect — add others only if you want them in the scene."
        titleStyle={{ textAlign: 'center' }}
        subStyle={{ textAlign: 'center' }}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 30px 8px' }}>
        {/* ONE big "You" slot, front and center. */}
        <label
          style={{
            position: 'relative', overflow: 'hidden', display: 'block',
            width: '100%', maxWidth: 260, margin: '0 auto', aspectRatio: '1 / 1', borderRadius: 26,
            background: youSrc ? `center / cover no-repeat url(${youSrc})` : 'rgba(255, 251, 244, 0.7)',
            border: `2px ${youSrc ? 'solid' : 'dashed'} ${youSrc ? LOVIFY.orange : 'rgba(166, 109, 56, 0.4)'}`,
            cursor: 'pointer', transition: 'all 180ms ease',
            boxShadow: youSrc ? '0 16px 34px -18px rgba(216, 92, 28, 0.5)' : 'none',
          }}
        >
          <input type="file" accept="image/*" capture="user" onChange={(e) => handleFile(0, e)} style={{ display: 'none' }} />
          {youSrc ? (
            <>
              <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  <svg width="15" height="15" viewBox="0 0 26 26"><path d="M5 13.5L10.5 19L21 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                </div>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}>You</span>
              </div>
              <button
                type="button"
                onClick={(e) => clear(0, e)}
                aria-label="Remove photo"
                style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: LOVIFY.orangeGradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
                  <rect x="6" y="13" width="32" height="23" rx="5" stroke={LOVIFY.orangeDeep} strokeWidth="2.4" />
                  <circle cx="22" cy="24.5" r="6" stroke={LOVIFY.orangeDeep} strokeWidth="2.4" />
                  <path d="M16 13L18.5 9H25.5L28 13" stroke={LOVIFY.orangeDeep} strokeWidth="2.4" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 700, color: LOVIFY.ink }}>Add your photo</span>
            </div>
          )}
        </label>

        {/* Opt-in: add more people to the scene. */}
        {!showMore ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 18 }}>
            <button
              onClick={() => setShowMore(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
                fontFamily: SANS, fontSize: 14, fontWeight: 700, color: LOVIFY.orangeDeep,
                display: 'inline-flex', alignItems: 'center', gap: 7,
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>＋</span> Add someone else
            </button>
          </div>
        ) : (
          <div style={{ paddingTop: 18 }}>
            <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.inkSoft, letterSpacing: 0.2, textAlign: 'center', marginBottom: 10 }}>
              Others in your dream (optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[1, 2, 3].map((i) => renderSmallSlot(i))}
            </div>
          </div>
        )}

        <p style={{ margin: '18px 0 0', fontFamily: SANS, fontSize: 12.5, color: LOVIFY.subSoft, letterSpacing: 0.1, textAlign: 'center' }}>
          Private to you. Never shared. Delete anytime.
        </p>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <LovPrimary disabled={!hasFace} onClick={onNext}>Continue</LovPrimary>
        <LovGhost onClick={onNext}>Maybe later</LovGhost>
      </div>
      <div style={{ height: 20 }} />
    </LovScreen>
  );
}

// ─── What do you want your song to sound like? (AI styles) ──────

// Genre → tailored style templates (two descriptor variants each).
const SOUND_STYLE: Record<string, { e: string; t: string; d: [string, string] }> = {
  'Pop': { e: '👑', t: 'Uplifting Pop Anthem', d: ['Soaring vocals over bright, modern production.', 'Big radio-ready hooks and an irresistible lift.'] },
  'Hip Hop': { e: '🔥', t: 'Confident Hip-Hop Anthem', d: ['Hard-hitting 808s and a bold, triumphant flow.', 'Punchy drums and a swaggering, unstoppable energy.'] },
  'R&B': { e: '🌙', t: 'Soulful R&B Groove', d: ['Smooth keys, lush harmonies, and a deep pocket.', 'Velvet vocals over a slow, intimate groove.'] },
  'Rock': { e: '🎸', t: 'Cinematic Rock Anthem', d: ['Driving guitars building to a huge, stadium-sized moment.', 'Soaring riffs and a chorus that explodes with feeling.'] },
  'Electronic': { e: '⚡', t: 'Euphoric Electronic Build', d: ['Pulsing synths and a release that lifts you up.', 'A glowing build into a wide-open drop.'] },
  'Country': { e: '🤠', t: 'Heartfelt Country Ballad', d: ['Warm acoustic storytelling with honest vocals.', 'Rootsy guitars and a wide-open, hopeful heart.'] },
  'Gospel': { e: '🙏', t: 'Soaring Gospel Anthem', d: ['A rising choir and organ full of hope.', 'Hand-claps, harmonies, and pure uplift.'] },
  'Jazz': { e: '🎷', t: 'Smooth Jazz Serenade', d: ['Velvet horns and an easy, timeless swing.', 'Warm chords and a late-night, golden glow.'] },
  'Indie': { e: '🌿', t: 'Dreamy Indie Folk', d: ['Fingerpicked guitar and intimate, hopeful vocals.', 'Airy textures and a quietly powerful build.'] },
  'Soul': { e: '💛', t: 'Classic Soul Groove', d: ['Rich vocals and a warm, vintage feel.', 'Horns, organ, and a groove that hugs you.'] },
  'Reggae': { e: '🌴', t: 'Sunny Reggae Groove', d: ['Laid-back rhythm and an uplifting, breezy bounce.', 'Warm offbeats and pure good-vibes energy.'] },
  'Classical': { e: '🎻', t: 'Orchestral Inspirational', d: ['Sweeping strings building to a triumphant swell.', 'A cinematic rise that gives you chills.'] },
  'Latin': { e: '💃', t: 'Vibrant Latin Pop', d: ['Infectious rhythm, warm guitars, and pure joy.', 'Dancefloor heat with an irresistible pulse.'] },
  'Folk': { e: '🪕', t: 'Acoustic Folk Story', d: ['Honest lyrics over gentle, earthy instrumentation.', 'A campfire-warm, heartfelt singalong.'] },
  'Alternative': { e: '🔊', t: 'Anthemic Alt-Rock', d: ['Big guitars and an emotional, soaring chorus.', 'Moody verses that explode into light.'] },
  'House': { e: '🏠', t: 'Feel-Good House Groove', d: ['A four-on-the-floor pulse made to move you.', 'Warm bass and a euphoric, hands-up drop.'] },
};

export function V3_SoundStyle({
  genres, songAbout, detailText = '', scene = '', why = '', value, setValue, onNext, onBack,
  autoGenerate = true,
}: {
  genres: string[]; songAbout: string;
  detailText?: string; scene?: string; why?: string;
  value: string;
  setValue: (v: string) => void; onNext?: () => void; onBack?: () => void;
  autoGenerate?: boolean; // false in the review canvas so it doesn't spend API calls
}) {
  const [page, setPage] = useState(0);

  // ── Local template cards (offline fallback when the AI call can't run) ──
  const keys = Object.keys(SOUND_STYLE);
  const picked = genres.filter((g) => keys.includes(g));
  const pool = picked.length ? [...picked, ...keys.filter((g) => !picked.includes(g))] : keys;
  const variant = page % 2;
  const start = (page * 4) % pool.length;
  const templateCards = Array.from({ length: 4 }, (_, i) => {
    const g = pool[(start + i) % pool.length];
    const s = SOUND_STYLE[g];
    return { e: s.e, t: s.t, d: s.d[variant] };
  });

  // ── Live AI styles via suggest-song-styles, tuned to ALL their answers ──
  const [aiVibes, setAiVibes] = useState<SoundVibe[] | null>(null);
  const [loading, setLoading] = useState(autoGenerate);
  const [failed, setFailed] = useState(false); // only show templates if AI truly fails
  const seenRef = useRef<string[]>([]);
  const regenRef = useRef(0);
  const ctxStr = useMemo(
    () => buildStyleContext({ songAbout, detailText, scene, why, genres }),
    [songAbout, detailText, scene, why, genres],
  );

  const loadVibes = async (more: boolean) => {
    setLoading(true);
    try {
      const vibes = await suggestSoundStyles(ctxStr, more ? seenRef.current : [], regenRef.current);
      seenRef.current = [...seenRef.current, ...vibes.map((v) => v.name)];
      regenRef.current += 1;
      setAiVibes(vibes);
      setFailed(false);
    } catch {
      // AI couldn't run — fall back to local templates (and only then).
      setFailed(true);
      if (more) setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoGenerate) void loadVibes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Decide what to show:
  //   • AI vibes once they arrive
  //   • local templates ONLY if the AI failed (or in the no-AI canvas)
  //   • otherwise nothing yet → we render a loading state (no template flash)
  const usingAi = !!aiVibes;
  const useTemplates = !aiVibes && (failed || !autoGenerate);
  const showLoading = !aiVibes && !useTemplates; // true while the first call is in flight
  const cards = usingAi
    ? aiVibes!.map((v) => ({ e: v.emoji, t: v.name, d: v.description }))
    : (useTemplates ? templateCards : []);

  const cardTitles = cards.map((c) => c.t);
  const customText = cardTitles.includes(value) ? '' : value;

  const genreList = picked.slice(0, 3).join(', ') || 'the sounds you love';
  const ctx = songAbout.trim();
  const sub = `Tuned to the ${genreList} you love${ctx ? `, for a song about ${ctx.charAt(0).toLowerCase()}${ctx.slice(1)}` : ''}.`;

  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="What do you want your song to sound like?" subcopy={sub} titleStyle={{ fontSize: 22 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {showLoading ? (
          // Loading state only — we NEVER show templates first and then refresh.
          // Pulsing skeletons while the AI tunes 4 styles to this exact dream.
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 74, borderRadius: 20, padding: '16px 18px',
                  background: 'rgba(255, 251, 244, 0.6)', border: `1px solid ${LOVIFY.line}`,
                  display: 'flex', gap: 12, alignItems: 'center',
                  animation: 'lovPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.12}s`,
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(166,109,56,0.18)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '55%', height: 12, borderRadius: 6, background: 'rgba(166,109,56,0.18)' }} />
                  <div style={{ width: '85%', height: 10, borderRadius: 5, marginTop: 8, background: 'rgba(166,109,56,0.12)' }} />
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', paddingTop: 6, fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: LOVIFY.orangeDeep }}>
              ✨ Tuning 4 sounds to your dream…
            </div>
          </>
        ) : (
          <>
            {cards.map((c) => {
              const sel = value === c.t;
              return (
                <button
                  key={c.t}
                  onClick={() => setValue(c.t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '16px 18px', borderRadius: 20,
                    background: sel ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.75)',
                    border: `1.5px solid ${sel ? LOVIFY.orange : LOVIFY.line}`,
                    display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer',
                    transition: 'all 180ms ease',
                    boxShadow: sel ? '0 10px 22px -12px rgba(216, 92, 28, 0.35)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1.1, flexShrink: 0 }}>{c.e}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: SANS, fontSize: 15.5, fontWeight: 700, color: LOVIFY.ink, letterSpacing: -0.1 }}>{c.t}</span>
                    <span style={{ display: 'block', marginTop: 3, fontFamily: SANS, fontSize: 13, lineHeight: 1.4, color: LOVIFY.sub }}>{c.d}</span>
                  </span>
                </button>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
              <button
                disabled={loading}
                onClick={() => {
                  // AI mode → ask Claude for 4 genuinely-new vibes; offline → page templates.
                  if (usingAi) void loadVibes(true);
                  else setPage((i) => i + 1);
                }}
                style={{
                  background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', padding: '6px 10px',
                  opacity: loading ? 0.5 : 1,
                  fontFamily: SANS, fontSize: 14, fontWeight: 700, color: LOVIFY.orangeDeep,
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                }}
              >
                <span style={{ fontSize: 15 }}>✨</span> {loading ? 'Tuning to you…' : 'Show me 4 more'}
              </button>
            </div>

            <input
              type="text"
              value={customText}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Or describe the sound yourself…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 16px', borderRadius: 16,
                background: customText ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.7)',
                border: `1.5px solid ${customText ? LOVIFY.orange : LOVIFY.line}`,
                fontFamily: SANS, fontSize: 14.5, color: LOVIFY.ink, outline: 'none',
              }}
            />
          </>
        )}
      </div>

      <div style={{ padding: '12px 24px 28px' }}>
        <LovPrimary disabled={!value.trim()} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Who should sing your anthem? (voice) ───────────────────────

export function V3_Voice({ value, setValue, onNext, onBack }: SingleProps) {
  const opts = [
    { e: '👩‍🎤', l: 'Female voice' },
    { e: '👨‍🎤', l: 'Male voice' },
  ];
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="Who should sing your anthem?" titleStyle={{ fontSize: 22 }} />

      <div style={{ padding: '30px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {opts.map((o) => {
          const sel = value === o.l;
          return (
            <button
              key={o.l}
              onClick={() => setValue(o.l)}
              style={{
                width: '100%', padding: '22px 22px', borderRadius: 22, textAlign: 'left',
                background: sel ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.78)',
                border: `1.5px solid ${sel ? LOVIFY.orange : LOVIFY.line}`,
                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                transition: 'all 180ms ease',
                boxShadow: sel ? '0 10px 22px -12px rgba(216, 92, 28, 0.35)' : 'none',
              }}
            >
              <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{o.e}</span>
              <span style={{ flex: 1, fontFamily: SANS, fontSize: 17, fontWeight: sel ? 700 : 500, color: sel ? LOVIFY.ink : LOVIFY.inkSoft }}>{o.l}</span>
              {sel && (
                <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="11" fill="url(#voicesel)" />
                  <defs><linearGradient id="voicesel" x1="0" y1="0" x2="22" y2="22"><stop offset="0%" stopColor="#F5B73D" /><stop offset="100%" stopColor="#D85C1C" /></linearGradient></defs>
                  <path d="M6 11.5L9.5 15L16 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary disabled={!value} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Let's make your first song (free hype transition) ──────────

export function V3_MakeSong({ onNext, onBack }: NavProps) {
  return (
    <LovScreen padTop={80}>
      <LovBack onClick={onBack} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center', marginTop: -20 }}>
        <div style={{ position: 'relative', marginBottom: 30 }}>
          <div style={{ position: 'absolute', inset: -22, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,183,61,0.45) 0%, rgba(245,183,61,0) 70%)', animation: 'lovPulse 3s ease-in-out infinite' }} />
          <div style={{ position: 'relative', width: 92, height: 92, borderRadius: 46, background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 22px 40px -12px rgba(216, 92, 28, 0.6)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M9 18V6l10-2v12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6.5" cy="18" r="2.5" stroke="#fff" strokeWidth="1.8" /><circle cx="16.5" cy="16" r="2.5" stroke="#fff" strokeWidth="1.8" /></svg>
          </div>
        </div>

        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: -0.6, lineHeight: 1.15, color: LOVIFY.ink }}>
          Let's make your comeback song.
        </h1>
        <p style={{ marginTop: 14, marginBottom: 0, fontFamily: SANS, fontSize: 16, lineHeight: 1.5, fontWeight: 500, color: LOVIFY.sub, maxWidth: 300 }}>
          It's on us — completely free. Three honest questions, and we'll turn your story into your comeback anthem.
        </p>
      </div>

      <div style={{ padding: '0 24px 36px' }}>
        <LovPrimary onClick={onNext}>Let's start</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── What will your first song be about? (preset or free type) ──

export function V3_SongAbout({ value, setValue, onNext, onBack }: SingleProps) {
  const opts = [
    { e: '🌟', l: 'Who I want to be' },
    { e: '✨', l: 'Something I want to experience' },
    { e: '💪', l: 'Overcoming a problem' },
    { e: '❤️', l: 'Someone I love' },
  ];
  const presets = opts.map((o) => o.l);
  const customText = presets.includes(value) ? '' : value;
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading title="What will your first song be about?" titleStyle={{ fontSize: 22 }} />

      <div style={{ padding: '26px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((o) => (
          <LovOption
            key={o.l}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}><span style={{ fontSize: 19, lineHeight: 1 }}>{o.e}</span>{o.l}</span>}
            selected={value === o.l}
            onClick={() => setValue(o.l)}
          />
        ))}
        <input
          type="text"
          value={customText}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Or tell us in your own words…"
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 2,
            padding: '16px 18px', borderRadius: 18,
            background: customText ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.7)',
            border: `1.5px solid ${customText ? LOVIFY.orange : LOVIFY.line}`,
            fontFamily: SANS, fontSize: 15, color: LOVIFY.ink, outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '14px 24px 36px' }}>
        <LovPrimary disabled={!value.trim()} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Smart detail — big writing box + "Help me imagine" ideas ───

// Turns the user's "song about" answer into a natural phrase, reused across the
// detail / scene / why screens so each question feels like it heard them.
function dreamRef(songAbout: string): string {
  const t = (songAbout || '').trim();
  if (!t) return 'this';
  const map: Record<string, string> = {
    'Who I want to be': 'becoming who you want to be',
    'Something I want to experience': 'this experience',
    'Overcoming a problem': 'overcoming this',
    'Someone I love': 'this love',
  };
  return map[t] || `“${t}”`;
}

// Kickstart prompts under "Help me imagine" — vivid, full-sentence scene
// starters in the same spirit as the Create tab's idea drawer, so a blank
// page never stalls the user. Tapping one drops a specific seed to build on.
const DETAIL_IDEAS = [
  'I wake up in a home that\'s finally mine — sunlight on the floors, coffee in my hands, no rush in my chest',
  'I\'m standing on a stage, the crowd on their feet, and for the first time I feel completely sure of who I am',
  'I check my account and there\'s real money there — I breathe out, knowing I\'m safe and free',
  'I\'m strong and healthy, moving through my day with energy, proud of the body I\'ve built',
  'I\'m surrounded by people who love me — laughing around a table, fully myself, fully wanted',
  'I\'m somewhere new and beautiful — salt air, an open road, the world wide open in front of me',
  'I\'m doing work that\'s truly mine, lost in it, knowing this is exactly what I was made for',
  'I look in the mirror and I love who\'s looking back — calm, confident, finally at peace',
];

export function V3_SongDetail({
  songAbout, text, setText, onNext, onBack,
}: {
  songAbout: string; text: string; setText: (v: string) => void; onNext?: () => void; onBack?: () => void;
}) {
  const [showIdeas, setShowIdeas] = useState(false);
  // Empty box → use the idea as the seed; otherwise append on a new line so
  // people can stack a few starters and edit them.
  const addIdea = (idea: string) => {
    const base = text.trim();
    setText(base ? `${base}\n${idea}` : idea);
  };
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <div style={{ padding: '0 26px', textAlign: 'center', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: -0.5, color: LOVIFY.ink }}>
          Describe {dreamRef(songAbout)} in specific detail.
        </h1>
      </div>

      {/* Scrollable body so the page still scrolls when the ideas list is open. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 8px' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Be specific… e.g. “I walk into my own home, sunlight on the floors, my family laughing in the kitchen…”"
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            padding: '16px 18px', borderRadius: 18,
            background: 'rgba(255, 251, 244, 0.7)',
            border: `1.5px solid ${text.trim() ? LOVIFY.orange : LOVIFY.line}`,
            fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: LOVIFY.ink, outline: 'none',
          }}
        />

        {/* help me imagine — reveals tappable scene-starters */}
        <div style={{ padding: '14px 0 0', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setShowIdeas((s) => !s)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
              fontFamily: SANS, fontSize: 14, fontWeight: 700, color: LOVIFY.orangeDeep,
              display: 'inline-flex', alignItems: 'center', gap: 7, letterSpacing: 0.1,
            }}
          >
            <span style={{ fontSize: 15 }}>✨</span>
            {showIdeas ? 'Hide ideas' : 'Help me imagine'}
          </button>
        </div>

        {showIdeas && (
          <div style={{ padding: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {DETAIL_IDEAS.map((s) => (
              <button
                key={s}
                onClick={() => addIdea(s)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '13px 15px', borderRadius: 14,
                  background: 'rgba(255, 251, 244, 0.85)', border: `1px solid ${LOVIFY.line}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  fontFamily: SANS, fontSize: 13.5, lineHeight: 1.45, color: LOVIFY.inkSoft,
                }}
              >
                <span style={{ color: LOVIFY.orangeDeep, fontWeight: 800, flexShrink: 0 }}>+</span>
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 24px 28px', flexShrink: 0 }}>
        <LovPrimary disabled={!text.trim()} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Imagine living it — immersive scene capture (free text) ────

export function V3_SongScene({
  songAbout, value, setValue, onNext, onBack,
}: {
  songAbout: string; value: string; setValue: (v: string) => void; onNext?: () => void; onBack?: () => void;
}) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <div style={{ padding: '0 26px', textAlign: 'center' }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: LOVIFY.orangeDeep, letterSpacing: 0.3, marginBottom: 10 }}>
          Beautiful — let's go deeper.
        </div>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: -0.5, color: LOVIFY.ink }}>
          Close your eyes and imagine {dreamRef(songAbout)}, right now.
        </h1>
        <p style={{ marginTop: 12, marginBottom: 0, fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: LOVIFY.sub }}>
          What's around you? Where are you? What's happening in this moment?
        </p>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe that moment — paint the whole picture."
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            padding: '16px 18px', borderRadius: 18,
            background: 'rgba(255, 251, 244, 0.7)',
            border: `1.5px solid ${value.trim() ? LOVIFY.orange : LOVIFY.line}`,
            fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: LOVIFY.ink, outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 28px' }}>
        <LovPrimary disabled={!value.trim()} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Why it matters — the emotional heart (free text) ───────────

export function V3_SongWhy({
  songAbout, value, setValue, onNext, onBack,
}: {
  songAbout: string; value: string; setValue: (v: string) => void; onNext?: () => void; onBack?: () => void;
}) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <div style={{ padding: '0 26px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: -0.5, color: LOVIFY.ink }}>
          Why does {dreamRef(songAbout)} matter so much to you?
        </h1>
        <p style={{ marginTop: 12, marginBottom: 0, fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: LOVIFY.sub }}>
          This is the heart of your song. There's no wrong answer.
        </p>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Say it from the heart…"
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            padding: '16px 18px', borderRadius: 18,
            background: 'rgba(255, 251, 244, 0.7)',
            border: `1.5px solid ${value.trim() ? LOVIFY.orange : LOVIFY.line}`,
            fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: LOVIFY.ink, outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 28px' }}>
        <LovPrimary disabled={!value.trim()} onClick={onNext}>Continue</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Your lyrics (review + edit, then Generate Song) ────────────
// PREVIEW STAND-IN: these lyrics are generated client-side from the user's
// answers. In the live app, replace buildLyricsV3() with a call to the
// existing `creative-assistant` edge function (show_lyrics tool) so the real
// LLM prompt writes the lyrics from the collected answers.

function seedLine(s: string, fallback: string) {
  const clean = (s || '').trim().replace(/\s+/g, ' ');
  if (!clean) return fallback;
  const words = clean.split(' ').slice(0, 9).join(' ').replace(/[.,;]+$/, '');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildTitleV3(songAbout: string) {
  const t = (songAbout || '').toLowerCase();
  if (/\blove\b|someone/.test(t)) return 'By My Side';
  if (/money|wealth|rich|abundance/.test(t)) return "Everything I've Built";
  if (/confiden/.test(t)) return 'Unstoppable';
  if (/becom|who i want/.test(t)) return "The One I'm Becoming";
  if (/experience|adventure|travel|see the world/.test(t)) return 'Wide Open';
  if (/problem|overcom|through|stronger/.test(t)) return 'Rise';
  return 'Coming Alive';
}

function buildLyricsV3(a: { songAbout: string; scene: string; why: string }, version: number) {
  const sceneLine = seedLine(a.scene, 'Every door is open wide');
  const whyLine = seedLine(a.why, 'This is everything I am');
  const choruses = [
    ["I'm coming alive, I feel it now", "Stepping into all that I'm about", 'No more waiting — this moment is mine', "I'm exactly who I'm meant to be"],
    ['Watch me rise, watch me shine', 'Every dream of mine aligns', 'Finally home inside my skin', 'This is where my life begins'],
    ["I can feel the light I'm walking toward", "Everything I wanted, and so much more", 'I let it in, I let it grow', "This is the life I always knew"],
  ];
  const ch = choruses[version % choruses.length];
  return `[Verse 1]
I can see it clear as morning light
${sceneLine}
No more standing still, no more doubt
This is the life I'm stepping into

[Pre-Chorus]
And everything I dreamed of starts today
${whyLine}

[Chorus]
${ch[0]}
${ch[1]}
${ch[2]}
${ch[3]}`;
}

export function V3_Lyrics({
  songAbout, detailText = '', scene, why, soundStyle = '', voice = '', genres = [], onLyrics, onNext, onBack,
  autoGenerate = true,
}: {
  songAbout: string; detailText?: string; scene: string; why: string;
  soundStyle?: string; voice?: string; genres?: string[];
  // Bubble the final (AI or edited) lyrics + title up to the flow so the
  // magic-moment can feed them to Mureka.
  onLyrics?: (l: { title: string; style: string; content: string }) => void;
  onNext?: () => void; onBack?: () => void;
  autoGenerate?: boolean; // false in the review canvas so it doesn't spend API calls
}) {
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState(() => buildTitleV3(songAbout));
  const [loading, setLoading] = useState(autoGenerate);
  const [streaming, setStreaming] = useState(false); // true once text starts revealing
  const [failed, setFailed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fullRef = useRef('');   // latest known full lyrics
  const typedRef = useRef(0);   // chars revealed so far
  const typerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!autoGenerate) { setLyrics(buildLyricsV3({ songAbout, scene, why }, 0)); return; }
    let cancelled = false;
    setLoading(true); setStreaming(false); setFailed(false);

    // Typewriter reveal → the "being written live" feel. The backend emits the
    // lyrics in one tool-call chunk (it can't token-stream), so we animate the
    // text in ourselves toward the latest known full text.
    const startTyper = () => {
      if (typerRef.current || cancelled) return;
      typerRef.current = setInterval(() => {
        if (cancelled) return;
        const full = fullRef.current;
        if (typedRef.current < full.length) {
          typedRef.current = Math.min(full.length, typedRef.current + 4);
          setStreaming(true);
          setLyrics(full.slice(0, typedRef.current));
          requestAnimationFrame(() => { const t = taRef.current; if (t) t.scrollTop = t.scrollHeight; });
        } else {
          if (typerRef.current) { clearInterval(typerRef.current); typerRef.current = null; }
        }
      }, 16);
    };

    generateLyrics({
      songAbout, detailText, scene, why, style: soundStyle, voice, genres,
      onProgress: (partial) => { if (!cancelled && partial) { fullRef.current = partial; startTyper(); } },
    })
      .then((res) => {
        if (cancelled) return;
        fullRef.current = res.content;
        setTitle(res.title);
        startTyper();
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        fullRef.current = fullRef.current || buildLyricsV3({ songAbout, scene, why }, 0);
        startTyper();
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (typerRef.current) { clearInterval(typerRef.current); typerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = () => {
    // Use the full text even if the typewriter hasn't finished revealing it.
    onLyrics?.({ title, style: soundStyle, content: fullRef.current || lyrics });
    onNext?.();
  };

  // Animated "writing" loader shows until the first characters start revealing.
  const showLoader = loading && !streaming;

  return (
    <LovScreen>
      <LovBack onClick={onBack} />

      <LovHeading
        title={loading ? 'Writing your song…' : "Here's what we'll program into your mind."}
        subcopy={loading ? 'Turning everything you shared into lyrics that are yours.' : (failed ? 'Here’s a starting point — tweak anything you like.' : undefined)}
        titleStyle={{ fontSize: 22 }}
      />

      <div style={{ flex: 1, minHeight: 0, margin: '20px 22px 0', position: 'relative' }}>
        {showLoader ? (
          // Fun animated loader: a glowing pen + drifting shimmer lines.
          <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'rgba(255, 251, 244, 0.7)', border: `1.5px solid ${LOVIFY.line}`, padding: '26px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22, animation: 'lovPulse 1.3s ease-in-out infinite' }}>✍️</span>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: LOVIFY.orangeDeep }}>Writing your lyrics…</span>
            </div>
            {[94, 80, 88, 62, 0, 90, 74, 84, 58].map((w, idx) => (
              <div
                key={idx}
                style={{
                  height: w ? 11 : 0, width: `${w}%`, borderRadius: 6,
                  background: w ? 'rgba(166,109,56,0.14)' : 'transparent',
                  animation: w ? 'lovPulse 1.4s ease-in-out infinite' : undefined,
                  animationDelay: `${idx * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <textarea
            ref={taRef}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            readOnly={loading}
            style={{
              width: '100%', height: '100%', boxSizing: 'border-box', resize: 'none',
              padding: '16px 18px', borderRadius: 18,
              background: 'rgba(255, 251, 244, 0.7)', border: `1.5px solid ${streaming && loading ? LOVIFY.orange : LOVIFY.line}`,
              fontFamily: SANS, fontSize: 15, lineHeight: 1.6, color: LOVIFY.ink, outline: 'none',
            }}
          />
        )}
      </div>

      <div style={{ padding: '14px 24px 28px' }}>
        <LovPrimary disabled={loading} onClick={handleGenerate}>
          {loading ? 'Writing…' : 'Generate Song'}
        </LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Proof + Loader (auto-advances) ─────────────────────────────

function ProgressRing({ pct = 0, size = 110 }: { pct?: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ringgrad" x1="0" y1="0" x2={size} y2={size}>
          <stop offset="0%" stopColor="#F5B73D" />
          <stop offset="100%" stopColor="#D85C1C" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(166, 109, 56, 0.18)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringgrad)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 600ms ease' }}
      />
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontFamily={SANS} fontSize="22" fontWeight="800" fill={LOVIFY.ink} letterSpacing="-0.5">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function ProofTile({ stat, label }: { stat: string; label: string }) {
  return (
    <div style={{ flex: 1, padding: '14px 12px', borderRadius: 18, background: 'rgba(255, 251, 244, 0.8)', border: `1px solid ${LOVIFY.line}`, textAlign: 'center' }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, background: LOVIFY.orangeGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.4 }}>{stat}</div>
      <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 11, color: LOVIFY.sub, lineHeight: 1.3, letterSpacing: 0.15 }}>{label}</div>
    </div>
  );
}

export function V3_21_Loader({ onNext }: NavProps) {
  const [pct, setPct] = useState(0.08);
  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => Math.min(1, p + 0.12));
    }, 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (pct >= 1 && onNext) {
      const t = setTimeout(onNext, 800);
      return () => clearTimeout(t);
    }
  }, [pct, onNext]);
  return (
    <LovScreen padTop={100}>

      <div style={{ padding: '0 26px', textAlign: 'center' }}>
        <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: LOVIFY.orangeDeep, letterSpacing: 2 }}>SONG IN PROGRESS</div>
      </div>

      <div style={{ margin: '22px 22px 0', display: 'flex', gap: 8 }}>
        <ProofTile stat="4.8 ★" label="App Store rating" />
        <ProofTile stat="200K+" label="women listening" />
        <ProofTile stat="91%" label="feel more like themselves" />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <ProgressRing pct={pct} size={130} />
        <h2 style={{ marginTop: 28, marginBottom: 0, fontFamily: SANS, fontWeight: 800, fontSize: 24, letterSpacing: -0.6, color: LOVIFY.ink, textAlign: 'center' }}>
          Writing your first <LovAccent>song</LovAccent>…
        </h2>
        <p style={{ marginTop: 10, fontFamily: SANS, fontSize: 14, color: LOVIFY.sub, textAlign: 'center', letterSpacing: 0.05, maxWidth: 280 }}>
          Shaping your dream into lyrics, melody, and a vision.
        </p>
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ fontFamily: SANS, fontSize: 12, color: LOVIFY.subSoft, textAlign: 'center', letterSpacing: 0.2 }}>
          This usually takes about 60 seconds.
        </div>
      </div>
    </LovScreen>
  );
}

// ─── Preview your song — vision + 2 song versions + save ────────
// PREVIEW STAND-IN: the vision art and song versions are placeholders. In the
// live app, generate them with Lovify's existing APIs (generate-vision /
// generate-song-*), stream the two variations here, and wire the save buttons
// to the real save-image / save-song endpoints.

export function V3_Preview({
  songAbout, soundStyle, voice, onNext, onBack,
}: {
  songAbout: string; soundStyle: string; voice: string;
  onNext?: () => void; onBack?: () => void;
}) {
  const title = buildTitleV3(songAbout);
  const subtitle = [soundStyle.trim(), voice.trim()].filter(Boolean).join(' · ') || 'Your Lovify song';
  // Saving is gated behind the free trial — tapping any save jumps to the trial.
  const [playing, setPlaying] = useState<string | null>(null);
  const versions = [
    { id: 'A', from: '#F5B73D', to: '#ED7A2A' },
    { id: 'B', from: '#ED7A2A', to: '#D85C1C' },
  ];

  return (
    <LovScreen padTop={80}>
      <LovBack onClick={onBack} />

      <LovHeading title="Preview your song" titleStyle={{ fontSize: 22 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 8px' }}>
        {/* vision image */}
        <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', aspectRatio: '4 / 3', background: 'linear-gradient(150deg, #FFE0C2 0%, #F8C68C 45%, #E0A75D 100%)', boxShadow: '0 18px 36px -18px rgba(216, 92, 28, 0.5)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 14, fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: 'rgba(255,250,240,0.97)', textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
            you, living it
          </div>
          <button
            onClick={onNext}
            style={{
              position: 'absolute', top: 12, right: 12,
              padding: '8px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'rgba(27,27,27,0.55)', color: '#fff', backdropFilter: 'blur(6px)',
              fontFamily: SANS, fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            ↓ Save image
          </button>
        </div>

        {/* two song versions */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {versions.map((v) => {
            const isPlaying = playing === v.id;
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: 'rgba(255, 251, 244, 0.85)', border: `1px solid ${LOVIFY.line}` }}>
                <button
                  onClick={() => setPlaying((p) => (p === v.id ? null : v.id))}
                  style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, border: 'none', cursor: 'pointer', background: `linear-gradient(150deg, ${v.from}, ${v.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -8px rgba(216,92,28,0.5)' }}
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2.5" width="3.5" height="11" rx="1" fill="#fff" /><rect x="9.5" y="2.5" width="3.5" height="11" rx="1" fill="#fff" /></svg>
                  ) : (
                    <svg width="16" height="18" viewBox="0 0 16 18"><path d="M3 2L14 9L3 16Z" fill="#fff" /></svg>
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 700, color: LOVIFY.ink, letterSpacing: -0.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                  <div style={{ marginTop: 2, fontFamily: SANS, fontSize: 12, color: LOVIFY.sub }}>Version {v.id} · {subtitle}</div>
                </div>
                <button
                  onClick={onNext}
                  aria-label="save song"
                  style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, cursor: 'pointer', background: 'transparent', border: `1.5px solid ${LOVIFY.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="17" height="17" viewBox="0 0 17 17"><path d="M8.5 2.5V11M8.5 11L5 7.5M8.5 11L12 7.5M3 13.5H14" stroke={LOVIFY.inkSoft} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 24px 28px' }}>
        <LovPrimary onClick={onNext}>Save my song &amp; vision</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Save gate — free trial to keep your song (+ science) ───────

// ─── Paywall 1 · "Get full access" — the benefits list ──────────
const TRIAL_BENEFITS: { icon: string; t: string; d: string }[] = [
  { icon: '🎵', t: 'Personalized songs about any goal', d: 'Turn any dream into a custom song with your monthly credits.' },
  { icon: '🖼️', t: 'Your vision boards', d: 'A picture of you living the life you’re singing about.' },
  { icon: '🔁', t: 'Daily play to rewire your mind', d: 'Press play every day and let the words take hold.' },
  { icon: '↩️', t: 'Cancel any time', d: 'Keep access for the duration you paid for.' },
];
export function V3_22_Trial({ onNext, onBack }: NavProps) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading
        title={<>Start your <LovAccent>$1 trial</LovAccent> to save your song and listen to it daily.</>}
        subcopy="Here's everything you get:"
        titleStyle={{ fontSize: 24 }}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px 8px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {TRIAL_BENEFITS.map((b) => (
          <div key={b.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>{b.icon}</span>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: LOVIFY.ink }}>{b.t}</div>
              <div style={{ fontFamily: SANS, fontSize: 13.5, lineHeight: 1.45, color: LOVIFY.sub, marginTop: 2 }}>{b.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Try for $1</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Paywall 2 · "7 days free so everyone can try Lovify" ───────
export function V3_TrialOffer({ onNext, onBack }: NavProps) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 700, fontSize: 27, lineHeight: 1.3, letterSpacing: -0.5, color: LOVIFY.ink }}>
          Just <LovAccent>$1</LovAccent> unlocks your first week of Lovify.
        </h1>
      </div>
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Try for $1</LovPrimary>
      </div>
    </LovScreen>
  );
}

// ─── Paywall 3 · "We'll remind you 2 days before it ends" ───────
export function V3_TrialReminder({ onNext, onBack }: NavProps) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 700, fontSize: 27, lineHeight: 1.3, letterSpacing: -0.5, color: LOVIFY.ink }}>
          We'll remind you <LovAccent>2 days</LovAccent> before your trial ends.
        </h1>
        <div style={{ marginTop: 34, width: 110, height: 110, borderRadius: 55, background: LOVIFY.orangeGradientSoft, border: `1px solid ${LOVIFY.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ fontSize: 46 }}>🔔</span>
          <span style={{ position: 'absolute', top: 24, right: 30, width: 14, height: 14, borderRadius: 7, background: LOVIFY.orangeDeep, border: '2px solid #FCF8F1' }} />
        </div>
      </div>
      <div style={{ padding: '0 24px 30px', flexShrink: 0 }}>
        <LovPrimary onClick={onNext}>Try for $1</LovPrimary>
      </div>
    </LovScreen>
  );
}

// Social-proof strip reused on the price + plan screens.
function TrialProof() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 26, alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, color: LOVIFY.ink }}>120K+</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, color: LOVIFY.sub }}>listeners</div>
      </div>
      <div style={{ width: 1, height: 30, background: LOVIFY.line }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: LOVIFY.goldOrange }}>★★★★★</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, color: LOVIFY.sub }}>4.9 star rating</div>
      </div>
    </div>
  );
}

// ─── Paywall 4 · "7 days for free" price screen (soft paywall) ──
export function V3_TrialPrice({ onNext, onBack, onBuy }: NavProps & { onBuy?: (planId: string) => void }) {
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 0' }}>
        <div style={{ textAlign: 'center', padding: '0 28px' }}>
          <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, color: LOVIFY.orangeDeep }}>
            7 Days for $1
          </h1>
          <p style={{ margin: '10px 0 0', fontFamily: SANS, fontSize: 16, fontWeight: 600, color: LOVIFY.ink }}>
            then $7.50 per month
          </p>
          <p style={{ margin: '4px 0 0', fontFamily: SANS, fontSize: 13, color: LOVIFY.subSoft }}>
            (billed $89.99 per year after trial)
          </p>
        </div>
        <div style={{ padding: '30px 24px 0' }}><TrialProof /></div>
      </div>
      <div style={{ flexShrink: 0, padding: '0 24px 8px', textAlign: 'center' }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: LOVIFY.inkSoft }}>✓ Just $1 today · cancel anytime</span>
      </div>
      <div style={{ padding: '12px 24px 14px', flexShrink: 0 }}>
        <LovPrimary onClick={() => (onBuy ? onBuy('yearly_premium_trial') : onNext?.())}>Start my $1 Week</LovPrimary>
      </div>
      <div style={{ padding: '0 24px 28px', textAlign: 'center', flexShrink: 0 }}>
        <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 14, fontWeight: 700, color: LOVIFY.orangeDeep }}>
          View all plans
        </button>
      </div>
    </LovScreen>
  );
}

// ─── Paywall 5 · "Choose your premium plan" — the plan picker ───
const PREMIUM_PLANS = [
  { id: 'annual', planId: 'yearly_premium_trial', name: 'Annual', price: '$89.99/yr', sub: '$1 for 7 days, then $7.50/mo · billed yearly', badge: 'SAVE 58%' },
  { id: 'monthly', planId: 'monthly', name: 'Monthly', price: '$17.99/mo', sub: '1 mo · billed immediately', badge: '' },
] as const;
export function V3_23_Paywall({ onNext, onBack, onBuy }: NavProps & { onBuy?: (planId: string) => void }) {
  const [plan, setPlan] = useState<string>('annual');
  const selectedPlanId = PREMIUM_PLANS.find((p) => p.id === plan)?.planId ?? 'yearly_premium_trial';
  // Only the annual plan has the 7-day free trial; monthly bills immediately,
  // so the CTA + payment line must change when monthly is selected.
  const isTrial = plan === 'annual';
  return (
    <LovScreen>
      <LovBack onClick={onBack} />
      <LovHeading
        title={<>Choose your <LovAccent>premium plan</LovAccent></>}
        titleStyle={{ fontSize: 25 }}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {PREMIUM_PLANS.map((p) => {
          const sel = plan === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              style={{
                position: 'relative', width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '15px 17px', borderRadius: 18,
                background: sel ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.92)',
                border: `2px solid ${sel ? LOVIFY.orange : LOVIFY.line}`,
                display: 'flex', alignItems: 'center', gap: 13,
                transition: 'all 160ms ease',
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, border: `1.5px solid ${sel ? LOVIFY.orange : 'rgba(126,107,94,0.4)'}`, background: sel ? LOVIFY.orangeGradient : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sel && <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: LOVIFY.ink }}>{p.name}</div>
                <div style={{ fontFamily: SANS, fontSize: 12.5, color: LOVIFY.sub, marginTop: 2 }}>{p.sub}</div>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: LOVIFY.ink, flexShrink: 0 }}>{p.price}</div>
              {p.badge && (
                <span style={{ position: 'absolute', top: -9, right: 14, fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: '#fff', background: LOVIFY.orangeGradient, borderRadius: 999, padding: '3px 9px' }}>{p.badge}</span>
              )}
            </button>
          );
        })}
        <div style={{ padding: '14px 0 0' }}><TrialProof /></div>
      </div>
      <div style={{ flexShrink: 0, padding: '0 24px 6px', textAlign: 'center' }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: LOVIFY.inkSoft }}>
          {isTrial ? '✓ Just $1 today · cancel anytime' : '✓ Billed today · cancel anytime'}
        </span>
      </div>
      <div style={{ padding: '10px 24px 8px', flexShrink: 0 }}>
        <LovPrimary onClick={() => (onBuy ? onBuy(selectedPlanId) : onNext?.())}>
          {isTrial ? 'Start my first week for $1' : 'Subscribe Now'}
        </LovPrimary>
      </div>
      <div style={{ padding: '0 24px 24px', textAlign: 'center', flexShrink: 0 }}>
        <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: LOVIFY.subSoft }}>
          Restore purchases
        </button>
      </div>
    </LovScreen>
  );
}

// ─── Create account · required step so the song is saved to the user ──
// Comes right after the paywall. No "skip"/"No thanks" — an account is
// mandatory for the song + vision to be saved; both buttons finish onboarding
// and drop the user straight into the app.
const ACCOUNT_BENEFITS: { icon: string; t: string }[] = [
  { icon: '🎵', t: 'Save your songs & visions' },
  { icon: '📱', t: 'Sync across all your devices' },
  { icon: '🎁', t: 'Member-only offers' },
  { icon: '🔔', t: 'Reminders to press play daily' },
];
// Auth handlers wired by the flow controller to the app's real Supabase auth
// (useAuth). Each returns an error (or none) so the screen can surface failures
// inline. `onNext` runs only after a successful sign-in/sign-up.
interface AuthProps extends NavProps {
  onApple?: () => Promise<{ error?: Error }>;
  onEmailSignup?: (email: string, password: string, name: string) => Promise<{ error?: Error; needsEmailConfirmation?: boolean }>;
  onEmailLogin?: (email: string, password: string) => Promise<{ error?: Error }>;
  // When provided, "Continue with email" hands off to the app's real /signup
  // page (carrying the onboarding session id) instead of the inline form, so
  // the new account claims the song staged during onboarding. Omitted in the
  // preview/review build, where the inline email form is used instead.
  onContinueWithEmail?: () => void;
}

export function V3_CreateAccount({ onNext, onBack, onApple, onEmailSignup, onEmailLogin, onContinueWithEmail }: AuthProps) {
  // null = show the Apple/email choice; 'email' = the inline email form.
  const [view, setView] = useState<'choice' | 'email'>('choice');
  const [emailMode, setEmailMode] = useState<'signup' | 'login'>('signup');
  const [busy, setBusy] = useState<null | 'apple' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentEmail, setSentEmail] = useState(false); // "check your inbox" state

  const friendlyError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) {
      return 'Too many attempts. Please wait a minute before trying again.';
    }
    return msg;
  };

  const handleApple = async () => {
    if (!onApple || busy) return;
    setError(null);
    setBusy('apple');
    const { error: err } = await onApple();
    setBusy(null);
    if (err) { setError(friendlyError(err.message)); return; }
    // On web, signInWithApple redirects away (no return here). On native the
    // SIGNED_IN listener handles the session; we advance the flow on success.
    onNext?.();
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy('email');
    if (emailMode === 'signup') {
      const { error: err, needsEmailConfirmation } = (await onEmailSignup?.(email.trim(), password, name.trim())) ?? {};
      setBusy(null);
      if (err) { setError(friendlyError(err.message)); return; }
      // With "Confirm email" OFF the session lands immediately → advance. If a
      // misconfigured dashboard withholds the session, show "check your inbox".
      if (needsEmailConfirmation) { setSentEmail(true); return; }
      onNext?.();
    } else {
      const { error: err } = (await onEmailLogin?.(email.trim(), password)) ?? {};
      setBusy(null);
      if (err) { setError(friendlyError(err.message)); return; }
      onNext?.();
    }
  };

  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16,
    background: 'rgba(255, 251, 244, 0.9)', border: `1.5px solid ${LOVIFY.line}`,
    fontFamily: SANS, fontSize: 15, color: LOVIFY.ink, outline: 'none',
  };

  // "Check your inbox" confirmation (only when the dashboard requires it).
  if (sentEmail) {
    return (
      <LovScreen>
        <LovBack onClick={() => { setSentEmail(false); setView('email'); }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 30px' }}>
          <div style={{ fontSize: 46 }} aria-hidden>✉️</div>
          <h1 style={{ margin: '14px 0 0', fontFamily: SANS, fontWeight: 700, fontSize: 24, color: LOVIFY.ink }}>Check your email</h1>
          <p style={{ margin: '10px 0 0', fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: LOVIFY.sub }}>
            We sent a verification link to <strong style={{ color: LOVIFY.ink }}>{email}</strong>. Tap it to finish creating your account.
          </p>
        </div>
      </LovScreen>
    );
  }

  return (
    <LovScreen>
      <LovBack onClick={view === 'email' ? () => { setView('choice'); setError(null); } : onBack} />
      <LovHeading
        title={<>Create a <LovAccent>Lovify account</LovAccent></>}
        subcopy="One quick step to save your song and unlock everything."
        align="left"
        titleStyle={{ fontSize: 26, textAlign: 'left' }}
        subStyle={{ textAlign: 'left' }}
      />

      {/* Benefits card */}
      <div style={{ margin: '26px 22px 0', padding: '18px 20px', borderRadius: 22, background: LOVIFY.orangeGradientSoft, border: `1px solid ${LOVIFY.line}`, display: 'flex', flexDirection: 'column', gap: 15 }}>
        {ACCOUNT_BENEFITS.map((b) => (
          <div key={b.t} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{b.icon}</span>
            <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: LOVIFY.ink }}>{b.t}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {error && (
        <p style={{ margin: '0 24px 10px', fontFamily: SANS, fontSize: 13.5, color: '#C0392B', textAlign: 'center' }}>{error}</p>
      )}

      {view === 'choice' ? (
        // Auth options — account is required, so no skip.
        <div style={{ padding: '0 22px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleApple}
            disabled={busy !== null}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              padding: '16px 18px', borderRadius: 999, border: 'none', cursor: busy ? 'default' : 'pointer',
              background: '#000', color: '#fff', fontFamily: SANS, fontSize: 16, fontWeight: 700,
              opacity: busy && busy !== 'apple' ? 0.5 : 1,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="#fff" aria-hidden>
              <path d="M13.7 12.4c-.25.57-.54 1.1-.88 1.58-.46.66-.84 1.12-1.13 1.37-.45.42-.93.63-1.45.65-.37 0-.82-.11-1.34-.32-.52-.21-1-.32-1.44-.32-.46 0-.95.11-1.48.32-.53.22-.96.33-1.28.34-.5.02-.99-.2-1.47-.66-.31-.28-.71-.75-1.19-1.43C1.04 13.13.6 12.2.27 11.13-.08 9.98-.25 8.87-.25 7.79c0-1.23.27-2.3.8-3.18.42-.71.98-1.27 1.68-1.68.7-.41 1.46-.62 2.27-.64.39 0 .9.12 1.54.36.64.24 1.05.36 1.23.36.13 0 .59-.14 1.36-.42.73-.26 1.35-.37 1.85-.33 1.37.11 2.4.65 3.08 1.62-1.22.74-1.83 1.78-1.82 3.11.01 1.04.39 1.9 1.13 2.59.34.32.71.57 1.13.74-.09.26-.19.52-.3.76zM10.6.32c0 .92-.34 1.78-1.01 2.57-.81.94-1.79 1.48-2.85 1.4-.01-.11-.02-.23-.02-.35 0-.88.39-1.83 1.07-2.6.34-.39.78-.71 1.3-.97.52-.25 1.02-.39 1.49-.42.01.12.02.25.02.37z"/>
            </svg>
            {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </button>
          <button
            onClick={() => { if (onContinueWithEmail) { onContinueWithEmail(); return; } setView('email'); setError(null); }}
            disabled={busy !== null}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              padding: '16px 18px', borderRadius: 999, cursor: busy ? 'default' : 'pointer',
              background: 'transparent', color: LOVIFY.ink, border: `1.5px solid ${LOVIFY.ink}`,
              fontFamily: SANS, fontSize: 16, fontWeight: 700, opacity: busy ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 16 }} aria-hidden>✉️</span>
            Continue with email
          </button>
        </div>
      ) : (
        // Inline email form — matches the v3 input styling.
        <form onSubmit={handleEmail} style={{ padding: '0 22px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {emailMode === 'signup' && (
            <input style={input} type="text" placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          )}
          <input style={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input style={input} type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'} />
          {/* No onClick — as a type-less button inside the <form> it submits,
              triggering handleEmail. */}
          <LovPrimary disabled={busy !== null}>
            {busy === 'email' ? (emailMode === 'signup' ? 'Creating account…' : 'Signing in…') : (emailMode === 'signup' ? 'Create account' : 'Sign in')}
          </LovPrimary>
          <button
            type="button"
            onClick={() => { setEmailMode(emailMode === 'signup' ? 'login' : 'signup'); setError(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 13.5, color: LOVIFY.sub, padding: '4px 0' }}
          >
            {emailMode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      )}
    </LovScreen>
  );
}