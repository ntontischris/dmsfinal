import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';
import '@/kit/kit.css';

// Kit: μία variable sans με ελληνικά για όλο το κείμενο, μία mono μόνο για αριθμούς, κωδικούς και ετικέτες.
const sans = Inter_Tight({ subsets: ['latin', 'greek'], variable: '--font-kit-sans' });
const mono = JetBrains_Mono({ subsets: ['latin', 'greek'], variable: '--font-kit-mono' });

export const metadata: Metadata = {
  title: 'DMS prototype',
  description: 'Πεταχτό prototype όλων των οθονών του v1. Μόνο φανταστικά δεδομένα.',
  robots: { index: false, follow: false },
};

// Διαβάζει το αποθηκευμένο θέμα πριν ζωγραφιστεί η σελίδα, για να μην αναβοσβήνει.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="el" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
