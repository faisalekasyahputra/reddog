import type { Metadata } from "next";
import "./globals.css";

const title = "$SNOOFI";
const description = "Snoofi is the Reddit Dog. Launched on PONS and paired with $RDDT, actual Reddit stock. All the trading fees get paid out to holders as $RDDT. 100% of them.";
const banner = { url: "/assets/hero-snoofi.png", width: 3168, height: 1056, alt: "Snoofi dogs under a SNOOFI stop sign" };

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
