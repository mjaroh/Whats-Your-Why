import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Jost } from "next/font/google";
import { Intro } from "@/components/Intro";
import { introHeadScript } from "@/lib/intro";
import { seasonHeadScript } from "@/lib/liturgical";
import { clerkEnabled } from "@/lib/clerk";
import { clerkAppearance } from "@/lib/clerkTheme";
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
  viewportFit: "cover",
  // themeColor is set by seasonHeadScript: it follows the day's color.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: seasonHeadScript }} />
        <script dangerouslySetInnerHTML={{ __html: introHeadScript }} />
      </head>
      <body>
        <Intro />
        {clerkEnabled ? (
          <ClerkProvider
            appearance={clerkAppearance}
            signInUrl="/sign-in"
            signUpUrl="/" // new athletes start with the Seven Whys
            signInFallbackRedirectUrl="/community"
            signUpForceRedirectUrl="/welcome"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
