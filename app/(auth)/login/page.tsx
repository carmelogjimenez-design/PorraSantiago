"use client";
import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthState } from "../actions";

type Mode = "login" | "register";

function AuthCard() {
  const [mode, setMode] = useState<Mode>("login");
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="rise w-full rounded-[28px] bg-[#FAFAFA] p-8 text-[#15171c] shadow-[0_30px_90px_-24px_rgba(0,0,0,0.7)] sm:p-10">
      <div className="mb-7">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">Acceso</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
          {mode === "login" ? "Entra a competir" : "Únete a la porra"}
        </h2>
      </div>

      {/* Toggle */}
      <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-black/[0.05] p-1 text-sm">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2.5 font-bold transition-all duration-200 ${
              mode === m ? "bg-white text-[#15171c] shadow-sm" : "text-[#6b7280] hover:text-[#15171c]"
            }`}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form key={mode} action={formAction} className="space-y-5">
        <input type="hidden" name="redirect" value={redirect} />
        {mode === "register" && (
          <Field label="Nombre" name="display_name" type="text" placeholder="Santi" autoComplete="name" />
        )}
        <Field label="Email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {state?.error && (
          <p className="rounded-xl bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm font-semibold text-[var(--accent-deep)]">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--accent)] py-4 text-sm font-extrabold tracking-wide text-white transition-all duration-200 hover:bg-[var(--accent-deep)] hover:shadow-[0_12px_28px_-10px_var(--accent)] active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Un momento…" : mode === "login" ? "Entrar al juego" : "Empezar a jugar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#6b7280]">
        {mode === "login" ? "¿Aún no juegas? Pulsa “Crear cuenta”." : "Tu porra lista en menos de 2 minutos."}
      </p>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#6b7280]">{label}</span>
      <input
        {...props}
        required
        className="w-full rounded-xl border border-[#e6e8ec] bg-white px-4 py-3 text-[#15171c] outline-none transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
      />
    </label>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#06070A] text-white">
      {/* Marca de agua: Cruz de Santiago gigante */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.svg"
        alt=""
        className="pointer-events-none absolute -bottom-40 -left-32 w-[680px] max-w-none opacity-[0.05] sm:w-[860px]"
      />
      {/* Gradientes rojos sutiles + profundidad */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--accent)] opacity-[0.16] blur-[150px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-[var(--accent)] opacity-[0.10] blur-[150px]" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,45,85,0.06), transparent 55%)" }} />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[3fr_2fr] lg:gap-16 lg:px-10">
        {/* IZQUIERDA — marca / emoción */}
        <div className="text-left">
          <div className="relative mb-8 inline-block">
            <div className="absolute -inset-6 rounded-full bg-[var(--accent)] opacity-25 blur-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="La Porra de Santiago" className="relative h-[72px] w-16" />
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#A5A7B3]">
            Mundial 2026 · 48 selecciones
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-6xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            La Porra<br /><span className="text-[var(--accent)]">de Santiago</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed text-[#A5A7B3]">
            ¿Te crees el puto amo del fútbol? La peña entera lo dice…{" "}
            <span className="font-bold text-white">Aquí se demuestra.</span>
          </p>

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold text-[#A5A7B3]">
            <span>⚡ 72 partidos</span>
            <span>👑 Clasificación global</span>
            <span>🎯 Goleadores</span>
          </div>
        </div>

        {/* DERECHA — acceso */}
        <Suspense fallback={null}>
          <AuthCard />
        </Suspense>
      </div>
    </main>
  );
}
