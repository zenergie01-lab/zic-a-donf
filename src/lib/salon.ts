/** Mode salon : horloge commune et appels aux fonctions sécurisées de la base. */
import { supabase } from "./supabase";

export type SalonState = { variant_id: string; playing: boolean; position: number; at: number; ended: boolean; server_now: number };
export type HostSession = { session_id: string; pin: string; host_token: string; variantId: string };

export const SALON_HOST = "https://zic-zic.eclairerlinvisible.org";

/**
 * Horloge recalée sur le serveur : on garde l'échantillon au plus court aller-retour.
 * Analogie : deux montres qu'on synchronise par téléphone, en tenant compte du temps de la conversation.
 */
export class ServerClock {
  private offset = 0;
  private bestRtt = Infinity;
  private samples = 0;

  sample(serverNow: number, t0: number, t1: number) {
    const rtt = t1 - t0;
    // on accepte un nouvel échantillon s'il est meilleur, ou périodiquement (dérive des horloges)
    if (rtt <= this.bestRtt * 1.3 || this.samples % 20 === 0) {
      const est = serverNow - (t0 + t1) / 2;
      this.offset = this.samples === 0 || rtt < this.bestRtt ? est : this.offset * 0.7 + est * 0.3;
      this.bestRtt = Math.min(this.bestRtt, rtt);
    }
    this.samples++;
  }

  now() {
    return Date.now() / 1000 + this.offset;
  }

  async calibrate(n = 5) {
    for (let i = 0; i < n; i++) {
      const t0 = Date.now() / 1000;
      const { data } = await supabase.rpc("server_time");
      const t1 = Date.now() / 1000;
      if (typeof data === "number") this.sample(data, t0, t1);
    }
  }
}

export function positionNow(s: Pick<SalonState, "playing" | "position" | "at">, serverNow: number) {
  return s.playing ? Number(s.position) + Math.max(0, serverNow - s.at) : Number(s.position);
}
