import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agentic Social Scheduler",
  description: "Autonomous agent that keeps your brand visible across social channels."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-12 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-ink-900">PulsePilot</h1>
              <p className="text-sm text-ink-500">
                Autonomous scheduler that keeps your social feeds active and on-message.
              </p>
            </div>
            <div className="gradient-border hidden rounded-xl bg-white/80 px-6 py-4 shadow-lg md:block">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Next run window</p>
              <p className="text-lg font-semibold text-ink-900">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
