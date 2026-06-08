import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Post-checkout landing page. Once Stripe is wired up, this is the
 * success_url — read the session_id query param here to confirm/fulfill.
 */
export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
      <p className="mt-3 opacity-60">
        Thanks for completing onboarding. Your account is ready to go.
      </p>
      <div className="mt-8">
        <Link href="/">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    </main>
  );
}
