import type { Metadata } from "next";
import "./globals.css";

const title = "$SNOOFI 98";
const description = "Snoofi is the Reddit Dog. Launched on PONS, paired with $RDDT — 100% of trading fees paid out to holders.";
const banner = { url: "/assets/hero-snoofi.jpg", width: 1600, height: 533, alt: "Snoofi dogs under a SNOOFI stop sign" };

export const metadata: Metadata = {
  metadataBase: new URL("https://reddog-three.vercel.app"),
  title,
  description,
  icons: { icon: "/icon.png" },
  openGraph: { title, description, images: [banner] },
  twitter: { card: "summary_large_image", title, description, images: [banner] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
