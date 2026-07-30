import { Mail, MessageCircle, ShieldAlert } from 'lucide-react';
import PublicInfoPage from '@/components/public/PublicInfoPage';

export default function SupportPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@pawsync.lk';
  return <PublicInfoPage title="Contact support" intro="Get help with account access, provider approval, appointments, records or safety concerns.">
    <section className="public-info-section"><Mail size={21} /><div><h2>Email support</h2><p>Send the email address used for your PawSync account and a short description of the issue.</p><a href={`mailto:${email}`}>{email}</a></div></section>
    <section className="public-info-section"><MessageCircle size={21} /><div><h2>Appointment concerns</h2><p>For an existing appointment, include its date, provider and service. Do not email passwords or financial credentials.</p></div></section>
    <section className="public-info-section"><ShieldAlert size={21} /><div><h2>Pet emergencies</h2><p>PawSync support is not an emergency service. Call a nearby veterinary clinic immediately from the Emergency section.</p></div></section>
  </PublicInfoPage>;
}
