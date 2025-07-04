// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PasswordModal } from "@/components/PasswordModal";

// Load the Inter font
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Load the JetBrains Mono font
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Threat Snapshot by Flashpoint",
  description: "2025 Hackathon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetBrainsMono.variable} antialiased`}>
        <PasswordModal>
          {children}
        </PasswordModal>
      </body>
    </html>
  );
}