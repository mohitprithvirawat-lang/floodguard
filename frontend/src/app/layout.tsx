import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FloodGuard — AI Flash Flood Early Warning System",
  description: "Real-time AI-Powered Flash Flood Early Warning & Decision Support System for Hilly Regions (Smart India Hackathon)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen flex antialiased">
        <Sidebar />
        <main className="ml-64 flex-1 min-h-screen flex flex-col bg-[#0b0f19]">
          {children}
        </main>
      </body>
    </html>
  );
}
