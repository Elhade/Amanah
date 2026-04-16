import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'JamaaAmanah — Gestion des dons',
  description: 'La confiance au cœur de vos dons',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script src="https://js.stripe.com/v3/" async />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
