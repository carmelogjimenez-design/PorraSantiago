import type { SVGProps } from "react";

const PATHS: Record<string, React.ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /></>),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.3l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
      <path d="M12 3.2v2.6M4 9.6l2.3 1.7M20 9.6l-2.3 1.7M7 20.2l1.2-2.4M17 20.2l-1.2-2.4" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
    </>
  ),
  target: (<><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.3" /></>),
  trophy: (
    <>
      <path d="M7 4h10v3.2a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.6c-.5 0-.6 3 2.4 4" />
      <path d="M17 5h2.4c.5 0 .6 3-2.4 4" />
      <path d="M12 12.2v3M9.2 19.5h5.6M10 19.5l.4-4.3h3.2l.4 4.3" />
    </>
  ),
  book: (<><path d="M12 5.2C10 3.8 6.8 3.7 4.3 4.3v14c2.5-.6 5.7-.5 7.7 1 2-1.5 5.2-1.6 7.7-1v-14c-2.5-.6-5.7-.5-7.7.9z" /><path d="M12 5.2v14" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>),
  logout: (<><path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5" /><path d="M15 15.5l4-3.5-4-3.5" /><path d="M19 12H9.5" /></>),
  gift: (<><rect x="4" y="8.5" width="16" height="12" rx="1.5" /><path d="M12 8.5v12" /><path d="M12 8.5C11.4 6 10.2 4.6 8.6 4.6a1.9 1.9 0 1 0 0 3.9z" /><path d="M12 8.5C12.6 6 13.8 4.6 15.4 4.6a1.9 1.9 0 1 1 0 3.9z" /></>),
};

export default function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {PATHS[name] ?? PATHS.home}
    </svg>
  );
}
