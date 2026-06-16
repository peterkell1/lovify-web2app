// @ts-nocheck -- web2app funnel code
'use client';
/**
 * Voice-first capture for the song-chat V2 — the "just talk, don't type" path.
 *
 * HYBRID by design, so it works everywhere:
 *   • On-device speech (SpeechRecognition) when the browser supports it — instant,
 *     no backend, live text. This is what works in Safari/Chrome right now.
 *   • Record + server transcription (MediaRecorder → transcribe-audio edge fn)
 *     as the fallback for the iOS Instagram/Facebook in-app webviews where the
 *     on-device API doesn't exist — i.e. the bulk of the ad traffic.
 *
 * The transcript is appended to the chat draft, so the user can talk then lightly
 * edit. Degrades to null only when NEITHER path is available (typing remains). A
 * failure shows a gentle retry/"type instead" line rather than blocking.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { transcribeAudio } from '@/components/onboarding/v3/generation';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';

const MAX_SECONDS = 90; // auto-stop so a clip never balloons / runs forever

type RecState = 'idle' | 'active' | 'working' | 'error';

export function VoiceDump({
  onText, onStart, onUsed, label = 'Tap to talk — just say it out loud',
}: {
  onText: (t: string) => void;
  onStart?: () => void;
  onUsed?: () => void;
  label?: string;
}) {
  const [state, setState] = useState<RecState>('idle');
  const [secs, setSecs] = useState(0);

  // Path A — on-device speech recognition (preferred when present).
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const srRef = useRef<any>(null);
  const keepAliveRef = useRef(false);

  // Path B — record + server transcription (in-app fallback).
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const timerRef = useRef<number | null>(null);
  const usedRef = useRef(false);

  const supported = !!SR || canRecord;

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const stopTracks = () => { try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ } streamRef.current = null; };
  const markUsed = () => { if (!usedRef.current) { usedRef.current = true; onUsed?.(); } };

  useEffect(() => () => {
    keepAliveRef.current = false; clearTimer(); stopTracks();
    try { srRef.current?.stop?.(); } catch { /* ignore */ }
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
  }, []);

  if (!supported) return null;

  const startTimer = () => {
    setSecs(0);
    timerRef.current = window.setInterval(() => {
      setSecs((s) => { if (s + 1 >= MAX_SECONDS) { stop(); return MAX_SECONDS; } return s + 1; });
    }, 1000);
  };

  // ── Path A: on-device ──
  const startSR = () => {
    onStart?.();
    try {
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = true;
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) { const t = (r[0]?.transcript || '').trim(); if (t) { onText(t); markUsed(); } }
        }
      };
      // Engines end on any pause (iOS caps sessions); restart while held.
      rec.onend = () => { if (keepAliveRef.current) { try { rec.start(); return; } catch { /* give up */ } } keepAliveRef.current = false; clearTimer(); setState('idle'); };
      rec.onerror = (e: any) => {
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed' || e?.error === 'audio-capture') {
          keepAliveRef.current = false; clearTimer(); setState('error');
        }
      };
      srRef.current = rec;
      rec.start();
      keepAliveRef.current = true;
      setState('active'); startTimer();
    } catch { setState('error'); }
  };
  const stopSR = () => { keepAliveRef.current = false; clearTimer(); try { srRef.current?.stop?.(); } catch { /* ignore */ } setState('idle'); };

  // ── Path B: record + server ──
  const startRec = async () => {
    onStart?.();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stopTracks(); clearTimer();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) { setState('idle'); return; }
        setState('working');
        try { const t = await transcribeAudio(blob); onText(t); markUsed(); setState('idle'); } catch { setState('error'); }
      };
      recRef.current = rec; rec.start(); setState('active'); startTimer();
    } catch { stopTracks(); setState('error'); }
  };
  const stopRec = () => { clearTimer(); try { recRef.current?.stop?.(); } catch { /* ignore */ } };

  const start = () => (SR ? startSR() : startRec());
  const stop = () => (SR ? stopSR() : stopRec());

  const active = state === 'active';
  const working = state === 'working';
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div style={{ alignSelf: 'stretch', marginTop: 2 }}>
      <motion.button
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        onClick={working ? undefined : (active ? stop : start)}
        disabled={working}
        aria-label={active ? 'Stop recording' : 'Record your answer'}
        style={{
          width: '100%', cursor: working ? 'default' : 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
          borderRadius: 16, background: 'rgba(255,251,244,0.97)',
          border: `1.5px solid ${active ? LOVIFY.orange : LOVIFY.line}`,
          boxShadow: active ? '0 10px 24px -12px rgba(216,92,28,0.5)' : '0 5px 14px -10px rgba(216,92,28,0.3)',
        }}
      >
        <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 19, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? '#E5484D' : LOVIFY.orangeGradient }}>
          {active && (
            <motion.span aria-hidden
              style={{ position: 'absolute', inset: 0, borderRadius: 19, background: '#E5484D' }}
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span style={{ position: 'relative', display: 'flex' }}>{active ? <StopGlyph /> : <MicGlyph />}</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 700, color: active ? LOVIFY.orangeDeep : LOVIFY.ink }}>
            {working ? 'Turning your voice into words…' : active ? 'Listening… tap to stop' : label}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: LOVIFY.subSoft, marginTop: 1 }}>
            {working ? 'One sec…' : active ? `${mmss} · say everything you picture` : 'No typing — just talk, we’ll write it down'}
          </div>
        </div>
        {active && <Bars />}
        {working && <Dots />}
      </motion.button>
      {state === 'error' && (
        <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: LOVIFY.sub, textAlign: 'center', marginTop: 6 }}>
          Didn&apos;t catch that — tap to try again, or just type below.
        </div>
      )}
    </div>
  );
}

function MicGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function StopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="#fff" />
    </svg>
  );
}
function Bars() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 3, alignItems: 'center', height: 20, flexShrink: 0 }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.span key={i}
          style={{ width: 3, borderRadius: 2, background: LOVIFY.orange }}
          animate={{ height: [6, 17, 6] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}
function Dots() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
      {[0, 1, 2].map((i) => (
        <motion.span key={i}
          style={{ width: 6, height: 6, borderRadius: 3, background: LOVIFY.orangeDeep, display: 'inline-block' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
