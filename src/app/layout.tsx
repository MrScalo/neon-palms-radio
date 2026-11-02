import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Audiowide, Mr_Dafoe, Outfit, VT323 } from "next/font/google";
import { KEYWORDS, STATION_SEO } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID } from "@/config/stations";
import "./globals.css";

// next/font downloads these at build time and serves them from our own domain,
// so visitors never contact Google Fonts (GDPR).
const script = Mr_Dafoe({ variable: "--font-mr-dafoe", weight: "400", subsets: ["latin"] });
const display = Audiowide({ variable: "--font-audiowide", weight: "400", subsets: ["latin"] });
const sans = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const lcd = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });

const HOME = STATION_SEO[DEFAULT_STATION_ID];

// Defaults for every page; pages set their own title, description and canonical address (src/lib/seo/metadata.ts).
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: HOME.title, template: `%s · ${site.name}` },
  description: HOME.description,
  applicationName: site.name,
  keywords: [...KEYWORDS],
  authors: [{ name: site.operator.name }],
  creator: site.operator.name,
  publisher: site.name,
  category: "music",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: { type: "website", siteName: site.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
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
