import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

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
    <html lang="el" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
