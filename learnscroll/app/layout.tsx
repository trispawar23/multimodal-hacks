import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnScroll — Educational Infinite Scroll",
  description:
    "Discover real educational content from TikTok and Instagram, verified by AI, taught by historical figure characters.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
