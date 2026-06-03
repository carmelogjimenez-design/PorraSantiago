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
    <div className="card rise w-full max-w-md p-8 sm:p-10">
      {/* Marca / Brand */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--text-dim)] uppercase">
          Mundial 2026 · 48 selecciones
        </p>
        <h1 className="mt-2 text-4xl font-extrabold leading-[0.95] tracking-tight font-[family-name:var(--font-display)]">
          La Porra <span style={{ color: "var(--accent)" }}>de Santiago</span>
        </h1>
      </div>

      {/* Toggle login/registro */}
      <div className="mb-7 grid grid-cols-2 gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] p-1 text-sm">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-semibold transition ${
              mode === m
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {/* key fuerza reset del formulario al cambiar de modo */}
      <form key={mode} action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirect} />

        {mode === "register" && (
          <Field label="Nombre / Name" name="display_name" type="text" placeholder="Santi" autoComplete="name" />
        )}
        <Field label="Email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" />
        <Field
          label="Contraseña / Password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {state?.error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
        >
          {pending ? "..." : mode === "login" ? "Entrar al juego" : "Empezar a jugar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--text-dim)]">
        Regístrate y haz tu porra en menos de 2 minutos.
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
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--text-dim)] uppercase">
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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg-soft)] p-5">
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </main>
  );
}
