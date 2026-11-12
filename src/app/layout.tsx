import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";

export const metadata: Metadata = {
  title: { default: "Zic à donf", template: "%s · Zic à donf" },
  description: "Chansons à texte de découverte et de connaissance de Soi — écoute, partage et vote.",
};

export const viewport: Viewport = { themeColor: "#0f0d0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <PlayerProvider>
          <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
            <Link href="/" className="font-serif text-2xl">
              Zic <span className="text-amber-500">à donf</span>
            </Link>
            <nav className="flex gap-4 text-sm text-stone-300">
              <Link href="/">Écouter</Link>
              <Link href="/admin">Espace créateur</Link>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 pb-36">{children}</main>
        </PlayerProvider>
      </body>
    </html>
  );
}
