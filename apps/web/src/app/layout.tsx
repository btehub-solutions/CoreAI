import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoreAI - Smart Business Management",
  description: "Enterprise-grade business management for modern sectors.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(outfit.className, "bg-[#0a0a0a] text-white antialiased min-h-screen relative selection:bg-emerald-500/30 selection:text-emerald-200")}>
        {/* Ambient Background Glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px]" />
        </div>
        <QueryProvider>
          {children}
          <Toaster 
            theme="dark" 
            position="top-center" 
            richColors 
            closeButton
          />
        </QueryProvider>
      </body>
    </html>
  );
}
