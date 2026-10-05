import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Página não encontrada</h1>
      <p>Este registro não existe ou não está disponível para seu usuário.</p>
      <Link href="/">Voltar ao dashboard →</Link>
    </div>
  );
}
