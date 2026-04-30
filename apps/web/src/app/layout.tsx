import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={cn(inter.className, "bg-[#0a0a0a] text-white antialiased")}>
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
