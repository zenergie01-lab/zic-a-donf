import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";
import { AuthProvider, UserMenu } from "@/components/Auth";

const DESCRIPTION =
  "Chansons à texte pour se (re)découvrir. Écoute les titres, note leur Message, leur Émotion et leur Mélodie, et départage les versions en duel à l’aveugle.";

export const metadata: Metadata = {
  metadataBase: new URL("https://zic-a-donf.vercel.app"),
  title: { default: "Zic à donf — chansons pour se (re)découvrir", template: "%s · Zic à donf" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Zic à donf",
    locale: "fr_FR",
    title: "Zic à donf — chansons pour se (re)découvrir",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
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
