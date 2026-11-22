"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalonJoin() {
  const [pin, setPin] = useState("");
  const router = useRouter();
  return (
    <form
      className="card mx-auto mt-10 max-w-sm space-y-4 p-6 text-center"
      onSubmit={(e) => { e.preventDefault(); if (/^\d{4}$/.test(pin)) router.push(`/salon/${pin}`); }}
    >
      <h1 className="text-2xl">🎤 Rejoindre un karaoké de groupe</h1>
      <p className="text-sm text-stone-400">Tape le code à 4 chiffres affiché par l’animateur.</p>
      <input
        className="field text-center font-mono text-4xl tracking-[0.4em]"
        inputMode="numeric" pattern="\d{4}" maxLength={4} autoFocus
        value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="0000"
      />
      <button className="btn w-full" disabled={pin.length !== 4}>Rejoindre</button>
    </form>
  );
}
