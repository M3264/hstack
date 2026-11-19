import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hstack.shellhaki.dev"),
  title: "hstack · small models do the work, frontier models direct it",
  description:
    "Agent skills where a small, cheap model writes the spec, plan, tests and code, and a frontier model directs it like a senior engineer. 35% cheaper than the frontier alone at the same quality.",
  openGraph: {
    title: "hstack",
    description: "Small models do the work. Frontier models direct it. 35% cheaper, same quality.",
    url: "https://hstack.shellhaki.dev",
    siteName: "hstack",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "hstack", description: "Small models do the work. Frontier models direct it." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
