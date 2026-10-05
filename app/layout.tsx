import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FAVICON_SVG, FONTS_HREF } from "@/components/head-assets";

const title = "Dazzlea Agency · Le rideau se lève bientôt";
const description =
  "Dazzlea, agence événementielle, communication et marketing à Casablanca. Notre nouveau site arrive bientôt : parlez-nous de votre projet.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  icons: { icon: [{ url: FAVICON_SVG, type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
