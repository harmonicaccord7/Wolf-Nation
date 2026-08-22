import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './contrast-fixes.css';
import './nav-pills.css';
import './intelligence.css';
import './research-os.css';
import './product.css';

export const metadata: Metadata = {
  metadataBase:new URL('https://www.kaporalintelligence.com'),
  title:{default:'KAPORAL INTELLIGENCE — Global Intelligence for Markets & Business',template:'%s | KAPORAL INTELLIGENCE'},
  description:'Independent research and education across global markets, crypto, macro, options, Africa, technology and business opportunity.',
  alternates:{canonical:'/'},
  openGraph:{type:'website',siteName:'KAPORAL INTELLIGENCE',url:'https://www.kaporalintelligence.com',title:'KAPORAL INTELLIGENCE',description:'See the signal. Understand the mechanism. Anticipate the consequence.'},
  twitter:{card:'summary_large_image',title:'KAPORAL INTELLIGENCE',description:'Independent global market, business and technology intelligence.'},
  icons:{icon:'/brand/kaporal-intelligence-logo.svg',shortcut:'/brand/kaporal-intelligence-logo.svg',apple:'/brand/kaporal-intelligence-logo.png'}
};
export default function RootLayout({children}:Readonly<{children:ReactNode}>){return <html lang="en"><body>{children}</body></html>}
