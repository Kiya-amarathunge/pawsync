import PublicInfoPage from '@/components/public/PublicInfoPage';

export default function PrivacyPage() {
  return <PublicInfoPage title="Privacy notice" intro="This notice explains the information PawSync uses to coordinate pet care.">
    <section className="public-policy"><h2>Information we collect</h2><p>Account contact details, pet profiles, health records, provider credentials, appointments, messages, reviews, reports and notification preferences.</p><h2>How information is used</h2><p>To authenticate users, provide role-based features, coordinate appointments, review professional applications, deliver notifications and investigate disputes or reported content.</p><h2>Health and uploaded information</h2><p>Health-record content is encrypted and protected by access controls. Uploaded documents should contain only information necessary for the relevant care or verification purpose.</p><h2>Your choices</h2><p>You can update profile information and notification preferences in PawSync. Contact support for account, correction or data-access requests.</p><h2>Project scope</h2><p>PawSync is an undergraduate software project. Production deployment requires an approved hosting, retention and privacy process.</p></section>
  </PublicInfoPage>;
}
