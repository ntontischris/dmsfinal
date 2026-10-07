import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

// Kit: μία variable sans με ελληνικά για όλο το κείμενο, μία mono μόνο για ετικέτες, κωδικούς και timecodes.
const sans = Inter_Tight({ subsets: ["latin", "greek"], variable: "--font-kit-sans" });
const mono = JetBrains_Mono({ subsets: ["latin", "greek"], variable: "--font-kit-mono" });

export const metadata: Metadata = {
  title: { default: "DMS", template: "%s · DMS" },
  robots: { index: false, follow: false },
};

// Διαβάζει το αποθηκευμένο θέμα πριν ζωγραφιστεί η σελίδα, για να μην αναβοσβήνει.
const THEME_SCRIPT = `try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="el" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
