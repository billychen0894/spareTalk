import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpareTalk",
  description: "Spare time chatting with someone in the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body
        className={`${inter.className} antialiased h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400`}
      >
        {children}
      </body>
    </html>
  );
}
