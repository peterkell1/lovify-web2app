import { OnboardingProvider } from "@/lib/onboarding/context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
        {children}
      </main>
    </OnboardingProvider>
  );
}
