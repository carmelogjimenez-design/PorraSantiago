"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";

type Props = {
  initial: { display_name: string; favorite_country: string; avatar_url: string };
};

export default function ProfileForm({ initial }: Props) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null);

  return (
    <form action={action} className="space-y-5">
      <Field label="Nombre / Name" name="display_name" defaultValue={initial.display_name} />
      <Field
        label="País favorito / Favorite country"
        name="favorite_country"
        defaultValue={initial.favorite_country}
        placeholder="España"
        required={false}
      />
      <Field
        label="Avatar (URL, opcional)"
        name="avatar_url"
        defaultValue={initial.avatar_url}
        placeholder="https://..."
        required={false}
      />

      {state?.error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          ✓ Guardado / Saved
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({
  label,
  required = true,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
        {label}
      </span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
      />
    </label>
  );
}
