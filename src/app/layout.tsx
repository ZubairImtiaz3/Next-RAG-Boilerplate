import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ChatSupport from "@/components/chat-support";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next RAG Boilerplate",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-muted/30`}>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
          <ChatSupport />
        </ThemeProvider>
      </body>
    </html>
  );
}
