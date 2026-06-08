'use client';
import dynamic from 'next/dynamic';

const StartSuccess = dynamic(() => import('@/components/funnel/StartSuccessPage'), { ssr: false });

export default function StartSuccessRoute() {
  return <StartSuccess />;
}
