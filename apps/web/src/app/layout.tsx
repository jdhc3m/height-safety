import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Height Safety',
  description:
    'Office workspace scaffold for recorded anchor inspection evidence.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-AU">
      {/*
        suppressHydrationWarning: browser extensions (for example Grammarly)
        inject attributes such as data-gr-ext-installed into <body> before
        hydration. That is expected and outside the app's control.
      */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
