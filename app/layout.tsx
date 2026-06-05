import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import FloatingLanceBot from "@/components/FloatingLanceBot";
import PomodoroTimer from "@/components/PomodoroTimer";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "LancePad — Study smarter with AI",
  description: "Paste your notes. Lance does the rest — cards, quizzes, and a tutor that explains what you got wrong.",
  manifest: "/manifest.json",
  icons: {
    icon: "/lancebot-icon.svg",
    apple: "/lancebot.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={outfit.variable}>
        <body className="font-outfit">
          <ConvexClientProvider>
            {children}
            <FloatingLanceBot />
            <PomodoroTimer />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
