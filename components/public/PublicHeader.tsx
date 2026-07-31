import Link from 'next/link';
import { PawPrint } from 'lucide-react';

export default function PublicHeader() {
  return <header className="public-header">
    <Link className="public-brand" href="/"><span><PawPrint size={19} /></span>PawSync</Link>
    <nav aria-label="Public navigation"><Link href="/support">Support</Link><Link href="/login">Sign in</Link><Link className="btn btn-primary" href="/register">Get started</Link></nav>
  </header>;
}
