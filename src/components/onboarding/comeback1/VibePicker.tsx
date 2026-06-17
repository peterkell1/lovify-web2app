// @ts-nocheck -- web2app funnel code
'use client';
/**
 * Song-chat V2 sound step — pick the sound you LOVE, with audio previews + a way
 * to shape it. Replaces the blind 4-card text picker with:
 *   • a ▶ preview on each AI-suggested vibe so you HEAR it before committing
 *     (one plays at a time; ambient music ducks via onPreview)
 *   • optional "flavor" refiners that get woven into the style fed to the song
 *     engine — so the user customizes the sound, not just picks one of four.
 *
 * Per-genre preview clips are a content asset the team sources (~8–15s,
 * royalty-free). Until those exist we point at the existing demo songs as
 * PLACEHOLDERS so the mechanic is testable — swap GENRE_PREVIEWS for real clips.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import type { SoundVibe } from '@/components/onboarding/v3/generation';

// ── PLACEHOLDER preview clips (reuse existing demo songs so play works today).
// Replace with real per-genre samples keyed by genre; drop the fallback once
// every genre you serve has its own clip. ──
const P1 = '/assets/onboarding/v3/web-demo-ten-feet-tall.mp3';
const P2 = '/assets/onboarding/v3/demo-song-1.mp3';
const P3 = '/assets/onboarding/v3/demo-song-2.mp3';
const GENRE_PREVIEWS: Record<string, string> = {
  pop: P1, uplifting: P1, anthem: P1, 'hip-hop': P1, hiphop: P1, rock: P1, electronic: P1, house: P1, dance: P1,
  'r-n-b': P2, rnb: P2, soul: P2, gospel: P2, jazz: P2, cinematic: P2, classical: P2, latin: P2,
  'acoustic-folk': P3, acoustic: P3, folk: P3, country: P3, indie: P3, reggae: P3,
};
const PLACEHOLDER_PREVIEW = P1;
function previewFor(genre: string): string {
  const k = (genre || '').toLowerCase().trim().replace(/\s+/g, '-');
  return GENRE_PREVIEWS[k] || PLACEHOLDER_PREVIEW;
}

// Optional one-tap "flavors" that shape the chosen sound. Woven into the style
// string the song engine reads, so the user customizes beyond the 4 vibes.
const REFINERS: { e: string; label: string }[] = [
  { e: '🔥', label: 'Upbeat' },
  { e: '🌙', label: 'Slower & emotional' },
  { e: '🎬', label: 'Cinematic' },
  { e: '🎸', label: 'Acoustic' },
  { e: '🥁', label: 'Bigger drums' },
  { e: '✨', label: 'Dreamy' },
];

export function VibePicker({
  vibes, onPick, onPreview, onPreviewPlayed, onRefiner,
}: {
  vibes: SoundVibe[];
  onPick: (vibe: SoundVibe, refiners: string[]) => void;
  onPreview?: () => void;                 // duck ambient music on first play
  onPreviewPlayed?: (genre: string) => void;
  onRefiner?: (label: string) => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [refiners, setRefiners] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* ignore */ } }, []);

  const togglePlay = (v: SoundVibe) => {
    const key = v.name;
    const a = audioRef.current;
    if (!a) return;
    if (playing === key) { try { a.pause(); } catch { /* ignore */ } setPlaying(null); return; }
    onPreview?.();
    try {
      a.src = previewFor(v.genre);
      a.currentTime = 0;
      a.play().then(() => { setPlaying(key); onPreviewPlayed?.(v.genre || ''); }).catch(() => setPlaying(null));
    } catch { setPlaying(null); }
  };

  const toggleRefiner = (label: string) => {
    setRefiners((r) => (r.includes(label) ? r.filter((x) => x !== label) : [...r, label]));
    onRefiner?.(label);
  };

  const pick = (v: SoundVibe) => {
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    onPick(v, refiners);
  };

  return (
    <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 9, marginTop: 2 }}>
      <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.orangeDeep, padding: '0 2px' }}>
        Tap ▶ to hear it — then pick the one you love
      </span>

      {vibes.map((v) => {
        const on = playing === v.name;
        return (
          <div
            key={v.name}
            style={{
              display: 'flex', alignItems: 'stretch', gap: 10, padding: 10, borderRadius: 18,
              background: 'rgba(255,251,244,0.95)', border: `1.5px solid ${on ? LOVIFY.orange : LOVIFY.line}`,
              boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)',
            }}
          >
            <button
              onClick={() => togglePlay(v)}
              aria-label={on ? 'Pause preview' : 'Play preview'}
              style={{
                position: 'relative', width: 46, height: 46, borderRadius: 23, flexShrink: 0, alignSelf: 'center',
                border: 'none', cursor: 'pointer', background: LOVIFY.orangeGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 18px -8px rgba(216,92,28,0.6)',
              }}
            >
              {on && (
                <motion.span aria-hidden
                  style={{ position: 'absolute', inset: 0, borderRadius: 23, border: `2px solid ${LOVIFY.orange}` }}
                  animate={{ scale: [1, 1.45], opacity: [0.6, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              {on ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <button
              onClick={() => pick(v)}
              style={{
                flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer', padding: '4px 4px 4px 0',
                background: 'transparent', border: 'none',
              }}
            >
              <span style={{ display: 'block', fontFamily: SANS, fontSize: 15, fontWeight: 700, color: LOVIFY.ink }}>
                {v.emoji}  {v.name}
              </span>
              {v.description && (
                <span style={{ display: 'block', marginTop: 3, fontFamily: SANS, fontSize: 12.5, fontWeight: 400, color: LOVIFY.sub, lineHeight: 1.35 }}>
                  {v.description}
                </span>
              )}
              <span style={{ display: 'block', marginTop: 5, fontFamily: SANS, fontSize: 12, fontWeight: 800, color: LOVIFY.orangeDeep }}>
                {on ? 'Playing… tap to choose this →' : 'Tap to choose this →'}
              </span>
            </button>
          </div>
        );
      })}

      {/* Customizability — optional flavors woven into the chosen sound. */}
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.sub, padding: '0 2px' }}>
          Add a flavor (optional)
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {REFINERS.map((r) => {
            const sel = refiners.includes(r.label);
            return (
              <button
                key={r.label}
                onClick={() => toggleRefiner(r.label)}
                style={{
                  cursor: 'pointer', padding: '8px 12px', borderRadius: 999,
                  background: sel ? LOVIFY.orangeGradientSoft : 'rgba(255,251,244,0.95)',
                  border: `1.5px solid ${sel ? LOVIFY.orange : LOVIFY.line}`,
                  fontFamily: SANS, fontSize: 13, fontWeight: sel ? 800 : 600, color: sel ? LOVIFY.orangeDeep : LOVIFY.ink,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>{r.e}</span> {r.label} {sel && <span style={{ fontWeight: 900 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* One reused preview player. */}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlaying(null)}
        onError={() => setPlaying(null)}
      />
    </div>
  );
}

function PlayGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M8 5v14l11-7L8 5z" fill="#fff" /></svg>;
}
function PauseGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1.5" fill="#fff" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#fff" /></svg>;
}
