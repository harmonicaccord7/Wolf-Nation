import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'KAPORAL INTELLIGENCE — Global Intelligence for Markets & Business',
  description: 'Independent research and education across global markets, crypto, macro, options, Africa, technology and business opportunity.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
