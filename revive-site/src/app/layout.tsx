import type { Metadata } from 'next';
import '@fontsource-variable/space-grotesk';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pratyavartan — Your Paytm Merchant\'s AI Teammate',
  description: 'Autonomous AI payment recovery, intelligence, and orchestration for modern merchants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-base text-text antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
