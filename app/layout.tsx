import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

// Display con carácter (no Inter) + cuerpo limpio.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "La Porra de Santiago",
  description: "Pronósticos del Mundial 2026 · 48 equipos, 12 grupos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="font-[family-name:var(--font-body)]">{children}</body>
    </html>
  );
}
