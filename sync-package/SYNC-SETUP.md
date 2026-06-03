# Conectar API-Football + sync automático 2x/día (gratis)

## 1) Clave de API-Football (gratis)
- Regístrate en https://dashboard.api-football.com/register → plan **Free** (100 peticiones/día).
- En el dashboard → **My Access** → copia tu **API Key**.

## 2) Clave SECRETA de Supabase
- Supabase → **Settings → API Keys** → **"Secret keys"** → copia la `sb_secret_...`.
- Es privada; solo va en Vercel (servidor), nunca en el navegador ni en el repo.

## 3) Añade 4 variables de entorno en Vercel (Settings → Environment Variables)
| Key | Value |
|-----|-------|
| `API_FOOTBALL_KEY` | tu API Key de API-Football |
| `SUPABASE_SERVICE_ROLE_KEY` | tu clave `sb_secret_...` de Supabase |
| `SYNC_SECRET` | una contraseña que te inventes (para lanzarlo a mano) |
| `CRON_SECRET` | otra contraseña (la usa el cron de Vercel) |
- Production marcado. "Sensitive" da igual (no son `NEXT_PUBLIC_`).

## 4) Sube los archivos a GitHub (Add file → Upload files)
Del zip, arrastra:
- `lib/supabase/admin.ts`
- `app/api/sync/route.ts`  (si ya lo tenías, este lo SUSTITUYE)
- `vercel.json`            (va en la RAÍZ del repo)

Commit → Vercel reconstruye solo y **registra los 2 cron jobs**.

## 5) Pobla los datos AHORA (una vez, a mano)
El cron empezará a las horas programadas; para tener datos ya, lanza la sync una vez:
```
https://porra-santiago.vercel.app/api/sync?secret=TU_SYNC_SECRET
```
Debe responder: `{ "ok": true, "teams": 48, "matches": 72, "standings": 48 }`

## 6) Verifica en Supabase → Table Editor → tablas `teams` y `matches`.

---

## Sobre el sync automático (2x/día)
- `vercel.json` programa 2 ejecuciones diarias: **07:00 y 19:00 UTC**
  = **09:00 y 21:00 en Madrid** (horario de verano).
- Gasto: ~2-3 peticiones por ejecución → ~4-6/día de las 100 gratis. Sobradísimo.
- Para cambiar las horas, edita los números de `"schedule": "0 7 * * *"` (formato UTC:
  minuto hora * * *). Ej. `"0 6 * * *"` = 06:00 UTC.
- En Vercel Hobby el cron puede dispararse en cualquier minuto dentro de esa hora (normal).
- Ver que corren: Vercel → pestaña **Cron Jobs** (o Settings → Cron Jobs) y en **Logs**.

## Si falla
- `{"error":"unauthorized"}` al abrir la URL → el `?secret` no coincide con `SYNC_SECRET`.
- El cron no corre → revisa que `vercel.json` está en la raíz y que existe `CRON_SECRET`.
- `{"ok":false,"error":"API-Football ... HTTP 4xx"}` → revisa `API_FOOTBALL_KEY`.
