// @ts-nocheck -- web2app funnel: in-page Stripe checkout (Apple Pay / card).
//
// Slide-up sheet that keeps checkout ON-DOMAIN (no RevenueCat redirect):
//   1. On open, ask create-web-payment-intent to spin up the Stripe subscription
//      and return a PaymentIntent client secret.
//   2. Mount Stripe Elements — an Express Checkout element (Apple Pay / Google
//      Pay / Link, shown when available + on HTTPS) plus a card form.
//   3. confirmPayment redirects to /start/success on success.
//
// Uses the vanilla @stripe/stripe-js loader (the repo pins stripe-js v9, which
// @stripe/react-stripe-js doesn't yet peer-support). Only the PUBLIC publishable
// key touches the browser; the secret key lives in the edge function.
import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { publicEnv } from '@/lib/env';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import { PLAN_DAY0_PRICE } from '@/lib/funnelOffer';

// Lazy singleton — only instantiate when a publishable key is configured.
let _stripe: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  const pk = publicEnv.stripePublishableKey;
  if (!pk) return null;
  if (!_stripe) _stripe = loadStripe(pk);
  return _stripe;
}

/** True when the in-page Stripe sheet can be used (publishable key present). */
export const STRIPE_SHEET_ENABLED = !!publicEnv.stripePublishableKey;

export function PaymentSheet({ open, planId, email, onClose }: {
  open: boolean;
  planId: string;
  isTrial?: boolean;
  email?: string;
  onClose: () => void;
  armPlanId?: string;
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'paying' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const expressRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('loading');
    setErrMsg('');

    (async () => {
      const stripeP = getStripe();
      if (!stripeP) { setErrMsg('Payments are not configured.'); setPhase('error'); return; }
      const stripe = await stripeP;
      if (cancelled) return;
      if (!stripe) { setErrMsg('Could not load payments.'); setPhase('error'); return; }
      stripeRef.current = stripe;

      // Create the subscription + get the PaymentIntent client secret.
      let data: any;
      try {
        const res = await fetch(`${publicEnv.supabaseUrl}/functions/v1/create-web-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicEnv.supabaseAnonKey}`,
            apikey: publicEnv.supabaseAnonKey,
          },
          body: JSON.stringify({ planId, email }),
        });
        data = await res.json();
      } catch {
        if (!cancelled) { setErrMsg('Network error — please try again.'); setPhase('error'); }
        return;
      }
      if (cancelled) return;
      if (!data?.clientSecret) { setErrMsg(data?.error || 'Could not start checkout.'); setPhase('error'); return; }

      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: 'flat',
          variables: { colorPrimary: LOVIFY.orange, fontFamily: 'Montserrat, sans-serif', borderRadius: '12px' },
        },
      });
      elementsRef.current = elements;

      // Apple Pay / Google Pay / Link — only renders on HTTPS with a registered
      // domain + a capable device; silently absent otherwise (card still works).
      try {
        const express = elements.create('expressCheckout');
        express.mount(expressRef.current);
        express.on('confirm', () => void confirm());
      } catch { /* express unavailable on this surface */ }

      const payment = elements.create('payment', { layout: 'tabs' });
      payment.mount(paymentRef.current);
      if (!cancelled) setPhase('ready');
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId, email]);

  const confirm = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setPhase('paying');
    setErrMsg('');
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/start/success` },
    });
    // On success Stripe redirects to return_url; we only reach here on error.
    if (error) { setErrMsg(error.message || 'Payment failed — please try again.'); setPhase('ready'); }
  };

  if (!open) return null;
  const price = PLAN_DAY0_PRICE[planId];

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(20,12,8,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '18px 20px 26px', maxHeight: '92%', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: LOVIFY.ink }}>
            Checkout{price ? ` · $${price}` : ''}
          </span>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 24, lineHeight: 1, color: LOVIFY.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {phase === 'loading' && (
          <div style={{ padding: '34px 0', textAlign: 'center', fontFamily: SANS, fontSize: 14.5, color: LOVIFY.sub }}>Loading secure checkout…</div>
        )}
        {phase === 'error' && (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: SANS, fontSize: 14.5, color: '#c0392b' }}>{errMsg}</div>
        )}

        <div style={{ display: phase === 'ready' || phase === 'paying' ? 'block' : 'none' }}>
          <div ref={expressRef} style={{ marginBottom: 14 }} />
          <div ref={paymentRef} />
          {errMsg && phase !== 'error' && (
            <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 13, color: '#c0392b' }}>{errMsg}</div>
          )}
          <button
            onClick={() => void confirm()}
            disabled={phase === 'paying'}
            style={{ marginTop: 16, width: '100%', padding: '15px', borderRadius: 999, border: 'none', background: LOVIFY.orangeGradient, color: '#fff', fontFamily: SANS, fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: phase === 'paying' ? 0.6 : 1 }}
          >
            {phase === 'paying' ? 'Processing…' : (price ? `Pay $${price}` : 'Pay')}
          </button>
          <div style={{ marginTop: 10, textAlign: 'center', fontFamily: SANS, fontSize: 11.5, color: LOVIFY.subSoft }}>🔒 Secured by Stripe</div>
        </div>
      </div>
    </div>
  );
}
