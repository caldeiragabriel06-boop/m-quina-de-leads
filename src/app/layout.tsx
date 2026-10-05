import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Máquina de Leads | Prospecção com contexto',
  description: 'Seu workspace privado de descoberta, qualificação e gestão de leads.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
