// @ts-nocheck -- web2app funnel code
'use client';
/**
 * Voice-first capture for the song-chat V2 — the "just talk, don't type" path.
 *
 * Records a clip with MediaRecorder + getUserMedia and sends it to the
 * `transcribe-audio` edge fn (server-side speech-to-text). This works inside the
 * iOS Instagram/Facebook in-app webviews where the on-device SpeechRecognition
 * mic is unavailable — i.e. for the bulk of the ad traffic. The transcript is
 * appended to the chat draft, so the user can talk, then lightly edit.
 *
 * Degrades to null when recording isn't supported, so typing + the on-device
 * mic remain. On a transcription failure it shows a gentle retry/"type instead"
 * state rather than blocking the funnel.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { transcribeAudio } from '@/components/onboarding/v3/generation';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';

const MAX_SECONDS = 90; // auto-stop so a clip never balloons the upload

type RecState = 'idle' | 'recording' | 'working' | 'error';

export function VoiceDump({
  onText, onStart, onUsed, label = 'Tap to talk — just say it out loud',
}: {
  onText: (t: string) => void;          // append the transcript to the draft
  onStart?: () => void;                 // fired on record start (kills ambient music)
  onUsed?: () => void;                  // analytics hook (first successful dump)
  label?: string;
}) {
  const [state, setState] = useState<RecState>('idle');
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const supported = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  const stopTracks = () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
  };
  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  useEffect(() => () => { clearTimer(); stopTracks(); try { recRef.current?.stop?.(); } catch { /* ignore */ } }, []);

  if (!supported) return null;

  const stop = () => {
    clearTimer();
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
  };

  const start = async () => {
    onStart?.();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) { setState('idle'); return; }
        setState('working');
        try {
          const text = await transcribeAudio(blob);
          onText(text);
          onUsed?.();
          setState('idle');
        } catch {
          setState('error');
        }
      };
      recRef.current = rec;
      rec.start();
      setState('recording');
      setSecs(0);
      timerRef.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_SECONDS) { stop(); return MAX_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      // Permission denied or no device — fall back silently to typing.
      stopTracks();
      setState('error');
    }
  };

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const recording = state === 'recording';
  const working = state === 'working';

  return (
    <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
      <motion.button
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        onClick={working ? undefined : (recording ? stop : start)}
        disabled={working}
        aria-label={recording ? 'Stop recording' : 'Record your answer'}
        style={{
          width: '100%', cursor: working ? 'default' : 'pointer',
          padding: '14px 18px', borderRadius: 18,
          background: recording ? LOVIFY.orangeGradient : LOVIFY.orangeGradientSoft,
          border: `1.5px solid ${LOVIFY.orange}`,
          color: recording ? '#fff' : LOVIFY.orangeDeep,
          fontFamily: SANS, fontSize: 15.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 10px 24px -14px rgba(216,92,28,0.6)',
        }}
      >
        {working ? (
          <>
            <Dots /> <span>Turning your voice into words…</span>
          </>
        ) : recording ? (
          <>
            <RecPulse /> <span>Stop &amp; use this · {mmss}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 19 }}>🎤</span> <span>{label}</span>
          </>
        )}
      </motion.button>
      {recording && (
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: LOVIFY.sub, textAlign: 'center' }}>
          Keep going — say everything you picture. Tap when you&apos;re done.
        </span>
      )}
      {state === 'error' && (
        <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: LOVIFY.sub, textAlign: 'center' }}>
          Didn&apos;t catch that — tap to try again, or just type below.
        </span>
      )}
    </div>
  );
}

function RecPulse() {
  return (
    <motion.span
      aria-hidden
      style={{ width: 12, height: 12, borderRadius: 6, background: '#fff', display: 'inline-block' }}
      animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Dots() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 6, height: 6, borderRadius: 3, background: LOVIFY.orangeDeep, display: 'inline-block' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
