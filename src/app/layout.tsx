import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GROWN.™ — Healthy aging. Your body. Your rules.",
    template: "%s · GROWN.™",
  },
  description:
    "A personalized healthy-aging literacy platform for women 40+. Learn your body. Learn your food. Learn what's worth your money.",
  applicationName: "GROWN.",
};

export const viewport: Viewport = {
  themeColor: "#F7F1E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
