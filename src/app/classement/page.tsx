import type { Metadata } from "next";
import { Ranking } from "@/components/Ranking";

export const metadata: Metadata = { title: "Classement" };

export default function ClassementPage() {
  return <Ranking />;
}
