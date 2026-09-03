import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$SNOOFI 98",
  description: "The official $SNOOFI website.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
