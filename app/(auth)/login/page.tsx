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
    <div className="rise w-full max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-2xl sm:p-9">
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
          {mode === "login" ? "Entra al juego" : "Únete a la porra"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          {mode === "login" ? "Bienvenido de vuelta, crack." : "Crea tu cuenta en menos de 2 minutos."}
        </p>
      </div>

      {/* Toggle login/registro */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-[var(--border)] bg-[var(--soft)] p-1 text-sm">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-bold transition ${
              mode === m
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form key={mode} action={formAction} className="space-y-4">
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
          <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent-deep)]">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-extrabold tracking-wide text-white transition hover:bg-[var(--accent-deep)] active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "..." : mode === "login" ? "Entrar al juego ⚡" : "Empezar a jugar ⚡"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--text-dim)]">
        {mode === "login" ? "¿Aún no juegas? Pulsa “Crear cuenta”." : "Regístrate y haz tu porra ya."}
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
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-dim)]">
        {label}
      </span>
      <input
        {...props}
        required
        className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
      />
    </label>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0a0b0f] text-white">
      {/* Emblema gigante de marca de agua */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.svg"
        alt=""
        className="pointer-events-none absolute -bottom-24 -right-24 w-[560px] max-w-none opacity-[0.05] blur-[1px] sm:w-[720px]"
      />
      {/* Glows */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[var(--accent)] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-0 h-72 w-72 rounded-full bg-[var(--accent)] opacity-10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:justify-between lg:gap-8">
        {/* Branding / reto */}
        <div className="max-w-xl text-center lg:text-left">
          <div className="mb-6 flex justify-center lg:justify-start">
            <span className="grid h-24 w-24 place-items-center rounded-full bg-white shadow-[0_0_60px_-10px_var(--accent)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="La Porra de Santiago" className="h-16 w-[60px]" />
            </span>
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/50">
            Mundial 2026 · 48 selecciones
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
            La Porra<br /><span className="text-[var(--accent)]">de Santiago</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg font-semibold text-white/70 lg:mx-0">
            ¿Te crees el puto amo del fútbol? La peña entera lo dice…
            <span className="text-white"> aquí se demuestra.</span>
          </p>
          <div className="mt-7 hidden items-center gap-6 text-sm font-bold text-white/60 lg:flex">
            <span>⚡ 72 partidos</span>
            <span>👑 Orden de grupos</span>
            <span>🎯 Goleadores</span>
          </div>
        </div>

        {/* Tarjeta de acceso */}
        <Suspense fallback={null}>
          <AuthCard />
        </Suspense>
      </div>
    </main>
  );
}
