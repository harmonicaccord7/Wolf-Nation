import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './contrast-fixes.css';

export const metadata: Metadata = {
  title: 'KAPORAL INTELLIGENCE — Global Intelligence for Markets & Business',
  description: 'Independent research and education across global markets, crypto, macro, options, Africa, technology and business opportunity.',
  icons: {
    icon: '/brand/kaporal-intelligence-logo.svg',
    shortcut: '/brand/kaporal-intelligence-logo.svg',
    apple: '/brand/kaporal-intelligence-logo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
