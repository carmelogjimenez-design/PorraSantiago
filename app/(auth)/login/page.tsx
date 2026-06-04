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
    <div className="rise w-full rounded-3xl border border-[var(--border)] bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] sm:p-9">
      {/* Toggle login/registro */}
      <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--soft)] p-1 text-sm">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2.5 font-bold transition ${
              mode === m
                ? "bg-white text-[var(--text)] shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
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
          className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-extrabold tracking-wide text-white transition hover:bg-[var(--accent-deep)] active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Un momento…" : mode === "login" ? "Entrar al juego" : "Empezar a jugar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--text-dim)]">
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
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-6 py-14">
      <div className="w-full max-w-sm">
        {/* Marca, con aire */}
        <div className="mb-9 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="La Porra de Santiago" className="mx-auto h-[88px] w-20" />
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.26em] text-[var(--text-dim)]">
            Mundial 2026 · 48 selecciones
          </p>
          <h1 className="mt-2.5 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
            La Porra <span className="text-[var(--accent)]">de Santiago</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-[15px] font-medium text-[var(--text-dim)]">
            Predice, compite y demuestra a la peña quién sabe de fútbol.
          </p>
        </div>

        <Suspense fallback={null}>
          <AuthCard />
        </Suspense>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]">
          La porra más premium del Mundial
        </p>
      </div>
    </main>
  );
}
