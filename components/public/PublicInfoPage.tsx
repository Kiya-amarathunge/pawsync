import type { ReactNode } from 'react';
import Link from 'next/link';
import PublicHeader from './PublicHeader';

export default function PublicInfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="public-info-shell">
    <PublicHeader />
    <article className="public-info-content"><p className="public-kicker">PawSync information</p><h1>{title}</h1><p className="public-info-intro">{intro}</p>{children}<div className="public-info-links"><Link href="/">Home</Link><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></article>
  </main>;
}
