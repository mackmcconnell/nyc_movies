import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import { CompareProvider } from "@/components/compare/CompareProvider";
import { CompareBar } from "@/components/compare/CompareBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NYC Movies",
  description: "Discover indie and repertory films showing at New York City theaters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        <CompareProvider>
          <header className="border-b-4 border-primary sticky top-0 z-50 bg-background">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="flex items-center gap-3 group">
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 bg-primary"></div>
                  <div className="w-3 h-3 bg-secondary"></div>
                  <div className="w-3 h-3 bg-tertiary"></div>
                </div>
                <span className="text-lg font-black uppercase tracking-widest group-hover:text-primary transition-colors">
                  NYC Movies
                </span>
              </a>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 py-6 pb-20 flex-1">
            {children}
          </main>

          <CompareBar />
          <Footer />
        </CompareProvider>
      </body>
    </html>
  );
}
