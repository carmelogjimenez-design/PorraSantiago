export default function Avatar({
  src, name, className = "h-9 w-9", textClass = "text-sm",
}: { src?: string | null; name: string; className?: string; textClass?: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${className} flex-none rounded-full object-cover ring-1 ring-[var(--border)]`} />;
  }
  return (
    <span className={`${className} ${textClass} grid flex-none place-items-center rounded-full bg-[var(--text)] font-extrabold text-white`}>
      {initial}
    </span>
  );
}
