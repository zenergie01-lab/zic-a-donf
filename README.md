# ZIC-ZIC (projet zic-a-donf)

Lecteur, albums et (bientôt) notation des titres Suno de Vince.
Next.js 16 · Supabase self-hosted (schéma `zic`) · Vercel.

## Démarrer en local
```bash
cp .env.example .env.local   # puis colle la clé anon
npm install
npm run dev                  # http://localhost:3000  (ne pas utiliser 8001 / 8080 / 18080)
```

## Base de données
Exécuter `../supabase/001_zic_init.sql` dans Supabase Studio > SQL Editor.

## Structure
- `src/app/` : pages (`/`, `/album/[slug]`, `/titre/[slug]`, `/admin`)
- `src/components/Player.tsx` : lecteur audio global (barre en bas, écran verrouillé)
- `src/components/admin/` : espace créateur (ajout titres/variantes, albums, gestion)
- La sécurité est dans la base (RLS) : seul un compte présent dans `zic.admins` peut écrire.
