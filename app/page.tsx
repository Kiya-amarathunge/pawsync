import Link from 'next/link';
import { CalendarCheck, ClipboardList, MessageSquare, PawPrint, ShieldCheck } from 'lucide-react';
import PublicHeader from '@/components/public/PublicHeader';

export default function HomePage() {
  return <main className="public-site">
    <section className="public-hero">
      <PublicHeader />
      <div className="public-hero-copy">
        <p className="public-kicker">Pet care, coordinated</p>
        <h1>PawSync</h1>
        <p>Keep pet health information, verified providers, appointments and conversations together in one dependable workspace.</p>
        <div className="public-hero-actions">
          <Link className="btn btn-primary btn-lg" href="/register">Create an account</Link>
          <Link className="btn btn-outline btn-lg" href="/login">Sign in</Link>
        </div>
      </div>
    </section>

    <section className="public-feature-band" aria-label="PawSync services">
      <div className="public-section-heading"><p className="public-kicker">One care record</p><h2>Everything needed to coordinate everyday pet care</h2></div>
      <div className="public-feature-grid">
        <article><ClipboardList size={22} /><h3>Pet health</h3><p>Track health records, weight, vaccinations, medications and documents.</p></article>
        <article><ShieldCheck size={22} /><h3>Verified providers</h3><p>Discover veterinarians and pet-care businesses reviewed by PawSync administrators.</p></article>
        <article><CalendarCheck size={22} /><h3>Appointments</h3><p>Book available services and follow confirmations, reschedules and completion.</p></article>
        <article><MessageSquare size={22} /><h3>Connected care</h3><p>Keep provider conversations, notifications, reviews and disputes in context.</p></article>
      </div>
    </section>

    <section className="public-verification-band">
      <div><p className="public-kicker">Professional trust</p><h2>Providers are reviewed before they appear</h2></div>
      <p>Veterinarians and service providers submit registration information and credential evidence. An administrator reviews the application before the account can offer services through PawSync.</p>
    </section>

    <footer className="public-footer"><span><PawPrint size={17} /> PawSync</span><nav><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></footer>
  </main>;
}
