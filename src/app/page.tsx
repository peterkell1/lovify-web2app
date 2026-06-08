import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-wider opacity-60 dark:border-white/15">
        Lovify
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Turn your idea into an app.
      </h1>
      <p className="mt-5 max-w-md text-lg opacity-60">
        A few quick questions and we&apos;ll set you up with the right plan.
        Takes less than a minute.
      </p>

      <div className="mt-10">
        <Link href="/start">
          <Button>Get started</Button>
        </Link>
      </div>
    </main>
  );
}
