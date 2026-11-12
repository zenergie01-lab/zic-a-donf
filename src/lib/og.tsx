/* Carte d'aperçu pour les réseaux (Facebook, WhatsApp, LinkedIn, X…) — 1200×630 */
export const OG_SIZE = { width: 1200, height: 630 };
export const SITE_HOST = "zic-a-donf.vercel.app";

type Props = {
  kicker: string;
  title: string;
  subtitle: string;
  bullets: string[];
  coverUrl?: string | null;
  cta: string;
};

export function OgCard({ kicker, title, subtitle, bullets, coverUrl, cta }: Props) {
  const titleSize = title.length > 40 ? 50 : title.length > 24 ? 60 : 68;
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", padding: "56px 64px",
        backgroundColor: "#150c08",
        backgroundImage:
          "radial-gradient(circle at 15% 10%, rgba(245,158,11,0.55) 0%, rgba(0,0,0,0) 45%), radial-gradient(circle at 85% 90%, rgba(190,60,90,0.55) 0%, rgba(0,0,0,0) 50%), radial-gradient(circle at 70% 20%, rgba(110,60,150,0.45) 0%, rgba(0,0,0,0) 45%)",
        color: "#fff6ea", fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 40 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#fbbf24", fontWeight: 700 }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, marginTop: 18 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#f3dcc2", marginTop: 16 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 26, color: "#fde8cf" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 20, backgroundColor: "#f59e0b", color: "#1c1917", fontWeight: 700, fontSize: 22, marginRight: 16 }}>
                {i + 1}
              </div>
              {b}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: "#f59e0b", color: "#1c1917", fontWeight: 700, fontSize: 26, padding: "12px 26px", borderRadius: 40 }}>
            {cta}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#f3dcc2", marginLeft: 22 }}>{SITE_HOST}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 360 }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} width={340} height={340} alt="" style={{ borderRadius: 28, objectFit: "cover", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 340, height: 340, borderRadius: 170,
            backgroundImage: "radial-gradient(circle, #f59e0b 0%, #f59e0b 16%, #1c1412 17%, #2a1d18 40%, #1c1412 41%, #2a1d18 60%, #1c1412 61%, #241814 100%)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", width: 22, height: 22, borderRadius: 11, backgroundColor: "#1c1412" }} />
          </div>
        )}
      </div>
    </div>
  );
}
