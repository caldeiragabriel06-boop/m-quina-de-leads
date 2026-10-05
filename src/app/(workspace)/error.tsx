'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty" role="alert">
      <h2>Não foi possível carregar esta página</h2>
      <p>Verifique a conexão e tente novamente.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
