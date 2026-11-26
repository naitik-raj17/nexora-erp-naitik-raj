import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Nexora ERP', template: '%s · Nexora ERP' },
  description: 'Procure-to-stock: purchase orders, approvals, goods receipts and inventory',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
