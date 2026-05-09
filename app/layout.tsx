import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import "./globals.css";

const display = Newsreader({
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const body = Manrope({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Café Confiserie Ryser, 6430 Schwyz",
  description:
    "Café, Confiserie und Konditorei mitten in Schwyz. Felchlin-Schokolade aus Ibach, Schwyzer-Örgeli aus eigenem Sortiment.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
