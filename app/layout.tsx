import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ChatProvider } from "@/hooks/use-chats";

// Environment startup validation
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
if (!process.env.GEMINI_API_KEY && process.env.MOCK_GEMINI !== 'true' && !isNextBuild) {
  console.error("=================================================================================");
  console.error("STARTUP ERROR: Required environment variable 'GEMINI_API_KEY' is missing.");
  console.error("Please configure GEMINI_API_KEY in your server environment or .env.local file.");
  console.error("=================================================================================");
  throw new Error("STARTUP CONFIGURATION ERROR: 'GEMINI_API_KEY' is missing.");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LexiGuard - AI Legal Guardian",
  description: "Evaluate disputes, analyze case strength, compile evidence, and auto-draft demand notices instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
