# DEPLOY — sin local / no local machine

Solo trabajas en las webs de Supabase, GitHub y Vercel. No necesitas instalar nada.
You work only in the Supabase, GitHub and Vercel web UIs. Nothing to install.

---

## 1) SUPABASE — pegar SQL / paste SQL
En tu proyecto → **SQL Editor** → **New query**. Ejecuta EN ESTE ORDEN:
1. Pega el contenido de `supabase/01_schema.sql` → **Run**.
2. Nueva query → pega `supabase/02_profile_trigger.sql` → **Run**.

Luego:
- **Authentication → Sign In / Providers → Email**: actívalo. (Para empezar rápido puedes
  desactivar *Confirm email*; en producción déjalo ON.)
- **Project Settings → API**: copia el **Project URL** y la clave **anon public**.
  Las necesitas en el paso 3 (Vercel).
- **Authentication → URL Configuration**:
  - **Site URL**: `https://TU-APP.vercel.app` (la rellenas tras el primer deploy)
  - **Redirect URLs**: añade `https://TU-APP.vercel.app/auth/callback`

> El esquema ya está adaptado al Mundial 2026: 12 grupos (A–L), 48 equipos.

---

## 2) GITHUB — subir los archivos / upload files
Tienes el repo creado pero vacío. Para subir esto SIN consola:
1. Descomprime el zip en tu ordenador (solo descomprimir, no ejecutar nada).
2. En tu repo de GitHub → pestaña **Code** → **Add file → Upload files**.
3. Arrastra TODO el contenido de la carpeta `porra/` (los archivos y carpetas de dentro,
   no la carpeta `porra` en sí). GitHub conserva las subcarpetas al arrastrar.
4. Escribe un mensaje de commit y pulsa **Commit changes**.

> Importante: NO subas el zip tal cual (GitHub no lo descomprime). Sube el contenido.
> `.env.local` no existe aquí a propósito: las claves van en Vercel, nunca en el repo.

---

## 3) VERCEL — conectar y desplegar / connect & deploy
1. **Add New → Project** → importa tu repo de GitHub. Detecta Next.js solo.
2. Despliega **Environment Variables** y añade estas dos (de Supabase, paso 1):
   - `NEXT_PUBLIC_SUPABASE_URL` = el Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clave anon public
3. **Deploy**. Obtendrás `https://TU-APP.vercel.app`.
4. Copia esa URL y complétala en Supabase (Site URL + Redirect URL del paso 1).

---

## 4) Probar / Test
Abre `https://TU-APP.vercel.app` → te lleva a `/login` → crea cuenta → entras al dashboard.

## Cambios futuros / future changes
Editas un archivo desde la web de GitHub (botón del lápiz) → **Commit** →
Vercel redespliega solo. Si cambias las env vars, haz **Redeploy** en Vercel.

## Si el build falla / if the build fails
- "Missing env var" → olvidaste añadirlas en Vercel.
- Errores de Auth al registrarte → revisa Redirect URLs en Supabase.
