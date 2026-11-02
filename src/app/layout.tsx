import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leyp — The Job Hunter",
  description: "Your job search, on your own machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
