import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luminary — Educational Infinite Scroll",
  description:
    "Discover real educational content from TikTok and Instagram, verified by AI, taught by historical figure characters.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-pastel-cream text-pastel-ink antialiased">
        <div className="relative mx-auto min-h-screen max-w-[430px]">{children}</div>
      </body>
    </html>
  );
}
