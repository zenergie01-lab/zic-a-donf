import type { Metadata } from "next";
import { LoginPanel } from "@/components/LoginPanel";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function ConnexionPage() {
  return <LoginPanel />;
}
