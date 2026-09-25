import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

// Futura is used where installed (Apple devices). Jost, a free Futura-style
// geometric sans, covers everything else.
const jost = Jost({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: "Askesis — What's your why?",
  description: "Seven questions to find the purpose underneath your goal.",
  applicationName: "Askesis",
  // Full-screen when opened from the iPhone home screen.
  appleWebApp: { capable: true, title: "Askesis", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body>{children}</body>
    </html>
  );
}
