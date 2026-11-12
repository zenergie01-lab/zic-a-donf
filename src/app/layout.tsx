import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";
import { AuthProvider, UserMenu } from "@/components/Auth";

export const metadata: Metadata = {
  title: { default: "Zic à donf", template: "%s · Zic à donf" },
  description: "Chansons à texte de découverte et de connaissance de Soi — écoute, partage et vote.",
};

export const viewport: Viewport = { themeColor: "#0f0d0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>
          <PlayerProvider>
            <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5">
              <Link href="/" className="font-serif text-2xl">
                Zic <span className="text-amber-500">à donf</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm text-stone-300">
                <Link href="/">Écouter</Link>
                <Link href="/duel">Duel</Link>
                <Link href="/classement">Classement</Link>
                <UserMenu />
              </nav>
            </header>
            <main className="mx-auto w-full max-w-5xl px-4">{children}</main>
            <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-36 pt-16 text-xs text-stone-500">
              <p>
                ⚠️ Ces chansons sont des créations artistiques autour de la connaissance de Soi. Elles ne remplacent en aucun cas un avis
                médical, psychologique ou thérapeutique professionnel. En cas de difficulté, adresse-toi à un professionnel de santé.
              </p>
              <p>
                Musiques générées avec Suno · © Automatisation Consciente ·{" "}
                <Link href="/admin" className="underline-offset-2 hover:underline">Espace créateur</Link>
              </p>
            </footer>
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
