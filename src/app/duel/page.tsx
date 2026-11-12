import type { Metadata } from "next";
import { Duel } from "@/components/Duel";

export const metadata: Metadata = { title: "Duel à l’aveugle" };

export default function DuelPage() {
  return <Duel />;
}
