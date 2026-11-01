import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Audiowide, Mr_Dafoe, Outfit, VT323 } from "next/font/google";
import "./globals.css";

// next/font downloads these at build time and serves them from our own domain,
// so visitors never contact Google Fonts (GDPR).
const script = Mr_Dafoe({ variable: "--font-mr-dafoe", weight: "400", subsets: ["latin"] });
const display = Audiowide({ variable: "--font-audiowide", weight: "400", subsets: ["latin"] });
const sans = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const lcd = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neon Palms FM — 24/7 Neon Radio from the Sunset Coast",
  description:
    "An unofficial fan-made web radio with an 80s neon soul. Everyone hears the same song at the same time — just like real radio.",
};

export const viewport: Viewport = {
  themeColor: "#0b0618",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${script.variable} ${display.variable} ${sans.variable} ${lcd.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
